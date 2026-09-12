import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, AuthError } from "@/lib/auth";
import { storage } from "@/lib/storage";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const document = await prisma.document.findFirst({ where: { id, ownerId: user.id } });
    if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const events = await prisma.accessEvent.findMany({
      where: { documentId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ document, events });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    throw e;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const document = await prisma.document.findFirst({ where: { id, ownerId: user.id } });
    if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Soft delete: the row (and its audit trail) survives; the bytes don't.
    await prisma.document.update({ where: { id }, data: { status: "DELETED", deletedAt: new Date() } });
    await storage.delete({ key: document.storageRef }).catch(() => {
      // Best-effort — a failed blob purge shouldn't block the delete;
      // a cleanup sweep can retry orphaned storage keys later.
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    throw e;
  }
}
