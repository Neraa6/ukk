import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const authUser = getAuthUser();
  if (!authUser || authUser.role !== "management") {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    // Fetch all payments
    const payments = await prisma.payments.findMany({
      include: {
        bookings: {
          include: {
            guests: true,
            rooms: {
              include: {
                room_types: true,
              },
            },
          },
        },
        restaurant_orders: {
          include: {
            guests: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ success: true, payments });
  } catch (error) {
    console.error("Error in dashboard export API:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
