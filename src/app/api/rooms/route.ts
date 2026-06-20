import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const RoomSchema = z.object({
  room_number: z.string().min(1, "Nomor kamar wajib diisi"),
  room_type_id: z.number(),
  status: z.enum(["available", "occupied", "maintenance"]).default("available"),
});

export async function GET() {
  try {
    const rooms = await prisma.rooms.findMany({
      include: {
        room_types: true,
      },
      orderBy: { room_number: "asc" },
    });
    return NextResponse.json({ rooms }, { status: 200 });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authUser = getAuthUser();
  if (!authUser || (authUser.role !== "admin" && authUser.role !== "management")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = RoomSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Input tidak valid", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { room_number, room_type_id, status } = result.data;

    // Check duplicate room_number (US-E2 AC2)
    const existing = await prisma.rooms.findUnique({
      where: { room_number },
    });

    if (existing) {
      return NextResponse.json(
        { message: `Nomor kamar ${room_number} sudah terdaftar` },
        { status: 409 }
      );
    }

    // Check room type exists
    const roomType = await prisma.room_types.findUnique({
      where: { id: room_type_id },
    });

    if (!roomType) {
      return NextResponse.json({ message: "Tipe kamar tidak ditemukan" }, { status: 404 });
    }

    const newRoom = await prisma.rooms.create({
      data: {
        room_number,
        room_type_id,
        status,
        updated_at: new Date(),
      },
    });

    return NextResponse.json(
      { message: "Kamar berhasil ditambahkan", room: newRoom },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding room:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
