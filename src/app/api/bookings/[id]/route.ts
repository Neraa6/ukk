import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authUser = getAuthUser();
  if (!authUser || authUser.role === "guest") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const bookingId = parseInt(params.id);
  if (isNaN(bookingId)) {
    return NextResponse.json({ message: "ID Booking tidak valid" }, { status: 400 });
  }

  try {
    const { action } = await request.json(); // "check-in" | "check-out" | "cancel"

    if (!action || !["check-in", "check-out", "cancel"].includes(action)) {
      return NextResponse.json({ message: "Action tidak valid" }, { status: 400 });
    }

    const booking = await prisma.bookings.findUnique({
      where: { id: bookingId },
      include: { rooms: true },
    });

    if (!booking) {
      return NextResponse.json({ message: "Booking tidak ditemukan" }, { status: 404 });
    }

    // 1. Process CHECK-IN
    if (action === "check-in") {
      if (booking.status !== "confirmed") {
        return NextResponse.json(
          { message: "Check-in hanya dapat dilakukan untuk booking berstatus 'confirmed' (sudah lunas)" },
          { status: 400 }
        );
      }

      // Check dates (PRD US-B3 AC1: check-in date must be today or past)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkInDate = new Date(booking.check_in);
      checkInDate.setHours(0, 0, 0, 0);

      if (today < checkInDate) {
        return NextResponse.json(
          { message: `Tanggal check-in belum tiba (Dijadwalkan: ${booking.check_in.toLocaleDateString()})` },
          { status: 400 }
        );
      }

      // Perform transaction to set booking status -> checked_in and room status -> occupied
      await prisma.$transaction(async (tx) => {
        await tx.bookings.update({
          where: { id: bookingId },
          data: { status: "checked_in", updated_at: new Date() },
        });

        await tx.rooms.update({
          where: { id: booking.room_id },
          data: { status: "occupied", updated_at: new Date() },
        });
      });

      return NextResponse.json({ message: "Check-in berhasil diproses" }, { status: 200 });
    }

    // 2. Process CHECK-OUT
    if (action === "check-out") {
      if (booking.status !== "checked_in") {
        return NextResponse.json(
          { message: "Check-out hanya dapat dilakukan untuk booking berstatus 'checked_in'" },
          { status: 400 }
        );
      }

      // Perform transaction to set booking status -> checked_out and room status -> available
      await prisma.$transaction(async (tx) => {
        await tx.bookings.update({
          where: { id: bookingId },
          data: { status: "checked_out", updated_at: new Date() },
        });

        await tx.rooms.update({
          where: { id: booking.room_id },
          data: { status: "available", updated_at: new Date() },
        });
      });

      return NextResponse.json({ message: "Check-out berhasil diproses" }, { status: 200 });
    }

    // 3. Process CANCEL
    if (action === "cancel") {
      if (booking.status !== "pending" && booking.status !== "confirmed") {
        return NextResponse.json(
          { message: "Booking tidak dapat dibatalkan pada status saat ini" },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.bookings.update({
          where: { id: bookingId },
          data: { status: "cancelled", updated_at: new Date() },
        });

        // Set room status back to available if it was changed
        await tx.rooms.update({
          where: { id: booking.room_id },
          data: { status: "available", updated_at: new Date() },
        });

        // Mark payment as failed/cancelled if exists
        await tx.payments.updateMany({
          where: { booking_id: bookingId },
          data: { payment_status: "failed", updated_at: new Date() },
        });
      });

      return NextResponse.json({ message: "Booking berhasil dibatalkan" }, { status: 200 });
    }

    return NextResponse.json({ message: "Action tidak diproses" }, { status: 400 });
  } catch (error) {
    console.error("Error in update booking status:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
