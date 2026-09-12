"use client";

import { useRouter } from "next/navigation";

export default function DocumentActions({ documentId }: { documentId: string }) {
  const router = useRouter();

  async function onDelete() {
    if (!confirm("Delete this document? This can't be undone.")) return;
    const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
    if (res.ok) router.push("/vault");
  }

  return (
    <div className="flex gap-2 shrink-0">
      <button
        onClick={() => router.push(`/sessions/new?docs=${documentId}`)}
        className="bg-signal text-paper px-3 py-1.5 rounded-sm text-sm"
      >
        Create access
      </button>
      <button onClick={onDelete} className="hairline px-3 py-1.5 rounded-sm text-sm text-alert">
        Delete
      </button>
    </div>
  );
}
