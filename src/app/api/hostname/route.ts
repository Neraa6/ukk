import os from "os";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    hostname: os.hostname(),
  });
}
