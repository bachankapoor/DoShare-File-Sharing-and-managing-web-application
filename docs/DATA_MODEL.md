# DATA_MODEL.md — DoShare (Reimagined)

## 1. Entities

### User (Owner)
```
id, email, passwordHash | oauthProvider, name, createdAt, status (ACTIVE/SUSPENDED)
```

### Document
```
id, ownerId (→User), name, mimeType, sizeBytes, pageCount,
storageRef, hash (sha256 for integrity/dedup),
status: UPLOADING | PROCESSING | AVAILABLE | FAILED | ARCHIVED | DELETED
createdAt, updatedAt, deletedAt (soft delete)
```

### DocumentVersion  *(kept minimal in v1 — one active version per document; table exists so re-upload/versioning is a future add, not a schema rewrite)*
```
id, documentId, storageRef, hash, createdAt
```

### AccessSession
```
id, code (short human-shareable, e.g. "X8K4-92"), token (opaque, signed),
ownerId, purpose: PRINT | VIEW | DOWNLOAD | SUBMIT | VERIFY,
status: CREATED | WAITING | ACTIVE | IN_PROGRESS | COMPLETED | EXPIRED | REVOKED | BLOCKED,
createdAt, expiresAt, revokedAt, pinHash (nullable),
oneTimeUse (bool), maxUses (nullable int), useCount
```

### AccessSessionDocument  *(join table — a session scopes to specific documents)*
```
sessionId, documentId
```

### AccessPolicy  *(permission flags for a session)*
```
sessionId,
canView, canDownload, canPrint,
printCopyLimit, downloadLimit,
allowResharing (default false),
watermarkEnabled, requirePin, requireManualApproval
```

### AccessEvent  *(the audit ledger)*
```
id, sessionId, documentId (nullable — some events are session-level),
type: SESSION_CREATED | SESSION_OPENED | DOCUMENT_VIEWED | DOCUMENT_PRINTED |
      DOWNLOAD_ATTEMPTED | ACCESS_REVOKED | SESSION_EXPIRED | SESSION_COMPLETED,
actorLabel (e.g. "Guest", "Print Shop" — never a real identity unless verified),
metadata (jsonb — e.g. print copies, ip/device hint),
createdAt
```

### PrintJob
```
id, sessionId, paperSize, color (bool), copies, pageRange,
status: QUEUED | PRINTING | COMPLETED | FAILED,
createdAt, completedAt
```

### Notification
```
id, userId, type, message, read (bool), createdAt
```

### AdminAuditEvent  *(admin/operator actions, separate from user-facing AccessEvent)*
```
id, actorAdminId, action, targetType, targetId, createdAt
```

## 2. Relationships

```
User 1───* Document
User 1───* AccessSession
AccessSession *───* Document   (via AccessSessionDocument)
AccessSession 1───1 AccessPolicy
AccessSession 1───* AccessEvent
AccessSession 1───* PrintJob (typically 1, but modeled as many for retries)
Document 1───* AccessEvent
Document 1───* DocumentVersion
User 1───* Notification
```

## 3. Lifecycle & State Notes

- **Document.status**: `DELETED` is a soft delete (`deletedAt` set); storage object is purged by a background job after a grace period, allowing audit events to still reference the document by id.
- **AccessSession.status transitions**:
  `CREATED → WAITING → ACTIVE → IN_PROGRESS → COMPLETED`
  or `→ EXPIRED` (time-based, via sweep job) / `→ REVOKED` (owner action) / `→ BLOCKED` (abuse detection) at any point before `COMPLETED`.
- Every state transition writes an `AccessEvent` — the ledger is derived from, and should always be reconcilable with, the session's status.

## 4. Indexing & Concurrency

- Unique index on `AccessSession.code` and `AccessSession.token`.
- Composite index on `(sessionId, createdAt)` for AccessEvent (fast timeline reads).
- Index on `Document.ownerId, status` (vault listing).
- `useCount` increments happen inside a DB transaction with a row lock / optimistic check against `maxUses` and `oneTimeUse` to prevent race conditions when a session is hit concurrently (e.g., a token used from two tabs at once).

## 5. Retention

- Expired/revoked sessions retain their `AccessEvent` history indefinitely (this is the product's core value proposition — visibility). Only the *access itself* is revoked, not the record that it happened.
- Deleted documents purge storage but keep a tombstone row + audit trail referencing the id, so historical activity logs remain coherent.
