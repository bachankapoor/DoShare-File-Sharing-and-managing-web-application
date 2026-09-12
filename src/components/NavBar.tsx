"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/vault", label: "My Documents" },
  { href: "/sessions", label: "Active Access" },
  { href: "/activity", label: "Activity" },
];

export default function NavBar({ signedIn, email }: { signedIn: boolean; email?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="hairline border-t-0 border-x-0 bg-paper-raised">
      <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
        <Link href={signedIn ? "/vault" : "/"} className="font-serif text-lg tracking-tight">
          DoShare
        </Link>

        {signedIn && (
          <nav className="hidden sm:flex items-center gap-1">
            {LINKS.map((l) => {
              const active = pathname?.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
                    active ? "bg-signal-soft text-signal" : "text-slate hover:text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {signedIn ? (
            <>
              <span className="hidden sm:inline text-sm text-slate data">{email}</span>
              <button onClick={logout} className="text-sm text-slate hover:text-ink">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-slate hover:text-ink">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="text-sm bg-ink text-paper px-3 py-1.5 rounded-sm hover:opacity-90"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
