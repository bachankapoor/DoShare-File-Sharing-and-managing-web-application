import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithScope } from "@/lib/sessions";
import { hashToken } from "@/lib/tokens";
import { recordEvent } from "@/lib/audit";
import { cookies } from "next/headers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing access token" }, { status: 400 });

  const base = await prisma.accessSession.findUnique({ where: { code } });
  if (!base || base.tokenHash !== hashToken(token)) {
    return NextResponse.json({ error: "Invalid or expired access link" }, { status: 404 });
  }

  const session = await getSessionWithScope(base.id);
  if (!session) return NextResponse.json({ error: "Invalid or expired access link" }, { status: 404 });

  if (session.status === "CREATED") {
    // First real open — flip to ACTIVE/WAITING and log it.
    await prisma.accessSession.update({ where: { id: session.id }, data: { status: "ACTIVE" } });
    await recordEvent({ sessionId: session.id, type: "SESSION_OPENED", actorLabel: "Guest" });
  }

  const store = await cookies();
  const pinVerified = store.get(`doshare_pin_${session.id}`)?.value === "1";

  const documents = await prisma.document.findMany({
    where: { id: { in: session.documents.map((d) => d.documentId) } },
    select: { id: true, name: true, mimeType: true, pageCount: true },
  });

  return NextResponse.json({
    status: session.status,
    purpose: session.purpose,
    expiresAt: session.expiresAt,
    documents,
    policy: session.policy,
    requiresPin: !!session.policy?.requirePin && !pinVerified,
  });
}
