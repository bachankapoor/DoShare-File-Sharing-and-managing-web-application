import { redirect, notFound } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DocumentActions from "@/components/DocumentActions";

const EVENT_LABEL: Record<string, string> = {
  SESSION_CREATED: "Access session created",
  SESSION_OPENED: "Recipient opened the session",
  DOCUMENT_VIEWED: "Document viewed",
  DOCUMENT_PRINTED: "Document printed",
  DOWNLOAD_ATTEMPTED: "Download performed",
  ACCESS_REVOKED: "Access revoked",
  SESSION_EXPIRED: "Session expired",
  SESSION_COMPLETED: "Session completed",
  PIN_FAILED: "Incorrect PIN attempt",
};

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const { id } = await params;

  const document = await prisma.document.findFirst({ where: { id, ownerId: userId } });
  if (!document) notFound();

  const events = await prisma.accessEvent.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const isImage = document.mimeType.startsWith("image/");

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl">{document.name}</h1>
          <p className="data text-xs text-slate mt-1">
            {document.mimeType} · {document.status}
          </p>
        </div>
        <DocumentActions documentId={document.id} />
      </div>

      {isImage && (
        <div className="hairline rounded-sm overflow-hidden mb-8 bg-paper-raised">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/documents/access/${document.id}`}
            alt={document.name}
            className="w-full"
          />
        </div>
      )}

      <div className="hairline rounded-sm bg-paper-raised p-6">
        <p className="data text-xs text-slate mb-4">ACCESS HISTORY</p>
        {events.length === 0 ? (
          <p className="text-sm text-slate">No external access. This document has never left your vault.</p>
        ) : (
          <ol className="space-y-3">
            {events.map((e) => (
              <li key={e.id} className="flex items-baseline gap-3 text-sm">
                <span className="data text-xs text-slate shrink-0">
                  {e.createdAt.toLocaleString()}
                </span>
                <span>{EVENT_LABEL[e.type] ?? e.type}</span>
                <span className="data text-xs text-slate">— {e.actorLabel}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
