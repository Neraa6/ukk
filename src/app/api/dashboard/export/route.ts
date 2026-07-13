import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  const authUser = getAuthUser();
  if (!authUser || authUser.role !== "management") {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");

  try {
    const whereClause: any = {};
    if (startDateStr && endDateStr) {
      const parsedStart = new Date(startDateStr);
      parsedStart.setHours(0, 0, 0, 0);
      const parsedEnd = new Date(endDateStr);
      parsedEnd.setHours(23, 59, 59, 999);
      if (!isNaN(parsedStart.getTime()) && !isNaN(parsedEnd.getTime())) {
        whereClause.created_at = {
          gte: parsedStart,
          lte: parsedEnd,
        };
      }
    }

    // Fetch all payments
    const payments = await prisma.payments.findMany({
      where: whereClause,
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
