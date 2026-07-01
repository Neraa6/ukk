// @ts-ignore
import midtransClient from "midtrans-client";
import crypto from "crypto";

const serverKey = process.env.MIDTRANS_SERVER_KEY;
const clientKey = process.env.MIDTRANS_CLIENT_KEY;

const isConfigured =
  serverKey &&
  clientKey &&
  serverKey !== "SET_YOUR_MIDTRANS_SERVER_KEY" &&
  clientKey !== "SET_YOUR_MIDTRANS_CLIENT_KEY" &&
  serverKey !== "";

// Initialize Snap if configured
let snap: any = null;
if (isConfigured) {
  snap = new midtransClient.Snap({
    isProduction: false, // Sandbox
    serverKey,
    clientKey,
  });
}

export interface MidtransParams {
  orderId: string; // BOOKING-{id} or RESTO-{id}
  grossAmount: number;
  customerDetails: {
    first_name: string;
    email: string;
    phone: string;
  };
}

export async function createTransaction(params: MidtransParams) {
  if (!isConfigured) {
    // Return mock snap token and a simulated URL
    console.log(`[MOCK MIDTRANS] Creating transaction for ${params.orderId}, amount: ${params.grossAmount}`);
    const mockToken = `MOCK-SNAP-TOKEN-${params.orderId}-${Date.now()}`;
    const mockUrl = `/payments/mock-checkout?token=${mockToken}&order_id=${params.orderId}&amount=${params.grossAmount}&email=${encodeURIComponent(params.customerDetails.email)}`;
    return {
      token: mockToken,
      redirect_url: mockUrl,
      mock: true,
    };
  }

  try {
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const isResto = params.orderId.startsWith("RESTO-");
    const finishUrl = isResto
      ? `${appUrl}/my-bookings?payment=resto-success`
      : `${appUrl}/my-bookings?payment=success`;

    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: params.orderId,
        gross_amount: Math.round(params.grossAmount),
      },
      customer_details: {
        first_name: params.customerDetails.first_name,
        email: params.customerDetails.email,
        phone: params.customerDetails.phone,
      },
      callbacks: {
        finish: finishUrl,
        unfinish: `${appUrl}/my-bookings`,
        error: `${appUrl}/my-bookings`,
      },
    });

    return {
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      mock: false,
    };
  } catch (error) {
    console.error("Midtrans createTransaction failed, falling back to mock:", error);
    const mockToken = `MOCK-SNAP-TOKEN-${params.orderId}-${Date.now()}`;
    const mockUrl = `/payments/mock-checkout?token=${mockToken}&order_id=${params.orderId}&amount=${params.grossAmount}&email=${encodeURIComponent(params.customerDetails.email)}`;
    return {
      token: mockToken,
      redirect_url: mockUrl,
      mock: true,
      error,
    };
  }
}

export function verifyWebhookSignature(body: any): boolean {
  if (!isConfigured) {
    // In mock mode, check if signature has "MOCK-SIGNATURE"
    return body.signature_key && body.signature_key.includes("MOCK-SIGNATURE");
  }

  try {
    const { order_id, status_code, gross_amount, signature_key } = body;
    const keySource = order_id + status_code + gross_amount + serverKey;
    const computedSignature = crypto
      .createHash("sha512")
      .update(keySource)
      .digest("hex");

    return computedSignature === signature_key;
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}

export async function syncTransactionStatus(orderId: string): Promise<string> {
  if (!isConfigured) {
    return "pending";
  }

  // Import prisma dynamically to prevent any possible early load circular dependency issues
  const prisma = (await import("@/lib/prisma")).default;

  try {
    const authString = Buffer.from(`${serverKey}:`).toString("base64");
    const res = await fetch(`https://api.sandbox.midtrans.com/v2/${orderId}/status`, {
      headers: {
        Authorization: `Basic ${authString}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.warn(`Midtrans status check for ${orderId} returned status ${res.status}`);
      return "pending";
    }

    const body = await res.json();
    const { transaction_status, payment_type } = body;

    // Parse order_id format: e.g., "BOOKING-12-178127928" or "RESTO-5-178127928"
    const parts = orderId.split("-");
    const prefix = parts[0];
    const targetId = parseInt(parts[1]);

    if (!prefix || isNaN(targetId)) {
      console.warn("[SYNC ERROR] Invalid order_id format:", orderId);
      return "pending";
    }

    // Determine status
    let paymentStatus: "paid" | "failed" | "pending" = "pending";
    if (transaction_status === "settlement" || transaction_status === "capture") {
      paymentStatus = "paid";
    } else if (["expire", "cancel", "deny"].includes(transaction_status)) {
      paymentStatus = "failed";
    }

    if (paymentStatus === "pending") {
      return "pending";
    }

    console.log(`[SYNC PROGRESS] Updating order ${orderId} (Type: ${prefix}, ID: ${targetId}) to PaymentStatus: ${paymentStatus}`);

    // Perform database updates inside transaction
    await prisma.$transaction(async (tx) => {
      // Find the payment record
      const payment = await tx.payments.findFirst({
        where: {
          OR: [
            { note: orderId },
            { note: { startsWith: `${orderId}|` } }
          ]
        },
      });

      if (!payment) {
        throw new Error(`PAYMENT_RECORD_NOT_FOUND`);
      }

      await tx.payments.update({
        where: { id: payment.id },
        data: {
          payment_status: paymentStatus,
          payment_method: payment_type || "credit_card",
          updated_at: new Date(),
        },
      });

      // Update parent table (bookings or restaurant_orders)
      if (prefix === "BOOKING") {
        const bookingStatus = paymentStatus === "paid" ? "confirmed" : "cancelled";
        await tx.bookings.update({
          where: { id: targetId },
          data: {
            status: bookingStatus,
            updated_at: new Date(),
          },
        });
      } else if (prefix === "RESTO") {
        const orderStatus = paymentStatus === "paid" ? "paid" : "failed";
        await tx.restaurant_orders.update({
          where: { id: targetId },
          data: {
            status: orderStatus,
            updated_at: new Date(),
          },
        });
      }
    });

    return paymentStatus;
  } catch (error: any) {
    console.error("Sync transaction status error:", error);
    return "pending";
  }
}
