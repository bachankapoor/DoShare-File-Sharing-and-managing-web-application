import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { recordEvent } from "@/lib/audit";
import { cookies } from "next/headers";

const MAX_ATTEMPTS = 5;
const attempts = new Map<string, number>(); // in-memory per-instance throttle; see note below

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await req.json().catch(() => null);
  const token = body?.token as string | undefined;
  const pin = body?.pin as string | undefined;
  if (!token || !pin) return NextResponse.json({ error: "Missing token or PIN" }, { status: 400 });

  const session = await prisma.accessSession.findUnique({ where: { code }, include: { policy: true } });
  if (!session || session.tokenHash !== hashToken(token)) {
    return NextResponse.json({ error: "Invalid access link" }, { status: 404 });
  }

  // Basic brute-force throttle. Note: an in-memory Map only protects a
  // single server instance — a real deployment should back this with
  // Redis or a DB counter so it holds under multiple instances/restarts.
  const key = `${session.id}`;
  const count = attempts.get(key) ?? 0;
  if (count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many attempts. This session has been locked." }, { status: 429 });
  }

  if (!session.pinHash || hashToken(pin) !== session.pinHash) {
    attempts.set(key, count + 1);
    await recordEvent({ sessionId: session.id, type: "PIN_FAILED", actorLabel: "Guest" });
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  }

  attempts.delete(key);
  const store = await cookies();
  store.set(`doshare_pin_${session.id}`, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60, // an hour is plenty for a single print/view errand
  });

  return NextResponse.json({ ok: true });
}
