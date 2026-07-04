import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const MenuSchema = z.object({
  name: z.string().min(3, "Nama menu minimal 3 karakter"),
  description: z.string().min(5, "Deskripsi minimal 5 karakter"),
  price: z.number().positive("Harga harus lebih besar dari 0"),
  foto_url: z.string().url("Format URL foto tidak valid").nullable().optional(),
});

export async function GET() {
  try {
    const menus = await prisma.restaurant_menus.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ menus }, { status: 200 });
  } catch (error) {
    console.error("Error fetching menus:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authUser = getAuthUser();
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized. Hanya admin yang diizinkan." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = MenuSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Input tidak valid", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description, price, foto_url } = result.data;

    // Check duplicate name
    const existing = await prisma.restaurant_menus.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json({ message: "Nama menu sudah terdaftar" }, { status: 409 });
    }

    const newMenu = await prisma.restaurant_menus.create({
      data: {
        name,
        description,
        price,
        foto_url: foto_url || null,
        updated_at: new Date(),
      },
    });

    return NextResponse.json(
      { message: "Menu berhasil ditambahkan", menu: newMenu },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding menu:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
