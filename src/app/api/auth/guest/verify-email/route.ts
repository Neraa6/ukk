import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { message: "Token verifikasi diperlukan" },
      { status: 400 }
    );
  }

  const payload = verifyToken(token);
  if (!payload || payload.role !== "guest") {
    // Show a user-friendly error page or direct response
    return new Response(
      `<html>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f4efe6; color: #0d1f15;">
          <div style="text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #c5a880; max-width: 400px;">
            <h2 style="color: red;">Verifikasi Gagal</h2>
            <p>Token verifikasi tidak valid atau telah kedaluwarsa (berlaku 24 jam).</p>
            <a href="/register" style="display: inline-block; margin-top: 20px; background-color: #1d3b2b; color: #f4efe6; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Kembali ke Registrasi</a>
          </div>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  try {
    // Update guest's email_verified_at
    await prisma.guests.update({
      where: { id: payload.id },
      data: {
        email_verified_at: new Date(),
      },
    });

    // Redirect to login page with verified parameter
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/login?verified=true`);
  } catch (error) {
    console.error("Error in verifying email:", error);
    return new Response(
      `<html>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f4efe6; color: #0d1f15;">
          <div style="text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #c5a880;">
            <h2 style="color: red;">Terjadi Kesalahan</h2>
            <p>Gagal memproses verifikasi email Anda.</p>
          </div>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }
}
