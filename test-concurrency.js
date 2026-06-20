const { PrismaClient } = require("@prisma/client");

// Load .env variables automatically from local project folder
require("dotenv").config();

const prisma = new PrismaClient();

async function simulateBooking(guestId, roomId, checkInStr, checkOutStr, label) {
  const checkInDate = new Date(checkInStr);
  const checkOutDate = new Date(checkOutStr);

  console.log(`[${label}] Memulai transaksi booking untuk kamar ID ${roomId}...`);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Acquire row lock on the room
        console.log(`[${label}] Meminta lock database (SELECT FOR UPDATE) untuk kamar ID ${roomId}...`);
        await tx.$executeRawUnsafe(`SELECT * FROM rooms WHERE id = ${roomId} FOR UPDATE`);
        console.log(`[${label}] Lock berhasil didapatkan! Memeriksa ketersediaan kamar...`);

        // Simulate a slight database processing delay to encourage overlap race condition
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // 2. Check overlap
        const overlaps = await tx.bookings.findMany({
          where: {
            room_id: roomId,
            status: {
              in: ["confirmed", "checked_in"],
            },
            AND: [
              { check_in: { lt: checkOutDate } },
              { check_out: { gt: checkInDate } },
            ],
          },
        });

        if (overlaps.length > 0) {
          throw new Error("ROOM_ALREADY_BOOKED");
        }

        // 3. Create booking
        const booking = await tx.bookings.create({
          data: {
            guest_id: guestId,
            room_id: roomId,
            check_in: checkInDate,
            check_out: checkOutDate,
            total_price: 900000.0, // mock price
            status: "confirmed", // auto-confirm for test
            updated_at: new Date(),
          },
        });

        console.log(`[${label}] Pemesanan KAMAR berhasil dibuat dengan ID Booking #${booking.id}`);
        return booking;
      },
      {
        timeout: 10000,
      }
    );
    return { label, success: true, bookingId: result.id };
  } catch (error) {
    console.log(`[${label}] Transaksi GAGAL: ${error.message}`);
    return { label, success: false, error: error.message };
  }
}

async function run() {
  console.log("=== MEMULAI PENGUJIAN CONCURRENCY DOUBLE BOOKING ===");

  const roomId = 1; // Kamar 101 (Standard Room)
  const checkIn = "2026-07-20T14:00:00.000Z";
  const checkOut = "2026-07-22T12:00:00.000Z";

  // Clean overlapping bookings from previous tests to ensure clean test state
  await prisma.bookings.deleteMany({
    where: {
      room_id: roomId,
      check_in: new Date(checkIn),
      check_out: new Date(checkOut),
    },
  });
  console.log("Data booking terdahulu dibersihkan untuk pengujian.");

  console.log("Menjalankan dua pesanan secara paralel...");

  const startTime = Date.now();

  // Trigger both bookings at the same time
  const results = await Promise.all([
    simulateBooking(1, roomId, checkIn, checkOut, "PESANAN A (Tamu 1)"),
    simulateBooking(2, roomId, checkIn, checkOut, "PESANAN B (Tamu 2)"),
  ]);

  const duration = (Date.now() - startTime) / 1000;
  console.log(`\n=== PENGUJIAN SELESAI DALAM ${duration} DETIK ===`);
  console.log("Hasil akhir:");
  results.forEach((r) => {
    console.log(`- ${r.label}: ${r.success ? "SUKSES (Booking ID #" + r.bookingId + ")" : "GAGAL (" + r.error + ")"}`);
  });

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  if (successCount === 1 && failureCount === 1) {
    console.log("\n[VERIFIKASI SUKSES] 🛡️ Sistem Row-Locking Berfungsi Sempurna!");
    console.log("Satu transaksi sukses dan satu digagalkan otomatis untuk mencegah double booking.");
  } else {
    console.log("\n[VERIFIKASI GAGAL] Sistem double booking pencegahan memiliki kesalahan.");
  }

  await prisma.$disconnect();
}

run();
