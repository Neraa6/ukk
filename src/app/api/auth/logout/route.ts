import { NextResponse } from "next/server";
import { deleteAuthCookie } from "@/lib/auth";

export async function POST() {
  deleteAuthCookie();
  return NextResponse.json({ message: "Logout berhasil" }, { status: 200 });
}
