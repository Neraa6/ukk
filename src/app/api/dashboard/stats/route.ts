import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  const authUser = getAuthUser();
  // Allow admin & management roles to access stats
  if (!authUser || (authUser.role !== "admin" && authUser.role !== "management")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const periodDaysStr = searchParams.get("days") || "30";
  const periodDays = parseInt(periodDaysStr) || 30;

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const periodStartDate = new Date();
    periodStartDate.setDate(periodStartDate.getDate() - periodDays);
    periodStartDate.setHours(0, 0, 0, 0);

    // 1. Calculate Occupancy Rate (US-E1 AC1)
    const totalRooms = await prisma.rooms.count();
    const occupiedRooms = await prisma.rooms.count({
      where: { status: "occupied" },
    });
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    // 2. Calculate Revenue Today (US-E1 AC2)
    const todayPayments = await prisma.payments.findMany({
      where: {
        payment_status: "paid",
        created_at: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    const roomRevenueToday = todayPayments
      .filter((p) => p.booking_id !== null)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const restoRevenueToday = todayPayments
      .filter((p) => p.restaurant_order_id !== null)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalRevenueToday = roomRevenueToday + restoRevenueToday;

    // 3. Top 5 Best Selling Menu Items (US-E1 AC3)
    const orderDetails = await prisma.restaurant_order_details.findMany({
      where: {
        restaurant_orders: {
          created_at: {
            gte: periodStartDate,
          },
          status: "paid", // Only count paid orders
        },
      },
      include: {
        restaurant_menus: true,
      },
    });

    const menuSalesMap: { [key: number]: { id: number; name: string; quantity: number; revenue: number } } = {};
    orderDetails.forEach((detail) => {
      const menu = detail.restaurant_menus;
      if (!menuSalesMap[menu.id]) {
        menuSalesMap[menu.id] = {
          id: menu.id,
          name: menu.name,
          quantity: 0,
          revenue: 0,
        };
      }
      menuSalesMap[menu.id].quantity += detail.quantity;
      menuSalesMap[menu.id].revenue += Number(detail.price) * detail.quantity;
    });

    const topMenus = Object.values(menuSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 4. Get monthly revenue charts for past 6 months (extra metrics for visually stunning dashboard)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const pastPayments = await prisma.payments.findMany({
      where: {
        payment_status: "paid",
        created_at: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        amount: true,
        booking_id: true,
        restaurant_order_id: true,
        created_at: true,
      },
    });

    // Group by month
    const monthlyRevenueMap: { [key: string]: { month: string; room: number; resto: number } } = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`;
      monthlyRevenueMap[label] = { month: label, room: 0, resto: 0 };
    }

    pastPayments.forEach((p) => {
      const d = new Date(p.created_at);
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`;
      if (monthlyRevenueMap[label]) {
        if (p.booking_id !== null) {
          monthlyRevenueMap[label].room += Number(p.amount);
        } else if (p.restaurant_order_id !== null) {
          monthlyRevenueMap[label].resto += Number(p.amount);
        }
      }
    });

    const chartData = Object.values(monthlyRevenueMap);

    return NextResponse.json({
      occupancy: {
        totalRooms,
        occupiedRooms,
        rate: occupancyRate,
      },
      revenueToday: {
        room: roomRevenueToday,
        restaurant: restoRevenueToday,
        total: totalRevenueToday,
      },
      topMenus,
      chartData,
    });
  } catch (error) {
    console.error("Error in dashboard stats:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
