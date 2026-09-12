"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Doc = { id: string; name: string };
type Purpose = "PRINT" | "VIEW" | "DOWNLOAD" | "SUBMIT" | "VERIFY";

const PURPOSES: { value: Purpose; label: string; hint: string }[] = [
  { value: "PRINT", label: "Print", hint: "A print shop or office prints it, nothing more" },
  { value: "VIEW", label: "View", hint: "Recipient can look, not keep a copy" },
  { value: "DOWNLOAD", label: "Download", hint: "Recipient gets one file, once" },
  { value: "SUBMIT", label: "Submit", hint: "Hand off to a service or form" },
  { value: "VERIFY", label: "Verify", hint: "Confirm a detail without full access" },
];

const DURATIONS = [15, 30, 60, 24 * 60, 7 * 24 * 60];
function durationLabel(mins: number) {
  if (mins < 60) return `${mins} min`;
  if (mins < 1440) return `${mins / 60} hr`;
  return `${mins / 1440} day${mins / 1440 > 1 ? "s" : ""}`;
}

export default function NewSessionPage() {
  return (
    <Suspense fallback={null}>
      <NewSessionForm />
    </Suspense>
  );
}

function NewSessionForm() {
  const searchParams = useSearchParams();
  const initialIds = (searchParams.get("docs") ?? "").split(",").filter(Boolean);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [purpose, setPurpose] = useState<Purpose>("PRINT");
  const [expiresInMinutes, setExpiresInMinutes] = useState(15);
  const [canView, setCanView] = useState(true);
  const [canDownload, setCanDownload] = useState(false);
  const [canPrint, setCanPrint] = useState(true);
  const [printCopyLimit, setPrintCopyLimit] = useState(2);
  const [requirePin, setRequirePin] = useState(false);
  const [pin, setPin] = useState("");
  const [oneTimeUse, setOneTimeUse] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string; guestToken: string; expiresAt: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((all: Doc[]) => setDocs(all.filter((d) => initialIds.includes(d.id))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCanPrint(purpose === "PRINT");
    setCanDownload(purpose === "DOWNLOAD");
  }, [purpose]);

  async function onSubmit() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentIds: initialIds,
        purpose,
        expiresInMinutes,
        canView,
        canDownload,
        canPrint,
        printCopyLimit: purpose === "PRINT" ? printCopyLimit : undefined,
        requirePin,
        pin: requirePin ? pin : undefined,
        oneTimeUse,
        watermarkEnabled: true,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't create the session");
      return;
    }
    setResult(await res.json());
  }

  if (result) {
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/access/${result.code}?token=${result.guestToken}`;
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <p className="data text-xs text-signal mb-2">SESSION ACTIVE</p>
        <h1 className="font-serif text-2xl mb-4">Access is ready to share</h1>
        <div className="hairline rounded-sm bg-paper-raised p-6 space-y-4">
          <div>
            <p className="text-xs text-slate mb-1">Session code</p>
            <p className="data text-lg">{result.code}</p>
          </div>
          <div>
            <p className="text-xs text-slate mb-1">Share link</p>
            <p className="data text-xs break-all">{link}</p>
          </div>
          <div>
            <p className="text-xs text-slate mb-1">Expires</p>
            <p className="text-sm">{new Date(result.expiresAt).toLocaleString()}</p>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(link)}
            className="bg-ink text-paper px-4 py-2 rounded-sm text-sm"
          >
            Copy link
          </button>
        </div>
        <p className="text-sm text-slate mt-6">
          Send this link to the recipient. You can revoke access at any time from{" "}
          <a href="/sessions" className="text-signal">
            Active Access
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="font-serif text-2xl mb-1">Create access</h1>
      <p className="text-sm text-slate mb-8">Define exactly what this session allows, and for how long.</p>

      <section className="mb-8">
        <p className="text-xs text-slate mb-2">DOCUMENTS</p>
        <ul className="hairline rounded-sm bg-paper-raised divide-y divide-line">
          {docs.map((d) => (
            <li key={d.id} className="px-4 py-2 text-sm">
              {d.name}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <p className="text-xs text-slate mb-2">PURPOSE</p>
        <div className="grid grid-cols-2 gap-2">
          {PURPOSES.map((p) => (
            <button
              key={p.value}
              onClick={() => setPurpose(p.value)}
              className={`hairline rounded-sm p-3 text-left ${
                purpose === p.value ? "bg-signal-soft border-signal" : "bg-paper-raised"
              }`}
            >
              <div className="text-sm font-medium">{p.label}</div>
              <div className="text-xs text-slate mt-0.5">{p.hint}</div>
            </button>
          ))}
        </div>
      </section>

      {purpose === "PRINT" && (
        <section className="mb-8">
          <p className="text-xs text-slate mb-2">PRINT LIMIT</p>
          <input
            type="number"
            min={1}
            max={50}
            value={printCopyLimit}
            onChange={(e) => setPrintCopyLimit(Number(e.target.value))}
            className="hairline rounded-sm px-3 py-2 text-sm bg-paper-raised w-24"
          />
          <span className="text-sm text-slate ml-2">copies max</span>
        </section>
      )}

      <section className="mb-8">
        <p className="text-xs text-slate mb-2">ACCESS EXPIRES IN</p>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((mins) => (
            <button
              key={mins}
              onClick={() => setExpiresInMinutes(mins)}
              className={`px-3 py-1.5 rounded-sm text-sm hairline ${
                expiresInMinutes === mins ? "bg-signal-soft border-signal text-signal" : "bg-paper-raised"
              }`}
            >
              {durationLabel(mins)}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8 space-y-3">
        <p className="text-xs text-slate mb-2">RESTRICTIONS</p>
        <Toggle label="One-time use — closes after the first action" checked={oneTimeUse} onChange={setOneTimeUse} />
        <Toggle label="Require a PIN to open" checked={requirePin} onChange={setRequirePin} />
        {requirePin && (
          <input
            placeholder="4–12 digit PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="hairline rounded-sm px-3 py-2 text-sm bg-paper-raised w-40"
          />
        )}
      </section>

      {error && <p className="text-sm text-alert mb-4">{error}</p>}

      <button
        onClick={onSubmit}
        disabled={submitting || initialIds.length === 0}
        className="bg-ink text-paper px-5 py-2.5 rounded-sm text-sm disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Generate access"}
      </button>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
