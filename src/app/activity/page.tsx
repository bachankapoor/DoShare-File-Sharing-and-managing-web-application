import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EVENT_LABEL: Record<string, string> = {
  SESSION_CREATED: "created an access session for",
  SESSION_OPENED: "opened the session for",
  DOCUMENT_VIEWED: "viewed",
  DOCUMENT_PRINTED: "printed",
  DOWNLOAD_ATTEMPTED: "downloaded",
  ACCESS_REVOKED: "revoked access to",
  SESSION_EXPIRED: "session expired for",
  SESSION_COMPLETED: "session completed for",
  PIN_FAILED: "entered an incorrect PIN for",
};

export default async function ActivityPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const sessions = await prisma.accessSession.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });

  const events = await prisma.accessEvent.findMany({
    where: { sessionId: { in: sessions.map((s) => s.id) } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { document: { select: { name: true } }, session: { select: { code: true, purpose: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-serif text-3xl mb-1">Activity</h1>
      <p className="text-sm text-slate mb-8">A complete record of every access event across your documents.</p>

      {events.length === 0 ? (
        <p className="text-sm text-slate hairline rounded-sm bg-paper-raised p-6">
          Nothing has happened yet.
        </p>
      ) : (
        <ol className="hairline rounded-sm bg-paper-raised divide-y divide-line">
          {events.map((e) => (
            <li key={e.id} className="px-5 py-3 flex items-baseline gap-3 text-sm">
              <span className="data text-xs text-slate shrink-0 w-40">
                {e.createdAt.toLocaleString()}
              </span>
              <span className="data text-xs text-slate shrink-0">{e.actorLabel}</span>
              <span>
                {EVENT_LABEL[e.type] ?? e.type} {e.document?.name ?? `session ${e.session.code}`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
