import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const RoomUpdateSchema = z.object({
  room_number: z.string().min(1, "Nomor kamar wajib diisi"),
  room_type_id: z.number(),
  status: z.enum(["available", "occupied", "maintenance"]),
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authUser = getAuthUser();
  if (!authUser || (authUser.role !== "admin" && authUser.role !== "management")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  const roomId = parseInt(params.id);
  if (isNaN(roomId)) {
    return NextResponse.json({ message: "ID Kamar tidak valid" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const result = RoomUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Input tidak valid", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { room_number, room_type_id, status } = result.data;

    // Check duplicate room_number for other room IDs
    const duplicate = await prisma.rooms.findFirst({
      where: {
        room_number,
        id: { not: roomId },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { message: `Nomor kamar ${room_number} sudah terdaftar` },
        { status: 409 }
      );
    }

    const updatedRoom = await prisma.rooms.update({
      where: { id: roomId },
      data: {
        room_number,
        room_type_id,
        status,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ message: "Kamar berhasil diperbarui", room: updatedRoom });
  } catch (error) {
    console.error("Error updating room:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authUser = getAuthUser();
  if (!authUser || (authUser.role !== "admin" && authUser.role !== "management")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  const roomId = parseInt(params.id);
  if (isNaN(roomId)) {
    return NextResponse.json({ message: "ID Kamar tidak valid" }, { status: 400 });
  }

  try {
    await prisma.rooms.delete({
      where: { id: roomId },
    });

    return NextResponse.json({ message: "Kamar berhasil dihapus" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting room:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server. Pastikan kamar tidak memiliki riwayat booking." },
      { status: 500 }
    );
  }
}
