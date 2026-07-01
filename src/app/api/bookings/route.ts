import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { createTransaction, syncTransactionStatus } from "@/lib/midtrans";

const BookingSchema = z.object({
  roomId: z.number(),
  checkIn: z.string(),
  checkOut: z.string(),
  note: z.string().optional(),
});

export async function POST(request: Request) {
  const authUser = getAuthUser();
  if (!authUser || authUser.role !== "guest") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = BookingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Input tidak valid", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { roomId, checkIn: checkInStr, checkOut: checkOutStr, note } = result.data;

    const checkInDate = new Date(checkInStr);
    const checkOutDate = new Date(checkOutStr);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json({ message: "Format tanggal tidak valid" }, { status: 400 });
    }

    if (checkInDate >= checkOutDate) {
      return NextResponse.json({ message: "Check-in harus sebelum Check-out" }, { status: 400 });
    }

    // 1. Fetch guest data to check verification status and details
    const guest = await prisma.guests.findUnique({
      where: { id: authUser.id },
    });

    if (!guest) {
      return NextResponse.json({ message: "Tamu tidak ditemukan" }, { status: 404 });
    }

    // US-A1 AC4: email_verified_at must not be null
    if (!guest.email_verified_at) {
      return NextResponse.json(
        { message: "Email belum terverifikasi" },
        { status: 403 }
      );
    }

    // 2. Perform transaction booking with row locking
    const bookingResult = await prisma.$transaction(
      async (tx) => {
        // Lock room row in database to prevent concurrent edits/reservations
        await tx.$executeRawUnsafe(
          `SELECT * FROM rooms WHERE id = ${roomId} FOR UPDATE`
        );

        // Fetch room and room type details
        const room = await tx.rooms.findUnique({
          where: { id: roomId },
          include: { room_types: true },
        });

        if (!room) {
          throw new Error("ROOM_NOT_FOUND");
        }

        if (room.status === "maintenance") {
          throw new Error("ROOM_MAINTENANCE");
        }

        // Check if there are overlapping bookings
        const overlaps = await tx.bookings.findMany({
          where: {
            room_id: roomId,
            status: {
              in: ["confirmed", "checked_in"],
            },
            AND: [
              {
                check_in: {
                  lt: checkOutDate,
                },
              },
              {
                check_out: {
                  gt: checkInDate,
                },
              },
            ],
          },
        });

        if (overlaps.length > 0) {
          throw new Error("ROOM_ALREADY_BOOKED");
        }

        // Calculate total days and price
        const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        const totalPrice = Number(room.room_types.price) * diffDays;

        // Create booking record
        const booking = await tx.bookings.create({
          data: {
            guest_id: guest.id,
            room_id: roomId,
            check_in: checkInDate,
            check_out: checkOutDate,
            total_price: totalPrice,
            status: "pending",
            updated_at: new Date(),
          },
        });

        // Trigger Midtrans payment token creation
        const orderId = `BOOKING-${booking.id}-${Date.now()}`;
        const midtransRes = await createTransaction({
          orderId,
          grossAmount: totalPrice,
          customerDetails: {
            first_name: guest.name,
            email: guest.email,
            phone: guest.phone,
          },
        });

        // Create payment record
        const payment = await tx.payments.create({
          data: {
            booking_id: booking.id,
            amount: totalPrice,
            payment_method: midtransRes.mock ? "mock_checkout" : null,
            payment_status: "pending",
            note: midtransRes.redirect_url ? `${orderId}|${midtransRes.redirect_url}` : orderId,
            updated_at: new Date(),
          },
        });

        return {
          booking,
          payment,
          midtrans: midtransRes,
        };
      },
      {
        timeout: 10000, // 10 seconds transaction timeout
      }
    );

    return NextResponse.json(
      {
        message: "Booking berhasil dibuat. Menunggu pembayaran.",
        booking: bookingResult.booking,
        payment: bookingResult.payment,
        snapToken: bookingResult.midtrans.token,
        redirectUrl: bookingResult.midtrans.redirect_url,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Booking error:", error);

    if (error.message === "ROOM_NOT_FOUND") {
      return NextResponse.json({ message: "Kamar tidak ditemukan" }, { status: 404 });
    }
    if (error.message === "ROOM_MAINTENANCE") {
      return NextResponse.json({ message: "Kamar sedang dalam pemeliharaan (maintenance)" }, { status: 400 });
    }
    if (error.message === "ROOM_ALREADY_BOOKED") {
      return NextResponse.json({ message: "Kamar sudah dipesan oleh orang lain untuk tanggal tersebut" }, { status: 409 });
    }

    return NextResponse.json(
      { message: "Gagal membuat booking. Terjadi kesalahan internal." },
      { status: 500 }
    );
  }
}

// GET all bookings of logged-in guest (PWA supports offline list)
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

        if (prefix === "BOOKING" && !isNaN(targetId)) {
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

                const bookingStatus = paymentStatus === "paid" ? "confirmed" : "cancelled";
                await tx.bookings.update({
                  where: { id: targetId },
                  data: {
                    status: bookingStatus,
                    updated_at: new Date(),
                  },
                });
              }
            });
          }
        }
      } catch (querySyncErr) {
        console.error("Failed to sync payment from query params:", querySyncErr);
      }
    }

    // 2. Sync pending payments for the guest via API check
    if (authUser.role === "guest") {
      try {
        const pendingPayments = await prisma.payments.findMany({
          where: {
            payment_status: "pending",
            bookings: {
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
        console.error("Failed to auto-sync pending payments:", syncErr);
      }
    }

    let bookings;

    if (authUser.role === "guest") {
      // Return bookings of guest
      bookings = await prisma.bookings.findMany({
        where: { guest_id: authUser.id },
        include: {
          rooms: {
            include: {
              room_types: true,
            },
          },
          payments: true,
        },
        orderBy: { created_at: "desc" },
      });
    } else {
      // Staff / Management: Return all bookings
      bookings = await prisma.bookings.findMany({
        include: {
          guests: {
            select: { id: true, name: true, email: true, phone: true },
          },
          rooms: {
            include: {
              room_types: true,
            },
          },
          payments: true,
        },
        orderBy: { created_at: "desc" },
      });
    }

    return NextResponse.json({ bookings }, { status: 200 });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
