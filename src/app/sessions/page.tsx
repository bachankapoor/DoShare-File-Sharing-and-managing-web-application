import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sweepIfExpired } from "@/lib/sessions";
import SessionRow from "@/components/SessionRow";

export default async function SessionsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const sessions = await prisma.accessSession.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    include: { documents: { include: { document: true } } },
  });
  await Promise.all(sessions.map((s) => sweepIfExpired(s.id)));

  const fresh = await prisma.accessSession.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    include: { documents: { include: { document: true } } },
  });

  const active = fresh.filter((s) => ["CREATED", "WAITING", "ACTIVE", "IN_PROGRESS"].includes(s.status));
  const past = fresh.filter((s) => !["CREATED", "WAITING", "ACTIVE", "IN_PROGRESS"].includes(s.status));

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-serif text-3xl mb-1">Active Access</h1>
      <p className="text-sm text-slate mb-8">Every live grant, at a glance. Revoke any of them instantly.</p>

      <section className="mb-10">
        <p className="text-xs text-slate mb-2">LIVE</p>
        {active.length === 0 ? (
          <p className="text-sm text-slate hairline rounded-sm bg-paper-raised p-6">
            Nothing is currently shared.
          </p>
        ) : (
          <ul className="space-y-3">
            {active.map((s) => (
              <SessionRow
                key={s.id}
                id={s.id}
                code={s.code}
                purpose={s.purpose}
                status={s.status}
                expiresAt={s.expiresAt.toISOString()}
                documentNames={s.documents.map((d) => d.document.name)}
              />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <p className="text-xs text-slate mb-2">PAST</p>
          <ul className="space-y-2">
            {past.map((s) => (
              <li key={s.id} className="hairline rounded-sm bg-paper-raised px-4 py-3 text-sm flex justify-between">
                <span>{s.documents.map((d) => d.document.name).join(", ")}</span>
                <span className="data text-xs text-slate">{s.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
