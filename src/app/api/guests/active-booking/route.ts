import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const authUser = getAuthUser();
  if (!authUser || authUser.role !== "guest") {
    return NextResponse.json({ eligible: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const activeBooking = await prisma.bookings.findFirst({
      where: {
        guest_id: authUser.id,
        status: "checked_in",
      },
      include: {
        rooms: true,
      },
    });

    if (!activeBooking) {
      return NextResponse.json({
        eligible: false,
        message: "Anda tidak memiliki check-in aktif. Pemesanan restoran hanya untuk tamu yang sedang menginap.",
      });
    }

    return NextResponse.json({
      eligible: true,
      booking: activeBooking,
    });
  } catch (error) {
    console.error("Error checking active booking:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
