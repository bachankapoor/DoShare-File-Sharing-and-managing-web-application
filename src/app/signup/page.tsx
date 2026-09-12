"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      return;
    }
    router.push("/vault");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-6 pt-20">
      <h1 className="font-serif text-2xl mb-1">Create your vault</h1>
      <p className="text-sm text-slate mb-8">Your documents stay private by default.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name (optional)">
          <input
            className="hairline rounded-sm w-full px-3 py-2 text-sm bg-paper-raised"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            required
            className="hairline rounded-sm w-full px-3 py-2 text-sm bg-paper-raised"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            minLength={8}
            className="hairline rounded-sm w-full px-3 py-2 text-sm bg-paper-raised"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error && <p className="text-sm text-alert">{error}</p>}

        <button
          disabled={loading}
          className="bg-ink text-paper w-full py-2.5 rounded-sm text-sm disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-sm text-slate mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-signal">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm mb-1">{label}</span>
      {children}
    </label>
  );
}
