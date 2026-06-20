import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const RoomTypeSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter"),
  description: z.string().min(5, "Deskripsi minimal 5 karakter"),
  price: z.number().positive("Harga harus lebih besar dari 0"),
  foto_url: z.string().url("Format URL foto tidak valid").nullable().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authUser = getAuthUser();
  if (!authUser || authUser.role !== "management") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  const typeId = parseInt(params.id);
  if (isNaN(typeId)) {
    return NextResponse.json({ message: "ID Tipe kamar tidak valid" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const result = RoomTypeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Input tidak valid", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description, price, foto_url } = result.data;

    // Check duplicate name for other room type IDs
    const duplicate = await prisma.room_types.findFirst({
      where: {
        name,
        id: { not: typeId },
      },
    });

    if (duplicate) {
      return NextResponse.json({ message: "Tipe kamar sudah terdaftar" }, { status: 409 });
    }

    const updated = await prisma.room_types.update({
      where: { id: typeId },
      data: {
        name,
        description,
        price,
        foto_url: foto_url || null,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ message: "Tipe kamar berhasil diperbarui", roomType: updated });
  } catch (error) {
    console.error("Error updating room type:", error);
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
  if (!authUser || authUser.role !== "management") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  const typeId = parseInt(params.id);
  if (isNaN(typeId)) {
    return NextResponse.json({ message: "ID Tipe kamar tidak valid" }, { status: 400 });
  }

  try {
    await prisma.room_types.delete({
      where: { id: typeId },
    });

    return NextResponse.json({ message: "Tipe kamar berhasil dihapus" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting room type:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server. Pastikan tipe kamar tidak digunakan oleh kamar aktif." },
      { status: 500 }
    );
  }
}
