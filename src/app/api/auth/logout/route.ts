import { NextResponse } from "next/server";
import { destroyOwnerSession } from "@/lib/auth";

export async function POST() {
  await destroyOwnerSession();
  return NextResponse.json({ ok: true });
}
