"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type GuestSession = {
  status: string;
  purpose: string;
  expiresAt: string;
  documents: { id: string; name: string; mimeType: string }[];
  policy: { canView: boolean; canDownload: boolean; canPrint: boolean; printCopyLimit?: number };
  requiresPin: boolean;
};

export default function GuestAccessPage() {
  return (
    <Suspense fallback={null}>
      <GuestAccess />
    </Suspense>
  );
}

function GuestAccess() {
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const code = params.code;

  const [data, setData] = useState<GuestSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [printDone, setPrintDone] = useState(false);

  async function load() {
    const res = await fetch(`/api/guest/${code}?token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "This access link is no longer valid.");
      return;
    }
    setData(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, token]);

  async function submitPin() {
    setPinError(null);
    const res = await fetch(`/api/guest/${code}/verify-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, pin }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setPinError(body.error ?? "Incorrect PIN");
      return;
    }
    load();
  }

  async function print() {
    const res = await fetch(`/api/guest/${code}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        documentIds: data!.documents.map((d) => d.id),
        paperSize: "A4",
        color: false,
        copies: 1,
      }),
    });
    if (res.ok) {
      setPrintDone(true);
      // Trigger the browser print dialog for each authorized document.
      for (const doc of data!.documents) {
        window.open(`/api/documents/access/${doc.id}?session=${code}&token=${token}&action=view`, "_blank");
      }
      load();
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-sm px-6 py-24 text-center">
        <p className="data text-xs text-alert mb-2">ACCESS UNAVAILABLE</p>
        <p className="text-sm text-slate">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  if (data.requiresPin) {
    return (
      <div className="mx-auto max-w-sm px-6 py-24">
        <p className="data text-xs text-slate mb-2">SECURE DOCUMENT ACCESS</p>
        <h1 className="font-serif text-2xl mb-6">Enter the PIN to continue</h1>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="hairline rounded-sm px-3 py-2 text-sm bg-paper-raised w-full mb-3"
          placeholder="PIN"
        />
        {pinError && <p className="text-sm text-alert mb-3">{pinError}</p>}
        <button onClick={submitPin} className="bg-ink text-paper px-4 py-2 rounded-sm text-sm w-full">
          Continue
        </button>
      </div>
    );
  }

  const terminal = ["COMPLETED", "EXPIRED", "REVOKED", "BLOCKED"].includes(data.status);

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <p className="data text-xs text-slate mb-2">SECURE DOCUMENT ACCESS</p>
      <h1 className="font-serif text-2xl mb-1">{data.purpose === "PRINT" ? "Print request" : "Document access"}</h1>
      <p className="data text-xs text-slate mb-8">
        Expires {new Date(data.expiresAt).toLocaleString()}
      </p>

      <div className="hairline rounded-sm bg-paper-raised p-5 mb-6">
        <p className="text-xs text-slate mb-3">DOCUMENTS ({data.documents.length})</p>
        <ul className="space-y-2">
          {data.documents.map((d) => (
            <li key={d.id} className="text-sm">
              {d.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="hairline rounded-sm bg-paper-raised p-5 mb-6">
        <p className="text-xs text-slate mb-3">ALLOWED</p>
        <ul className="text-sm space-y-1">
          {data.policy.canView && <li>✓ View</li>}
          {data.policy.canPrint && (
            <li>✓ Print{data.policy.printCopyLimit ? ` (max ${data.policy.printCopyLimit} copies)` : ""}</li>
          )}
          {data.policy.canDownload && <li>✓ Download</li>}
        </ul>
      </div>

      {terminal ? (
        <p className="text-sm text-slate">
          {printDone || data.status === "COMPLETED"
            ? "This session is complete. Access has closed."
            : "This session is no longer active."}
        </p>
      ) : data.purpose === "PRINT" && data.policy.canPrint ? (
        <button onClick={print} className="bg-signal text-paper px-5 py-2.5 rounded-sm text-sm w-full">
          Start printing
        </button>
      ) : data.policy.canView ? (
        <a
          href={`/api/documents/access/${data.documents[0]?.id}?session=${code}&token=${token}&action=view`}
          target="_blank"
          className="block text-center hairline px-5 py-2.5 rounded-sm text-sm"
        >
          View document
        </a>
      ) : null}
    </div>
  );
}
