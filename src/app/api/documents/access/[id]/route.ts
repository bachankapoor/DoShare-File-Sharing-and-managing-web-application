import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { getSessionWithScope } from "@/lib/sessions";
import { authorize } from "@/lib/policy";
import { recordEvent } from "@/lib/audit";
import { hashToken } from "@/lib/tokens";
import { cookies } from "next/headers";

/**
 * The only route that ever reads file bytes off storage. Identity is
 * keyed by documentId, not the raw storage key, so nothing in the URL
 * needs to leak the internal storage reference.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = await params;

  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document || document.status === "DELETED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Path 1: the owner viewing their own private vault — no session needed.
  const ownerId = await getCurrentUserId();
  if (ownerId && ownerId === document.ownerId) {
    const buf = await storage.download({ key: document.storageRef });
    return new NextResponse(buf, { headers: { "Content-Type": document.mimeType } });
  }

  // Path 2: a guest acting inside a scoped access session — every byte
  // served here goes through the Policy Engine first.
  const sessionCode = req.nextUrl.searchParams.get("session");
  const token = req.nextUrl.searchParams.get("token");
  const action = (req.nextUrl.searchParams.get("action") ?? "view").toUpperCase();

  if (!sessionCode || !token) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const baseSession = await prisma.accessSession.findUnique({ where: { code: sessionCode } });
  if (!baseSession || baseSession.tokenHash !== hashToken(token)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const session = await getSessionWithScope(baseSession.id);
  if (!session) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const store = await cookies();
  const pinVerified = store.get(`doshare_pin_${session.id}`)?.value === "1";

  const decision = authorize({
    session,
    documentId,
    action: action === "DOWNLOAD" ? "DOWNLOAD" : "VIEW",
    pinVerified,
  });

  if (decision !== "ALLOW") {
    return NextResponse.json({ error: decision }, { status: 403 });
  }

  await recordEvent({
    sessionId: session.id,
    documentId,
    type: action === "DOWNLOAD" ? "DOWNLOAD_ATTEMPTED" : "DOCUMENT_VIEWED",
    actorLabel: "Guest",
  });

  const buf = await storage.download({ key: document.storageRef });
  return new NextResponse(buf, { headers: { "Content-Type": document.mimeType } });
}
