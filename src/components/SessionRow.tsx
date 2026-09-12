"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SessionRow({
  id,
  code,
  purpose,
  status,
  expiresAt,
  documentNames,
}: {
  id: string;
  code: string;
  purpose: string;
  status: string;
  expiresAt: string;
  documentNames: string[];
}) {
  const router = useRouter();
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) return setRemaining("expiring…");
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setRemaining(mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m ${secs}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  async function revoke() {
    if (!confirm("Revoke this access immediately?")) return;
    await fetch(`/api/sessions/${id}/revoke`, { method: "POST" });
    router.refresh();
  }

  return (
    <li className="hairline rounded-sm bg-paper-raised px-5 py-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-signal inline-block" />
          <span className="data text-xs text-signal">{purpose}</span>
          <span className="data text-xs text-slate">· {code}</span>
        </div>
        <div className="text-sm mt-1 truncate">{documentNames.join(", ")}</div>
        <div className="data text-xs text-slate mt-1">
          {status} · expires in {remaining}
        </div>
      </div>
      <button onClick={revoke} className="hairline text-alert text-sm px-3 py-1.5 rounded-sm shrink-0">
        Revoke
      </button>
    </li>
  );
}
