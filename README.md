# DoShare — Reimagined

Purpose-bound document access sessions instead of permanent file sharing.
See `/docs` (PRODUCT.md, ARCHITECTURE.md, DATA_MODEL.md, SECURITY.md, UX.md)
for the design rationale behind everything here.

## Stack

Next.js 15 (App Router, TypeScript) · PostgreSQL + Prisma · local-filesystem
storage behind a swappable `StorageProvider` interface · signed-cookie owner
sessions · scoped bearer tokens for guests (no guest accounts).

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and a real AUTH_SECRET
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Open http://localhost:3000, sign up, upload a document, select it in
**My Documents**, and create an access session. The generated link opens
`/access/<code>?token=...` — that's the guest-facing page a print shop or
recipient would see.

### If `prisma migrate dev` can't reach Prisma's engine binaries

Some sandboxed/offline environments can't download Prisma's query engine.
If that happens, apply the schema directly and skip straight to
`prisma generate`:

```bash
psql "$DATABASE_URL" -f prisma/migrations/00000000000000_init/migration.sql
npx prisma generate
npx prisma migrate resolve --applied 00000000000000_init
```

## What's implemented (MVP core loop)

- Owner auth (signup/login/logout), private document vault, upload with
  server-side MIME sniffing, soft delete
- Purpose-first access sessions (PRINT / VIEW / DOWNLOAD / SUBMIT / VERIFY)
  with per-session permissions, expiration, optional PIN, one-time use
- A single Policy Engine (`src/lib/policy.ts`) that every read/action
  goes through — no scattered authorization checks
- Guest access page: PIN gate -> scoped document list -> the one allowed
  action, no account, no owner data exposed
- Print workflow: guest "prints" inside the session, session closes
  automatically on one-time-use sessions
- Full audit ledger per document, per session, and globally (Activity page)
- Instant revoke from the Active Access page, with live countdowns

## What's intentionally deferred (see PRODUCT.md, sections 9 and 43)

QR handoff, a real background job scheduler (expiry is currently swept
lazily on read -- see `src/lib/sessions.ts`), email notifications, real
watermarking of rendered PDFs/images, malware scanning, the operations
console described in ARCHITECTURE.md's admin section, and automated tests
(SECURITY.md's testing section lists what the suite should cover first).

## Honesty note on verification

This codebase was written against `prisma/schema.prisma` by hand in a
sandboxed environment without network access to Prisma's engine binaries,
so `prisma generate`, a real build, and end-to-end testing were NOT
possible before handing this off. Run the setup steps above and treat the
first `npm run dev` as the first real compile -- please report anything
that breaks so it can be fixed.
