import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithScope } from "@/lib/sessions";
import { hashToken } from "@/lib/tokens";
import { authorize } from "@/lib/policy";
import { recordEvent } from "@/lib/audit";
import { cookies } from "next/headers";
import { z } from "zod";

const schema = z.object({
  token: z.string(),
  documentIds: z.array(z.string()).min(1),
  paperSize: z.string().default("A4"),
  color: z.boolean().default(false),
  copies: z.number().int().min(1).max(50).default(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { token, documentIds, paperSize, color, copies } = parsed.data;

  const base = await prisma.accessSession.findUnique({ where: { code } });
  if (!base || base.tokenHash !== hashToken(token)) {
    return NextResponse.json({ error: "Invalid access link" }, { status: 404 });
  }

  const session = await getSessionWithScope(base.id);
  if (!session) return NextResponse.json({ error: "Invalid access link" }, { status: 404 });
  if (session.purpose !== "PRINT") {
    return NextResponse.json({ error: "This session does not permit printing" }, { status: 403 });
  }

  const store = await cookies();
  const pinVerified = store.get(`doshare_pin_${session.id}`)?.value === "1";

  for (const documentId of documentIds) {
    const decision = authorize({ session, documentId, action: "PRINT", pinVerified });
    if (decision !== "ALLOW") {
      return NextResponse.json({ error: `Print not permitted: ${decision}` }, { status: 403 });
    }
  }

  const printCopyLimit = session.policy?.printCopyLimit;
  if (printCopyLimit && copies > printCopyLimit) {
    return NextResponse.json({ error: `Copy limit for this session is ${printCopyLimit}` }, { status: 403 });
  }

  const job = await prisma.printJob.create({
    data: { sessionId: session.id, paperSize, color, copies, status: "COMPLETED", completedAt: new Date() },
  });

  for (const documentId of documentIds) {
    await recordEvent({
      sessionId: session.id,
      documentId,
      type: "DOCUMENT_PRINTED",
      actorLabel: "Print Shop",
      metadata: { paperSize, color, copies },
    });
  }

  const newUseCount = session.useCount + 1;
  const shouldClose = session.oneTimeUse || (session.maxUses != null && newUseCount >= session.maxUses);

  await prisma.accessSession.update({
    where: { id: session.id },
    data: {
      useCount: newUseCount,
      status: shouldClose ? "COMPLETED" : "IN_PROGRESS",
    },
  });

  if (shouldClose) {
    await recordEvent({ sessionId: session.id, type: "SESSION_COMPLETED", actorLabel: "System" });
  }

  return NextResponse.json({ ok: true, printJobId: job.id, sessionStatus: shouldClose ? "COMPLETED" : "IN_PROGRESS" });
}
