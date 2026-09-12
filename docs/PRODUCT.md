# PRODUCT.md — DoShare (Reimagined)

## 1. Problem

People lose control of sensitive documents the moment those documents leave their device. Sending an Aadhaar card, passport, resume, or bank statement over WhatsApp, email, or USB to a print shop, office, or service means the file is now copied, cached, and effectively out of the owner's hands — with no visibility into what happens to it next.

The underlying question the product answers:

> **How can I let someone use a document without giving them permanent possession of it?**

This is broader than "print shop privacy." It applies to any moment a document crosses a trust boundary: printing, viewing, submitting to a service, verifying an identity, or handing something to a business that only needs it once.

## 2. Product Identity

**Name:** DoShare — kept, reframed. The tagline carries the differentiation:

> "Give someone access. Not ownership."

DoShare is not a file-storage product. It is a **purpose-bound access control layer** that sits between a user's private documents and the outside world. Where Drive/Dropbox answer "where are my files," DoShare answers "who can use this file, why, for how long, and what happened."

## 3. Target Users

**Document Owners** — students, job seekers, freelancers, employees, citizens — anyone who needs a document used by someone else without surrendering it.

**Service Providers** — print/cyber shops, scanning centers, HR desks, accountants, government-service counters — anyone who needs *temporary, scoped* access to complete a task, not permanent custody of a file or an account.

## 4. Core Product Principle

Traditional model: `File → Upload → Share Link` (permanent, unscoped, unaudited).

DoShare's model:

```
Document → Purpose → Temporary Access → Action → Expiration → Audit
```

Every external interaction is an **access session** bound to an intent (PRINT, VIEW, DOWNLOAD, SUBMIT, VERIFY), a scope (which documents), a duration, and a set of allowed actions. Nothing is shared without a reason, a limit, and a record.

## 5. Core Loop (MVP)

```
Upload → Select documents → Define purpose → Create session
  → External party acts within session → Event logged
  → Session expires or is revoked → Owner sees full activity record
```

If this loop is fast, trustworthy, and legible, the product has value — everything else is secondary.

## 6. MVP Scope

**Account & Vault**: sign up/in, private document list, upload, preview, delete, basic metadata (name, type, size, pages, uploaded date).

**Access Sessions**: create a session (purpose + documents + permissions + expiration), view active sessions, revoke instantly, see session status transitions.

**Permissions per session**: view / print / download toggles, print-copy limits, one-time access, optional PIN, disable re-share.

**Guest Access**: a link/code opens a minimal page showing only the authorized documents and allowed actions — no account, no owner data exposed.

**Print Workflow**: a dedicated flow (paper size, color, copies) that produces a session a print shop can act on without seeing anything else.

**Audit Trail**: a per-document and per-session timeline of what happened (created, opened, viewed, printed, downloaded, revoked, expired).

**Admin Console**: active sessions, failed operations, security events, storage/system health — an operations view, not a stats dashboard.

## 7. Non-Goals (v1)

No SSO, no blockchain, no microservices, no OCR/AI document analysis, no collaboration/editing features, no billing, no push notifications, no multi-provider storage abstraction beyond a clean interface. These are explicitly deferred (see §9).

## 8. Design Philosophy

One idea, repeated everywhere in the UI: **access is temporary, ownership stays with you.** Every screen should visibly answer: who has access, to what, why, until when, and can I stop it right now.

## 9. Future Expansion (not built now, but architecture should not block it)

- QR-based session handoff (generate QR → shop scans → session opens)
- Print-shop / service-provider network with discovery and verification
- Document verification without exposing the original ("verify, don't download")
- Organization accounts with policy-based workflows
- Signature workflows
- Public API for third-party integrations

## 10. Success Criteria for the Demo

A user shares two documents to a "print shop" via a session scoped to PRINT only, with a 15-minute expiration. The shop sees only those two files and only a print action. After printing, the session closes automatically, and the user's activity log shows every step — with no file ever leaving as an unscoped copy.
