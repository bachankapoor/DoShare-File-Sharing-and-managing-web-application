import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import VaultClient from "@/components/VaultClient";

export default async function VaultPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const documents = await prisma.document.findMany({
    where: { ownerId: userId, status: { not: "DELETED" } },
    orderBy: { createdAt: "desc" },
  });

  // "Shared" badge: does this document currently sit inside a live session?
  const liveLinks = await prisma.accessSessionDocument.findMany({
    where: {
      documentId: { in: documents.map((d) => d.id) },
      session: { status: { in: ["ACTIVE", "IN_PROGRESS", "WAITING", "CREATED"] } },
    },
    select: { documentId: true },
  });
  const sharedIds = new Set(liveLinks.map((l) => l.documentId));

  return (
    <VaultClient
      documents={documents.map((d) => ({
        id: d.id,
        name: d.name,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        createdAt: d.createdAt.toISOString(),
        shared: sharedIds.has(d.id),
      }))}
    />
  );
}
