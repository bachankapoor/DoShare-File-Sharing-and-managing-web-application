"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Doc = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  shared: boolean;
};

export default function VaultClient({ documents }: { documents: Doc[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Couldn't upload ${file.name}`);
        break;
      }
    }
    setUploading(false);
    router.refresh();
  }

  function createSession() {
    const ids = Array.from(selected).join(",");
    router.push(`/sessions/new?docs=${encodeURIComponent(ids)}`);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl">My Documents</h1>
          <p className="text-sm text-slate mt-1">Private by default. Nothing leaves here without a session.</p>
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <button
              onClick={createSession}
              className="bg-signal text-paper px-4 py-2 rounded-sm text-sm"
            >
              Create access · {selected.size} selected
            </button>
          )}
          <label className="hairline px-4 py-2 rounded-sm text-sm cursor-pointer bg-paper-raised">
            {uploading ? "Uploading…" : "Upload document"}
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => onUpload(e.target.files)}
            />
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-alert mb-4">{error}</p>}

      {documents.length === 0 ? (
        <div className="hairline rounded-sm bg-paper-raised p-10 text-center">
          <p className="text-slate text-sm">
            Nothing here yet. Upload a document to bring it under control.
          </p>
        </div>
      ) : (
        <ul className="hairline rounded-sm divide-y divide-line bg-paper-raised">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-4 px-5 py-4">
              <input
                type="checkbox"
                checked={selected.has(doc.id)}
                onChange={() => toggle(doc.id)}
                className="accent-current"
              />
              <Link href={`/vault/${doc.id}`} className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{doc.name}</div>
                <div className="data text-xs text-slate mt-0.5">
                  {formatSize(doc.sizeBytes)} · {doc.mimeType} ·{" "}
                  {new Date(doc.createdAt).toLocaleDateString()}
                </div>
              </Link>
              <StatusBadge shared={doc.shared} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ shared }: { shared: boolean }) {
  if (!shared) {
    return <span className="data text-xs text-slate">PRIVATE</span>;
  }
  return (
    <span className="data text-xs text-signal bg-signal-soft px-2 py-1 rounded-sm">
      ACTIVE SESSION
    </span>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
