# UX.md — DoShare (Reimagined)

## 1. Primary Journeys

**Owner: share a document for printing**
Vault → select documents → "Create access" → choose purpose (Print) → set print options + expiration + permissions → session created (code/QR) → hand off to shop → watch activity live → session auto-expires or is revoked.

**Owner: monitor and revoke**
Active Access screen → see live sessions with countdowns → tap to revoke any one instantly.

**Guest (print shop): fulfill a request**
Open link/scan QR → optional PIN → see only the authorized documents and the one allowed action → perform it (e.g., start printing) → session shows COMPLETED.

**Owner: review history**
Open a document → Access History tab → chronological ledger of every session and event tied to that file.

## 2. Information Architecture

```
MY DOCUMENTS   (the vault — private, default view)
ACTIVE ACCESS  (every live/pending session, at a glance)
ACTIVITY       (chronological ledger, filterable by document/session)
ACCOUNT        (identity, security settings)
```

No generic dashboard home with cards and charts — the three top-level views above *are* the home. This is deliberately a smaller IA than a typical SaaS app: three surfaces map directly to the product's three questions ("what do I have," "who currently has access," "what happened").

## 3. Screens

- **Landing** — states the problem directly ("Give someone access. Not ownership.") and visually walks through Document → Temporary Access → Purpose → Action → Expiry, before any feature list.
- **Vault** — documents as individual objects (not a folder tree); each shows its current state badge: PRIVATE / SHARED / ACTIVE SESSION / ARCHIVED.
- **Document detail** — preview, metadata, current security state, contextual actions (Share securely, Create print session, View activity, Archive, Delete).
- **Create Access Session** — purpose-first flow: pick purpose → pick documents → set permissions (view/download/print toggles, copy/download limits, one-time, PIN, no-reshare) → set expiration via a visual timeline control → confirm → get code/QR.
- **Active Sessions** — live list, each with purpose, scope, countdown, status, one-tap revoke.
- **Activity** — a ledger, newest first, groupable by session or document.
- **Print Workflow** — paper size / color / copies / page range, wrapped around the same session-creation flow rather than a separate system.
- **Secure Guest Access** — minimal, single-purpose page: what the document is, what action is allowed, a timer, a PIN prompt if required, nothing about the owner beyond what's necessary.
- **Account/Security** — auth methods, active-device awareness, security notifications.
- **Operations Console (admin)** — system health, active sessions across all users, failed operations, abuse/security signals, storage status — built for operating the platform, not for vanity metrics.

## 4. Interaction Concepts

- **Drag documents into a purpose zone** (e.g., drag onto "Print") as the fast path to session creation.
- **Contextual command palette** on a selected document (Share privately / Print / Create temporary access / View activity / Archive / Delete) instead of a wall of buttons.
- **Visual expiration timeline** (a draggable "now → expires" bar) instead of a dropdown of preset durations.
- **Session visualization**: a simple owner → session → action → expiry diagram shown at creation time and on the active-session card, so the grant is legible at a glance.

## 5. States Every Session/Document Must Show

`PRIVATE / SHARED / ACTIVE SESSION / EXPIRED / ARCHIVED / DELETED` for documents; `CREATED / WAITING / ACTIVE / IN_PROGRESS / COMPLETED / EXPIRED / REVOKED / BLOCKED` for sessions — always visible, never just implied by absence of an error.

## 6. Motion

Motion is reserved for state communication: a session card visibly moves ACTIVE → EXPIRING → EXPIRED; a completed print gets a clear "done, access closed" transition; a revoke is instant and visually final. No decorative motion, no particles, no gradient blobs — see visual-language constraints below.

## 7. Visual Language

Quiet, premium, technical-but-approachable. Avoid: giant sidebars, generic card-grid dashboards, glassmorphism, gradient hero text, glowing blobs, "Welcome back, User." Favor: clear typographic hierarchy, restrained color used semantically (e.g., one accent reserved specifically for "active/authorized" states), generous whitespace, and diagrams (like the access-flow visualization) used as real UI, not illustration.

## 8. Responsive & Accessibility

Every core action (upload, preview, create session, approve, revoke, monitor activity) must work on mobile, not just be viewable — this is often literally used at a phone-in-hand moment (standing at a print shop counter). Standard accessibility bar: keyboard navigation, visible focus states, semantic HTML, sufficient contrast, screen-reader labels for state badges/icons, reduced-motion support, and explicit loading/error/retry states for every network action (upload failed, session expired, invalid code, print unavailable, network unavailable, permission denied).
