import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, AuthError } from "@/lib/auth";
import { createAccessSession, sweepIfExpired } from "@/lib/sessions";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const sessions = await prisma.accessSession.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      include: { documents: { include: { document: true } }, policy: true },
    });
    // Opportunistically reconcile status for anything shown to the owner.
    await Promise.all(sessions.map((s) => sweepIfExpired(s.id)));
    const fresh = await prisma.accessSession.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      include: { documents: { include: { document: true } }, policy: true },
    });
    return NextResponse.json(fresh);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    throw e;
  }
}

const schema = z.object({
  documentIds: z.array(z.string()).min(1, "Select at least one document"),
  purpose: z.enum(["PRINT", "VIEW", "DOWNLOAD", "SUBMIT", "VERIFY"]),
  expiresInMinutes: z.number().int().min(1).max(60 * 24 * 7),
  canView: z.boolean().default(true),
  canDownload: z.boolean().default(false),
  canPrint: z.boolean().default(false),
  printCopyLimit: z.number().int().min(1).optional(),
  downloadLimit: z.number().int().min(1).optional(),
  watermarkEnabled: z.boolean().default(true),
  requirePin: z.boolean().default(false),
  pin: z.string().min(4).max(12).optional(),
  oneTimeUse: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const input = parsed.data;

    if (input.requirePin && !input.pin) {
      return NextResponse.json({ error: "A PIN is required when 'Require PIN' is on" }, { status: 400 });
    }

    // Confirm the caller actually owns every document being scoped in —
    // never trust the client-supplied id list without this check.
    const owned = await prisma.document.count({
      where: { id: { in: input.documentIds }, ownerId: user.id, status: "AVAILABLE" },
    });
    if (owned !== input.documentIds.length) {
      return NextResponse.json({ error: "One or more documents are not available" }, { status: 403 });
    }

    const { session, guestToken } = await createAccessSession({
      ownerId: user.id,
      documentIds: input.documentIds,
      purpose: input.purpose,
      expiresInMinutes: input.expiresInMinutes,
      pin: input.pin,
      permissions: {
        canView: input.canView,
        canDownload: input.canDownload,
        canPrint: input.canPrint,
        printCopyLimit: input.printCopyLimit,
        downloadLimit: input.downloadLimit,
        watermarkEnabled: input.watermarkEnabled,
        requirePin: input.requirePin,
        oneTimeUse: input.oneTimeUse,
      },
    });

    return NextResponse.json({
      id: session.id,
      code: session.code,
      guestToken, // shown once — the frontend builds the share link/QR from this
      expiresAt: session.expiresAt,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    throw e;
  }
}
