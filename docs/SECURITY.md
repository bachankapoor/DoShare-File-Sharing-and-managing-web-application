# SECURITY.md — DoShare (Reimagined)

## 1. Trust Boundaries

```
[Owner browser] ──auth session──> [App server] ──> [Postgres]
                                        │
                                        ├──> [Storage (S3-compatible)]
                                        │
[Guest browser] ──scoped token──> [App server]  (no account, no broader access)
```

The app server is the only component that talks to storage and the database directly. Guests and owners never get direct storage URLs except short-lived, scope-limited signed URLs generated per action.

## 2. Threats & Mitigations

| Threat | Mitigation |
|---|---|
| Unauthorized document access | Every read/action goes through the Policy Engine (`authorize()`), never a raw ownerId/documentId lookup from client input alone. |
| Guessable access tokens / session codes | Cryptographically random tokens (≥128 bits); human-shareable `code` is separate from the actual bearer token and rate-limited on lookup. |
| Token leakage (logs, referrers, shoulder-surfing) | Tokens never appear in logs; short expiration windows; optional PIN as a second factor; watermark shows session id so leaked screenshots are traceable to a session. |
| Session replay after expiry | Server checks `expiresAt`/`status` on every action, not just at link-open time; sweep job proactively flips expired sessions. |
| Broken authorization / IDOR | Centralized Policy Engine is the single choke point; no endpoint trusts a client-supplied documentId without re-deriving scope from the session. |
| Malicious uploads / file-type spoofing | Server-side MIME sniffing (not trusting the extension or client-reported type) + size limits + allow-list of supported types before storage. |
| Path traversal | Storage keys are generated server-side (UUID-based), never derived from user-supplied filenames. |
| SSRF | No user-supplied URLs are fetched server-side; storage access is via SDK, not arbitrary HTTP fetch. |
| XSS via document metadata (filenames, notes) | All user-supplied strings are escaped on render; filenames are sanitized before display and storage-key generation. |
| CSRF | Standard same-site cookies + CSRF tokens on state-changing owner routes; guest actions are token-authenticated (bearer-style), not cookie-based, so CSRF doesn't apply the same way but action endpoints still validate origin. |
| Brute force on session codes/PINs | Rate limiting + exponential backoff per code/IP; lock a session after N failed PIN attempts and notify the owner. |
| Excessive/abusive sharing | Per-user session-creation rate limits; anomaly flags surfaced to the admin console. |
| Unauthorized admin actions | Separate admin role/auth, every admin action recorded in AdminAuditEvent. |
| Data leakage through logs | Structured logging with an explicit deny-list for tokens, PINs, and raw file content; log document *ids*, not contents. |

## 3. Access-Control Model

Authorization is capability-based, not identity-based, for guests: possession of a valid, unexpired session token *is* the capability, scoped exactly to the documents/actions defined in that session's `AccessPolicy`. Owners are identity-based (they own what they own). Admins are role-based with their own audit trail.

## 4. Session/Token Strategy

- Token = signed random value, stored hashed server-side (so a DB leak doesn't hand out live tokens).
- Expiration is enforced server-side on every request, not just client-side countdown UI (the countdown is UX, not security).
- Revocation is immediate: revoking a session invalidates the token check on the very next request — no cache lag.

## 5. File Security

- Files are validated and, where feasible, scanned before being marked `AVAILABLE`.
- Storage access is always via short-TTL signed URLs scoped to one object, never a durable public link.
- Optional dynamic watermark (session id + timestamp + purpose) is applied at render/print time for view/print flows, not baked permanently into the stored original.

## 6. Logging Policy

Log: event type, session id, document id, actor label, timestamps, coarse outcome. Never log: file contents, raw tokens, PINs, full file paths that could aid traversal.

## 7. Honest Security Claims

DoShare does not claim documents are "impossible to copy" — a screenshot or photograph of a rendered page cannot be prevented by any browser-based system. What DoShare actually controls and can honestly claim: access duration, action scope, document scope, revocation, and a verifiable record of what was accessed, by what purpose, and when. The product's honesty about this limitation is itself part of its trustworthiness.
