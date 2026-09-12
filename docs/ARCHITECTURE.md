# ARCHITECTURE.md — DoShare (Reimagined)

## 1. Style

A **modular monolith** with strict domain boundaries, not microservices. Rationale: v1 has one team, one deployment target, and a small number of well-defined domains. Microservices would add network/latency/ops overhead without a corresponding benefit — the "Architecture Freedom" brief explicitly warns against overbuilding. Boundaries are enforced at the module/package level so any domain (e.g., Storage, Notifications) can be extracted into its own service later without a rewrite.

## 2. Chosen Stack (and why)

- **Next.js (App Router) + TypeScript** — single codebase for UI and API routes/server actions, strong typing end-to-end, good DX, easy to deploy.
- **PostgreSQL + Prisma** — relational integrity matters here (ownership, sessions, expiration, audit — lots of foreign keys and time-based queries); Prisma gives type-safe queries and migrations.
- **NextAuth (or equivalent) for owner identity**; guests never get accounts — they get signed, scoped tokens instead.
- **Object storage (S3-compatible) behind a StorageProvider interface** — not hard-coded to one vendor (see §6).
- **A lightweight background job runner** (e.g., a cron-triggered worker or a queue like BullMQ backed by Redis) for expiration sweeps and cleanup — not a full distributed job system.

This is a deliberate, boring, well-understood stack chosen for reliability and maintainability over novelty — consistent with "Do not select technology merely because it is fashionable."

## 3. Domain Boundaries

```
Identity          — who the owner is, authentication
Documents         — files, metadata, versions, lifecycle
Access Control     — policy engine: can actor X do action Y on document Z, when?
Access Sessions    — the temporary grant: purpose, scope, duration, state
Print Workflow     — print-specific session type and options
Audit              — immutable-looking event log
Notifications      — in-app (v1), email (stretch)
Storage            — abstracted file I/O
Administration     — operational console over the above
```

Each domain owns its own data access and exposes a small service interface; nothing outside a domain touches its tables directly.

## 4. Request Flow (creating and using a session)

```
Owner                                Service Provider (Guest)
  │ create session (purpose, docs,        │
  │ permissions, expiration)              │
  ▼                                       │
Access Session domain                     │
  │ writes session + policy               │
  │ emits SESSION_CREATED                 │
  ▼                                       │
Owner shares session code/QR ────────────►│
                                           │ opens guest link
                                           ▼
                                   Access Control (Policy Engine)
                                     authorize(actor=guest, session, action)
                                           │ ALLOW / DENY / EXPIRED / REVOKED
                                           ▼
                                   Storage.generateTemporaryAccess()
                                           │ scoped, time-boxed file access
                                           ▼
                                   Guest performs allowed action (view/print)
                                           │ emits DOCUMENT_PRINTED / VIEWED
                                           ▼
                                       Audit domain records event
                                           │
                                   Session reaches limit or expiry
                                           ▼
                                   Session → COMPLETED/EXPIRED, access revoked
```

## 5. Authentication & Authorization

- **Owners**: standard session-based auth (email/password or OAuth via NextAuth).
- **Guests**: never authenticate as a user. A session grants a signed, opaque, short-lived access token (plus optional PIN) tied to exactly one Access Session. The token is the only credential; it carries no broader account privileges.
- **Authorization is centralized** in the Policy Engine (see §7) — no scattered `if (user.role === ...)` checks in routes or components.

## 6. Storage Abstraction

```ts
interface StorageProvider {
  upload(file, meta): Promise<StorageRef>
  download(ref): Promise<Stream>
  delete(ref): Promise<void>
  stream(ref, range?): Promise<Stream>
  metadata(ref): Promise<FileMetadata>
  generateTemporaryAccess(ref, ttl, constraints): Promise<SignedUrl>
}
```

v1 implements this against S3-compatible storage. The rest of the system depends only on the interface, so swapping providers (or adding encryption-at-rest, watermarking-on-read, etc.) doesn't ripple through business logic.

## 7. Policy Engine

A single decision point:

```ts
authorize({ actor, document, session, action, context }): 
  "ALLOW" | "DENY" | "REQUIRE_VERIFICATION" | "EXPIRED" | "REVOKED"
```

v1 implementation is a straightforward rule evaluator (ownership check → session validity → expiration → permission flags → rate/attempt limits), but every access decision in the system — UI, API, print workflow, guest page — calls through this single function. This is the seam where future sophistication (device binding, risk scoring, manual approval) gets added without touching call sites.

## 8. Event-Driven Thinking (without distributed complexity)

Domain actions emit events (`DOCUMENT_UPLOADED`, `SESSION_CREATED`, `SESSION_OPENED`, `DOCUMENT_VIEWED`, `DOCUMENT_PRINTED`, `ACCESS_REVOKED`, `SESSION_EXPIRED`, `DOWNLOAD_ATTEMPTED`). In v1 these are just calls into the Audit domain (and optionally an in-process event emitter) — not a message broker. The event *shape* is designed so a real queue can be dropped in later without changing producers.

## 9. Background Processing

A single scheduled job sweeps for sessions past `expiresAt` and transitions them to `EXPIRED`, revoking any outstanding signed URLs. Kept as one job, not a job framework, per "avoid unnecessary distributed systems complexity for v1."

## 10. Security Boundaries (summary — detail in SECURITY.md)

- Guests can never enumerate or reach documents outside their session's explicit scope (checked in the Policy Engine, not just hidden in the UI).
- Session IDs/tokens are unguessable (cryptographically random, sufficient entropy) — not sequential.
- All authorization decisions happen server-side; the guest UI reflects, never enforces, permissions.
- File type/content validation happens on upload, before storage.
