import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { signResetToken } from "@/lib/auth";
import { sendResetPasswordEmail } from "@/lib/mailer";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Format email tidak valid"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = ForgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Input tidak valid", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // 1. Search in guests
    const guest = await prisma.guests.findUnique({
      where: { email },
    });

    if (guest) {
      const token = signResetToken({
        id: guest.id,
        email: guest.email,
        role: "guest",
        passwordHash: guest.password,
      });

      const mailResult = await sendResetPasswordEmail(email, token);

      return NextResponse.json(
        {
          message: "Tautan pengaturan ulang password telah dikirim ke email Anda.",
          mockResetUrl: mailResult.mock ? mailResult.url : undefined,
        },
        { status: 200 }
      );
    }

    // 2. Search in users (staff/admin/management)
    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (user) {
      const token = signResetToken({
        id: user.id,
        email: user.email,
        role: user.role,
        passwordHash: user.password,
      });

      const mailResult = await sendResetPasswordEmail(email, token);

      return NextResponse.json(
        {
          message: "Tautan pengaturan ulang password telah dikirim ke email Anda.",
          mockResetUrl: mailResult.mock ? mailResult.url : undefined,
        },
        { status: 200 }
      );
    }

    // Standard security practice: return generic success message to prevent user enumeration
    return NextResponse.json(
      {
        message: "Jika email terdaftar di sistem kami, tautan pengaturan ulang password telah dikirim.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in forgot-password API:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
