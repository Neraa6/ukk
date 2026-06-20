import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { comparePassword, signToken, setAuthCookie } from "@/lib/auth";

const LoginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = LoginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Input tidak valid", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // 1. Find guest
    const guest = await prisma.guests.findUnique({
      where: { email },
    });

    if (!guest) {
      return NextResponse.json(
        { message: "Email atau password salah" },
        { status: 401 }
      );
    }

    // 2. Compare password
    const isPasswordMatch = await comparePassword(password, guest.password);
    if (!isPasswordMatch) {
      return NextResponse.json(
        { message: "Email atau password salah" },
        { status: 401 }
      );
    }

    // 3. Check if email is verified
    const isEmailVerified = guest.email_verified_at !== null;

    // 4. Sign token
    const token = signToken({
      id: guest.id,
      email: guest.email,
      role: "guest",
      name: guest.name,
    });

    // 5. Set Auth Cookie
    setAuthCookie(token);

    return NextResponse.json(
      {
        message: "Login berhasil",
        user: {
          id: guest.id,
          name: guest.name,
          email: guest.email,
          role: "guest",
          emailVerified: isEmailVerified,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in guest login:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
