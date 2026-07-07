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
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");

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

    // Setup date bounds for chart & top menus
    let chartStartDate = new Date();
    chartStartDate.setMonth(chartStartDate.getMonth() - 5);
    chartStartDate.setDate(1);
    chartStartDate.setHours(0, 0, 0, 0);

    let chartEndDate = new Date();
    chartEndDate.setHours(23, 59, 59, 999);

    const useCustomRange = !!(startDateStr && endDateStr);
    if (useCustomRange) {
      const parsedStart = new Date(startDateStr!);
      const parsedEnd = new Date(endDateStr!);
      if (!isNaN(parsedStart.getTime()) && !isNaN(parsedEnd.getTime())) {
        chartStartDate = parsedStart;
        chartStartDate.setHours(0, 0, 0, 0);
        chartEndDate = parsedEnd;
        chartEndDate.setHours(23, 59, 59, 999);
      }
    }

    // 3. Top 5 Best Selling Menu Items (US-E1 AC3)
    const topMenusWhere: any = {
      status: "paid",
    };
    if (useCustomRange) {
      topMenusWhere.created_at = {
        gte: chartStartDate,
        lte: chartEndDate,
      };
    } else {
      topMenusWhere.created_at = {
        gte: periodStartDate,
      };
    }

    const orderDetails = await prisma.restaurant_order_details.findMany({
      where: {
        restaurant_orders: topMenusWhere,
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

    // 4. Get revenue charts (adaptively grouped by Day or Month)
    const pastPayments = await prisma.payments.findMany({
      where: {
        payment_status: "paid",
        created_at: {
          gte: chartStartDate,
          lte: chartEndDate,
        },
      },
      select: {
        amount: true,
        booking_id: true,
        restaurant_order_id: true,
        created_at: true,
      },
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const diffTime = Math.abs(chartEndDate.getTime() - chartStartDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let chartData: Array<{ month: string; room: number; resto: number }> = [];

    if (diffDays <= 31) {
      // Group by Day (Daily)
      const dailyRevenueMap: { [key: string]: { month: string; room: number; resto: number } } = {};
      const tempDate = new Date(chartStartDate);
      
      while (tempDate <= chartEndDate) {
        const label = `${tempDate.getDate()} ${monthNames[tempDate.getMonth()]}`;
        dailyRevenueMap[label] = { month: label, room: 0, resto: 0 };
        tempDate.setDate(tempDate.getDate() + 1);
      }

      pastPayments.forEach((p) => {
        const d = new Date(p.created_at);
        const label = `${d.getDate()} ${monthNames[d.getMonth()]}`;
        if (dailyRevenueMap[label]) {
          if (p.booking_id !== null) {
            dailyRevenueMap[label].room += Number(p.amount);
          } else if (p.restaurant_order_id !== null) {
            dailyRevenueMap[label].resto += Number(p.amount);
          }
        }
      });
      
      chartData = Object.values(dailyRevenueMap);
    } else {
      // Group by Month (Monthly)
      const monthlyRevenueMap: { [key: string]: { month: string; room: number; resto: number } } = {};
      const tempDate = new Date(chartStartDate);
      tempDate.setDate(1); // Set to 1st to prevent month skip overflow
      
      const endYear = chartEndDate.getFullYear();
      const endMonth = chartEndDate.getMonth();
      
      while (
        tempDate.getFullYear() < endYear ||
        (tempDate.getFullYear() === endYear && tempDate.getMonth() <= endMonth)
      ) {
        const label = `${monthNames[tempDate.getMonth()]} ${tempDate.getFullYear().toString().substr(-2)}`;
        monthlyRevenueMap[label] = { month: label, room: 0, resto: 0 };
        tempDate.setMonth(tempDate.getMonth() + 1);
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
      
      chartData = Object.values(monthlyRevenueMap);
    }

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
