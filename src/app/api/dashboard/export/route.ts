import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const authUser = getAuthUser();
  if (!authUser || (authUser.role !== "admin" && authUser.role !== "management")) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    // Fetch all payments that are paid
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

    // Generate CSV
    const csvRows = [];

    // Header row
    csvRows.push(
      [
        "ID Transaksi",
        "Tanggal",
        "Jenis Layanan",
        "Nama Pelanggan",
        "Email",
        "Detail Layanan",
        "Metode Pembayaran",
        "Total Pembayaran (IDR)",
        "Status",
      ].join(",")
    );

    // Data rows
    for (const payment of payments) {
      const id = payment.id;
      const date = payment.created_at.toISOString().split("T")[0];
      const method = payment.payment_method || "Midtrans";
      const amount = Number(payment.amount).toFixed(2);
      const status = payment.payment_status;

      let serviceType = "";
      let customerName = "";
      let customerEmail = "";
      let details = "";

      if (payment.booking_id !== null && payment.bookings) {
        serviceType = "Reservasi Kamar";
        customerName = payment.bookings.guests.name;
        customerEmail = payment.bookings.guests.email;
        details = `Kamar ${payment.bookings.rooms.room_number} (${payment.bookings.rooms.room_types.name})`;
      } else if (payment.restaurant_order_id !== null && payment.restaurant_orders) {
        serviceType = "Restoran";
        customerName = payment.restaurant_orders.guests.name;
        customerEmail = payment.restaurant_orders.guests.email;
        details = `Pemesanan Restoran #${payment.restaurant_order_id}`;
      } else {
        serviceType = "Lainnya";
        customerName = "-";
        customerEmail = "-";
        details = payment.note || "-";
      }

      // Escape fields for CSV safety (wrapping in double quotes and escaping inner quotes)
      const sanitize = (text: string) => {
        const str = String(text || "");
        return `"${str.replace(/"/g, '""')}"`;
      };

      const row = [
        id,
        date,
        sanitize(serviceType),
        sanitize(customerName),
        sanitize(customerEmail),
        sanitize(details),
        sanitize(method),
        amount,
        sanitize(status),
      ];

      csvRows.push(row.join(","));
    }

    const csvContent = csvRows.join("\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="drgHotel-Laporan-Transaksi-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error generating CSV export:", error);
    return new Response("Terjadi kesalahan internal server dalam ekspor laporan", { status: 500 });
  }
}
