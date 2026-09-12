-- Fallback migration, hand-written to match prisma/schema.prisma exactly.
-- Prefer `npx prisma migrate dev --name init` when your machine has normal
-- internet access (it needs to fetch Prisma's engine binaries once).
-- If that's ever blocked, you can apply this file directly instead:
--   psql "$DATABASE_URL" -f prisma/migrations/00000000000000_init/migration.sql
-- then run `npx prisma generate` (and, if you want Prisma to consider the
-- migration "applied", `npx prisma migrate resolve --applied 00000000000000_init`).

CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'AVAILABLE', 'FAILED', 'ARCHIVED', 'DELETED');
CREATE TYPE "SessionPurpose" AS ENUM ('PRINT', 'VIEW', 'DOWNLOAD', 'SUBMIT', 'VERIFY');
CREATE TYPE "SessionStatus" AS ENUM ('CREATED', 'WAITING', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'REVOKED', 'BLOCKED');
CREATE TYPE "AccessEventType" AS ENUM ('SESSION_CREATED', 'SESSION_OPENED', 'DOCUMENT_VIEWED', 'DOCUMENT_PRINTED', 'DOWNLOAD_ATTEMPTED', 'ACCESS_REVOKED', 'SESSION_EXPIRED', 'SESSION_COMPLETED', 'PIN_FAILED');
CREATE TYPE "PrintJobStatus" AS ENUM ('QUEUED', 'PRINTING', 'COMPLETED', 'FAILED');

CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "documents" (
  "id" TEXT PRIMARY KEY,
  "ownerId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "pageCount" INTEGER,
  "storageRef" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "status" "DocumentStatus" NOT NULL DEFAULT 'PROCESSING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3)
);
CREATE INDEX "documents_ownerId_status_idx" ON "documents"("ownerId", "status");

CREATE TABLE "document_versions" (
  "id" TEXT PRIMARY KEY,
  "documentId" TEXT NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  "storageRef" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "access_sessions" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "ownerId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "purpose" "SessionPurpose" NOT NULL,
  "status" "SessionStatus" NOT NULL DEFAULT 'CREATED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "pinHash" TEXT,
  "oneTimeUse" BOOLEAN NOT NULL DEFAULT false,
  "maxUses" INTEGER,
  "useCount" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX "access_sessions_ownerId_status_idx" ON "access_sessions"("ownerId", "status");

CREATE TABLE "access_session_documents" (
  "sessionId" TEXT NOT NULL REFERENCES "access_sessions"("id") ON DELETE CASCADE,
  "documentId" TEXT NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  PRIMARY KEY ("sessionId", "documentId")
);

CREATE TABLE "access_policies" (
  "sessionId" TEXT PRIMARY KEY REFERENCES "access_sessions"("id") ON DELETE CASCADE,
  "canView" BOOLEAN NOT NULL DEFAULT true,
  "canDownload" BOOLEAN NOT NULL DEFAULT false,
  "canPrint" BOOLEAN NOT NULL DEFAULT false,
  "printCopyLimit" INTEGER,
  "downloadLimit" INTEGER,
  "allowResharing" BOOLEAN NOT NULL DEFAULT false,
  "watermarkEnabled" BOOLEAN NOT NULL DEFAULT true,
  "requirePin" BOOLEAN NOT NULL DEFAULT false,
  "requireManualApproval" BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE "access_events" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL REFERENCES "access_sessions"("id") ON DELETE CASCADE,
  "documentId" TEXT REFERENCES "documents"("id") ON DELETE SET NULL,
  "type" "AccessEventType" NOT NULL,
  "actorLabel" TEXT NOT NULL DEFAULT 'Guest',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "access_events_sessionId_createdAt_idx" ON "access_events"("sessionId", "createdAt");

CREATE TABLE "print_jobs" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL REFERENCES "access_sessions"("id") ON DELETE CASCADE,
  "paperSize" TEXT NOT NULL DEFAULT 'A4',
  "color" BOOLEAN NOT NULL DEFAULT false,
  "copies" INTEGER NOT NULL DEFAULT 1,
  "pageRange" TEXT,
  "status" "PrintJobStatus" NOT NULL DEFAULT 'QUEUED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3)
);

CREATE TABLE "notifications" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
