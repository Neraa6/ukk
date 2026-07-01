import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { createTransaction, syncTransactionStatus } from "@/lib/midtrans";

const OrderItemSchema = z.object({
  menuId: z.number(),
  quantity: z.number().min(1, "Kuantitas minimal 1"),
});

const OrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1, "Pesanan minimal berisi 1 item"),
});

export async function POST(request: Request) {
  const authUser = getAuthUser();
  if (!authUser || authUser.role !== "guest") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = OrderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Input tidak valid", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { items } = result.data;

    // 1. Verify guest has active check-in (US-C1 AC1)
    const activeBooking = await prisma.bookings.findFirst({
      where: {
        guest_id: authUser.id,
        status: "checked_in",
      },
    });

    if (!activeBooking) {
      return NextResponse.json(
        { message: "Pemesanan restoran hanya diperbolehkan jika Anda berstatus check-in aktif" },
        { status: 403 }
      );
    }

    // 2. Load menus to fetch active price securely in backend (US-C1 AC3)
    const menuIds = items.map((i) => i.menuId);
    const menus = await prisma.restaurant_menus.findMany({
      where: { id: { in: menuIds } },
    });

    if (menus.length !== menuIds.length) {
      return NextResponse.json({ message: "Satu atau lebih menu tidak ditemukan" }, { status: 404 });
    }

    // Map menu prices for easy lookup
    const menuMap = new Map(menus.map((m) => [m.id, m]));

    // Calculate total price and prepare order details with price snapshot (US-C1 AC2 & AC3)
    let totalPrice = 0;
    const detailsData = items.map((item) => {
      const menu = menuMap.get(item.menuId)!;
      const price = Number(menu.price);
      const subtotal = price * item.quantity;
      totalPrice += subtotal;

      return {
        restaurant_menu_id: item.menuId,
        quantity: item.quantity,
        price: price, // snapshot price
      };
    });

    // 3. Perform database transaction to insert order & details
    const orderResult = await prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.restaurant_orders.create({
        data: {
          guest_id: authUser.id,
          total_price: totalPrice,
          status: "ordered",
          updated_at: new Date(),
        },
      });

      // Create order details with snapshot prices
      const details = await Promise.all(
        detailsData.map((d) =>
          tx.restaurant_order_details.create({
            data: {
              restaurant_order_id: order.id,
              restaurant_menu_id: d.restaurant_menu_id,
              quantity: d.quantity,
              price: d.price,
            },
          })
        )
      );

      // Trigger Midtrans Snap payment
      const orderId = `RESTO-${order.id}-${Date.now()}`;
      const guest = await tx.guests.findUnique({ where: { id: authUser.id } });

      const midtransRes = await createTransaction({
        orderId,
        grossAmount: totalPrice,
        customerDetails: {
          first_name: guest!.name,
          email: guest!.email,
          phone: guest!.phone,
        },
      });

      // Create payment record
      const payment = await tx.payments.create({
        data: {
          restaurant_order_id: order.id,
          amount: totalPrice,
          payment_method: midtransRes.mock ? "mock_checkout" : null,
          payment_status: "pending",
          note: midtransRes.redirect_url ? `${orderId}|${midtransRes.redirect_url}` : orderId,
          updated_at: new Date(),
        },
      });

      return {
        order,
        details,
        payment,
        midtrans: midtransRes,
      };
    });

    return NextResponse.json(
      {
        message: "Pesanan makanan berhasil dibuat. Silakan lakukan pembayaran.",
        order: orderResult.order,
        payment: orderResult.payment,
        snapToken: orderResult.midtrans.token,
        redirectUrl: orderResult.midtrans.redirect_url,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating restaurant order:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const authUser = getAuthUser();
  if (!authUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const queryOrderId = searchParams.get("order_id");
    const queryTxStatus = searchParams.get("transaction_status");
    const queryStatusCode = searchParams.get("status_code");
    const queryPaymentType = searchParams.get("payment_type");

    // 1. Direct Sync from callback query parameters (highly reliable for localhost testing)
    if (queryOrderId && (queryTxStatus || queryStatusCode)) {
      try {
        const parts = queryOrderId.split("-");
        const prefix = parts[0];
        const targetId = parseInt(parts[1]);

        if (prefix === "RESTO" && !isNaN(targetId)) {
          let paymentStatus: "paid" | "failed" | "pending" = "pending";
          if (
            queryTxStatus === "settlement" ||
            queryTxStatus === "capture" ||
            queryStatusCode === "200"
          ) {
            paymentStatus = "paid";
          } else if (
            ["expire", "cancel", "deny"].includes(queryTxStatus || "")
          ) {
            paymentStatus = "failed";
          }

          if (paymentStatus !== "pending") {
            await prisma.$transaction(async (tx) => {
              const payment = await tx.payments.findFirst({
                where: {
                  OR: [
                    { note: queryOrderId },
                    { note: { startsWith: `${queryOrderId}|` } }
                  ]
                },
              });

              if (payment) {
                await tx.payments.update({
                  where: { id: payment.id },
                  data: {
                    payment_status: paymentStatus,
                    payment_method: queryPaymentType || "credit_card",
                    updated_at: new Date(),
                  },
                });

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
          }
        }
      } catch (querySyncErr) {
        console.error("Failed to sync restaurant payment from query params:", querySyncErr);
      }
    }

    // 2. Sync pending payments for restaurant orders if guest via API check
    if (authUser.role === "guest") {
      try {
        const pendingPayments = await prisma.payments.findMany({
          where: {
            payment_status: "pending",
            restaurant_orders: {
              guest_id: authUser.id,
            },
          },
        });

        for (const p of pendingPayments) {
          if (p.note) {
            const orderId = p.note.split("|")[0];
            await syncTransactionStatus(orderId);
          }
        }
      } catch (syncErr) {
        console.error("Failed to auto-sync pending restaurant payments:", syncErr);
      }
    }

    let orders;

    if (authUser.role === "guest") {
      // Get guest orders
      orders = await prisma.restaurant_orders.findMany({
        where: { guest_id: authUser.id },
        include: {
          restaurant_order_details: {
            include: {
              restaurant_menus: true,
            },
          },
          payments: true,
        },
        orderBy: { created_at: "desc" },
      });
    } else {
      // Staff / Admin: Get all orders
      orders = await prisma.restaurant_orders.findMany({
        include: {
          guests: {
            select: { id: true, name: true, email: true },
          },
          restaurant_order_details: {
            include: {
              restaurant_menus: true,
            },
          },
          payments: true,
        },
        orderBy: { created_at: "desc" },
      });
    }

    return NextResponse.json({ orders }, { status: 200 });
  } catch (error) {
    console.error("Error fetching restaurant orders:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
