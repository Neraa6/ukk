import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { hashPassword, verifyResetToken } from "@/lib/auth";

const ResetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = ResetPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Input tidak valid", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { token, password } = result.data;

    // 1. Verify token
    const payload = verifyResetToken(token);
    if (!payload) {
      return NextResponse.json(
        { message: "Tautan tidak valid atau telah kedaluwarsa." },
        { status: 400 }
      );
    }

    const { id, email, role, passwordHash } = payload;

    // 2. Process based on role
    if (role === "guest") {
      // Find guest
      const guest = await prisma.guests.findUnique({
        where: { id },
      });

      if (!guest) {
        return NextResponse.json(
          { message: "Pengguna tidak ditemukan." },
          { status: 404 }
        );
      }

      // Check if password hash in token matches current database password hash (single-use check)
      if (guest.password !== passwordHash) {
        return NextResponse.json(
          { message: "Tautan ini sudah pernah digunakan atau kedaluwarsa." },
          { status: 400 }
        );
      }

      // Hash new password
      const newHashedPassword = await hashPassword(password);

      // Update password
      await prisma.guests.update({
        where: { id },
        data: {
          password: newHashedPassword,
          updated_at: new Date(),
        },
      });

      return NextResponse.json(
        { message: "Password berhasil diatur ulang. Silakan masuk kembali." },
        { status: 200 }
      );
    } else {
      // Staff / Admin / Management
      const user = await prisma.users.findUnique({
        where: { id },
      });

      if (!user) {
        return NextResponse.json(
          { message: "Pengguna tidak ditemukan." },
          { status: 404 }
        );
      }

      // Check if password hash in token matches current database password hash
      if (user.password !== passwordHash) {
        return NextResponse.json(
          { message: "Tautan ini sudah pernah digunakan atau kedaluwarsa." },
          { status: 400 }
        );
      }

      // Hash new password
      const newHashedPassword = await hashPassword(password);

      // Update password
      await prisma.users.update({
        where: { id },
        data: {
          password: newHashedPassword,
          updated_at: new Date(),
        },
      });

      return NextResponse.json(
        { message: "Password berhasil diatur ulang. Silakan masuk kembali." },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error in reset-password API:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
