import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const authUser = getAuthUser();
  if (!authUser) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  // Get active verification status for guest if role is guest
  if (authUser.role === "guest") {
    const guest = await prisma.guests.findUnique({
      where: { id: authUser.id },
      select: { email_verified_at: true },
    });
    return NextResponse.json({
      user: {
        ...authUser,
        emailVerified: guest?.email_verified_at !== null,
      },
    });
  }

  return NextResponse.json({ user: authUser }, { status: 200 });
}
