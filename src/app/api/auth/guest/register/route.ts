import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/mailer";

const RegisterSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  phone: z.string().min(8, "Nomor telepon minimal 8 karakter"),
  identity_number: z.string().min(10, "Nomor identitas minimal 10 karakter"),
  recaptchaToken: z.string().optional(),
});

async function verifyRecaptcha(token?: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey || secretKey === "SET_YOUR_RECAPTCHA_SECRET_KEY" || !token || token === "mock-token") {
    // If not configured or mock token used, allow
    console.log("[MOCK RECAPTCHA] Bypassing verification - score set to 0.9");
    return true;
  }

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });
    const data = await res.json();
    return data.success && data.score >= 0.5;
  } catch (error) {
    console.error("reCAPTCHA validation failed, falling back to false:", error);
    return false;
  }
}

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

    const { name, email, password, phone, identity_number, recaptchaToken } = result.data;

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
        identity_number,
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
