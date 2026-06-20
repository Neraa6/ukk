import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkInStr = searchParams.get("checkIn");
  const checkOutStr = searchParams.get("checkOut");

  if (!checkInStr || !checkOutStr) {
    return NextResponse.json(
      { message: "Tanggal check-in dan check-out wajib diisi" },
      { status: 400 }
    );
  }

  try {
    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return NextResponse.json(
        { message: "Format tanggal tidak valid" },
        { status: 400 }
      );
    }

    if (checkIn >= checkOut) {
      return NextResponse.json(
        { message: "Tanggal check-in harus sebelum tanggal check-out" },
        { status: 400 }
      );
    }

    // 1. Find overlapping bookings
    // Criteria: check_in < search.check_out AND check_out > search.check_in
    // and status is 'confirmed' or 'checked_in'
    const overlappingBookings = await prisma.bookings.findMany({
      where: {
        status: {
          in: ["confirmed", "checked_in"],
        },
        AND: [
          {
            check_in: {
              lt: checkOut,
            },
          },
          {
            check_out: {
              gt: checkIn,
            },
          },
        ],
      },
      select: {
        room_id: true,
      },
    });

    const unavailableRoomIds = overlappingBookings.map((b) => b.room_id);

    // 2. Fetch all rooms that are available and not maintenance
    const availableRooms = await prisma.rooms.findMany({
      where: {
        status: "available", // Exclude 'maintenance' or 'occupied'
        id: {
          notIn: unavailableRoomIds.length > 0 ? unavailableRoomIds : undefined,
        },
      },
      include: {
        room_types: true,
      },
    });

    // Group available rooms by room type for catalog display
    const roomTypesMap: { [key: number]: any } = {};

    availableRooms.forEach((room) => {
      const type = room.room_types;
      if (!roomTypesMap[type.id]) {
        roomTypesMap[type.id] = {
          id: type.id,
          name: type.name,
          description: type.description,
          price: type.price,
          foto_url: type.foto_url,
          availableRooms: [],
        };
      }
      roomTypesMap[type.id].availableRooms.push({
        id: room.id,
        room_number: room.room_number,
        status: room.status,
      });
    });

    const availableRoomTypes = Object.values(roomTypesMap);

    return NextResponse.json({
      checkIn: checkInStr,
      checkOut: checkOutStr,
      results: availableRoomTypes,
    });
  } catch (error) {
    console.error("Error in room search:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
