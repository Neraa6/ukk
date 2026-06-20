// @ts-ignore
import midtransClient from "midtrans-client";
import crypto from "crypto";

const serverKey = process.env.MIDTRANS_SERVER_KEY;
const clientKey = process.env.MIDTRANS_CLIENT_KEY;

const isConfigured =
  serverKey &&
  clientKey &&
  serverKey !== "SET_YOUR_MIDTRANS_SERVER_KEY" &&
  clientKey !== "SET_YOUR_MIDTRANS_CLIENT_KEY";

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
