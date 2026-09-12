import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth";
import { redirect } from "next/navigation";

const STEPS = [
  { label: "Private document", detail: "Stays in your vault, never handed over" },
  { label: "Temporary access", detail: "Scoped to one recipient, one purpose" },
  { label: "Specific purpose", detail: "Print, view, download — nothing broader" },
  { label: "Action completed", detail: "The recipient does exactly what you allowed" },
  { label: "Access expires", detail: "Automatically, or the instant you revoke it" },
];

export default async function Home() {
  const userId = await getCurrentUserId();
  if (userId) redirect("/vault");

  return (
    <div className="mx-auto max-w-5xl px-6">
      <section className="pt-20 pb-16 max-w-2xl">
        <h1 className="font-serif text-5xl leading-[1.1] tracking-tight">
          Your documents should stay yours.
        </h1>
        <p className="mt-6 text-lg text-slate max-w-lg">
          Give someone access to a document. Not the document itself. DoShare replaces
          permanent share links with time-boxed, purpose-bound sessions you can watch —
          and end — at any moment.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/signup" className="bg-ink text-paper px-5 py-2.5 rounded-sm text-sm">
            Secure a document
          </Link>
          <Link href="/login" className="hairline px-5 py-2.5 rounded-sm text-sm">
            Sign in
          </Link>
        </div>
      </section>

      <section className="pb-24">
        <div className="hairline rounded-sm bg-paper-raised p-8">
          <p className="data text-xs text-slate mb-6">THE CORE LOOP</p>
          <ol className="grid sm:grid-cols-5 gap-6">
            {STEPS.map((step, i) => (
              <li key={step.label} className="relative">
                <div className="data text-xs text-signal mb-2">{String(i + 1).padStart(2, "0")}</div>
                <div className="font-medium text-sm">{step.label}</div>
                <div className="text-sm text-slate mt-1">{step.detail}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pb-24 grid sm:grid-cols-2 gap-10">
        <div>
          <h2 className="font-serif text-2xl mb-3">For document owners</h2>
          <p className="text-slate text-sm leading-relaxed">
            Students, freelancers, job seekers, and anyone handling identity documents,
            certificates, or financial paperwork. You decide who can act on a document,
            what they can do with it, and for how long — and you can end it early.
          </p>
        </div>
        <div>
          <h2 className="font-serif text-2xl mb-3">For service providers</h2>
          <p className="text-slate text-sm leading-relaxed">
            Print shops, offices, and service desks get exactly what they need to complete
            a task — nothing more. No account library, no unrelated files, no permanent
            copy left behind.
          </p>
        </div>
      </section>
    </div>
  );
}
