import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { hashPassword, signToken, verifyRecaptcha } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/mailer";

const RegisterSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  phone: z.string().min(10, "Nomor telepon minimal 10 digit"),
  identityNumber: z.string().min(10, "Nomor identitas minimal 10 karakter"),
  recaptchaToken: z.string().optional(),
});


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = RegisterSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Input tidak valid", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, phone, identityNumber, recaptchaToken } = result.data;

    // 1. Verify reCAPTCHA
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      return NextResponse.json(
        { message: "Verifikasi anti-bot gagal. Silakan coba lagi." },
        { status: 403 }
      );
    }

    // 2. Check if email already registered
    const existingGuest = await prisma.guests.findUnique({
      where: { email },
    });

    if (existingGuest) {
      return NextResponse.json(
        { message: "Email sudah terdaftar" },
        { status: 409 }
      );
    }

    // 3. Hash password
    const hashedPassword = await hashPassword(password);

    // 4. Save guest (email_verified_at defaults to NULL)
    const newGuest = await prisma.guests.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        identity_number: identityNumber,
        updated_at: new Date(),
      },
    });

    // 5. Generate email verification JWT (expires in 24 hours)
    const verificationToken = signToken({
      id: newGuest.id,
      email: newGuest.email,
      role: "guest",
      name: newGuest.name,
    });

    // 6. Send verification email
    const mailResult = await sendVerificationEmail(email, verificationToken);

    return NextResponse.json(
      {
        message: "Registrasi berhasil. Silakan periksa email Anda untuk verifikasi.",
        guestId: newGuest.id,
        mockVerificationUrl: mailResult.mock ? mailResult.url : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in guest registration:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
