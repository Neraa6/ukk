import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/midtrans";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[WEBHOOK RECEIVER] Received Midtrans Notification:", JSON.stringify(body));

    // 1. Verify webhook signature
    const isValidSignature = verifyWebhookSignature(body);
    if (!isValidSignature) {
      console.warn("[WEBHOOK ERROR] Invalid signature key for payload:", body.order_id);
      return NextResponse.json({ message: "Invalid signature key" }, { status: 401 });
    }

    const { order_id, transaction_status } = body;

    // Parse order_id format: e.g., "BOOKING-12-178127928" or "RESTO-5-178127928"
    const parts = order_id.split("-");
    const prefix = parts[0];
    const targetId = parseInt(parts[1]);

    if (!prefix || isNaN(targetId)) {
      console.warn("[WEBHOOK ERROR] Invalid order_id format:", order_id);
      return NextResponse.json({ message: "Invalid order_id format" }, { status: 400 });
    }

    // Determine status
    let paymentStatus: "paid" | "failed" | "pending" = "pending";
    if (transaction_status === "settlement" || transaction_status === "capture") {
      paymentStatus = "paid";
    } else if (["expire", "cancel", "deny"].includes(transaction_status)) {
      paymentStatus = "failed";
    }

    console.log(`[WEBHOOK PROGRESS] Updating order ${order_id} (Type: ${prefix}, ID: ${targetId}) to PaymentStatus: ${paymentStatus}`);

    // Perform database updates inside transaction
    await prisma.$transaction(async (tx) => {
      // 2. Update Payments table
      // In the payments table, we search by `note` column which stores the full order_id (e.g. BOOKING-12-12345)
      const payment = await tx.payments.findFirst({
        where: {
          note: order_id,
        },
      });

      if (!payment) {
        throw new Error(`PAYMENT_RECORD_NOT_FOUND`);
      }

      await tx.payments.update({
        where: { id: payment.id },
        data: {
          payment_status: paymentStatus,
          payment_method: body.payment_type || "credit_card",
          updated_at: new Date(),
        },
      });

      // 3. Update parent table (bookings or restaurant_orders)
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

    return NextResponse.json({ message: "Status updated successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    if (error.message === "PAYMENT_RECORD_NOT_FOUND") {
      return NextResponse.json({ message: "Payment record not found in database" }, { status: 404 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
