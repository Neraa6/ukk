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

export async function GET() {
  try {
    const roomTypes = await prisma.room_types.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ roomTypes }, { status: 200 });
  } catch (error) {
    console.error("Error fetching room types:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authUser = getAuthUser();
  if (!authUser || authUser.role !== "management") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
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

    // Check duplicate name
    const existing = await prisma.room_types.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json({ message: "Tipe kamar sudah terdaftar" }, { status: 409 });
    }

    const newRoomType = await prisma.room_types.create({
      data: {
        name,
        description,
        price,
        foto_url: foto_url || null,
        updated_at: new Date(),
      },
    });

    return NextResponse.json(
      { message: "Tipe kamar berhasil ditambahkan", roomType: newRoomType },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding room type:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
