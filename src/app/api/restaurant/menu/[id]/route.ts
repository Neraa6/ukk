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

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authUser = getAuthUser();
  if (!authUser || authUser.role !== "management") {
    return NextResponse.json({ message: "Unauthorized. Hanya management yang diizinkan." }, { status: 403 });
  }

  const menuId = parseInt(params.id);
  if (isNaN(menuId)) {
    return NextResponse.json({ message: "ID Menu tidak valid" }, { status: 400 });
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

    // Check check duplicate menu name for another menu ID
    const duplicate = await prisma.restaurant_menus.findFirst({
      where: {
        name,
        id: { not: menuId },
      },
    });

    if (duplicate) {
      return NextResponse.json({ message: "Nama menu sudah terdaftar" }, { status: 409 });
    }

    const updatedMenu = await prisma.restaurant_menus.update({
      where: { id: menuId },
      data: {
        name,
        description,
        price,
        foto_url: foto_url || null,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ message: "Menu berhasil diperbarui", menu: updatedMenu });
  } catch (error) {
    console.error("Error updating menu:", error);
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
    return NextResponse.json({ message: "Unauthorized. Hanya management yang diizinkan." }, { status: 403 });
  }

  const menuId = parseInt(params.id);
  if (isNaN(menuId)) {
    return NextResponse.json({ message: "ID Menu tidak valid" }, { status: 400 });
  }

  try {
    await prisma.restaurant_menus.delete({
      where: { id: menuId },
    });

    return NextResponse.json({ message: "Menu berhasil dihapus" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting menu:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server. Pastikan menu tidak terkait dengan transaksi aktif." },
      { status: 500 }
    );
  }
}
