import { prisma } from "./prisma";
import { recordEvent } from "./audit";
import { generateGuestToken, generateSessionCode, hashToken } from "./tokens";
import { SessionPurpose } from "@prisma/client";

/**
 * v1 has no distributed job queue (per ARCHITECTURE.md §9 — avoid
 * unnecessary complexity). Instead, expiry is enforced two ways:
 *   1. authorize() always re-checks expiresAt regardless of stored status
 *   2. this sweep runs opportunistically whenever a session is read,
 *      so the *displayed* status stays accurate without a cron process.
 * A real deployment would additionally run this on a schedule so
 * sessions flip even when nobody looks at them.
 */
export async function sweepIfExpired(sessionId: string) {
  const session = await prisma.accessSession.findUnique({ where: { id: sessionId } });
  if (!session) return null;
  const isTerminal = ["COMPLETED", "EXPIRED", "REVOKED", "BLOCKED"].includes(session.status);
  if (!isTerminal && session.expiresAt.getTime() <= Date.now()) {
    await prisma.accessSession.update({ where: { id: sessionId }, data: { status: "EXPIRED" } });
    await recordEvent({ sessionId, type: "SESSION_EXPIRED", actorLabel: "System" });
  }
  return prisma.accessSession.findUnique({
    where: { id: sessionId },
    include: { policy: true, documents: true },
  });
}

export async function getSessionWithScope(sessionId: string) {
  return sweepIfExpired(sessionId);
}

export async function createAccessSession(params: {
  ownerId: string;
  documentIds: string[];
  purpose: SessionPurpose;
  expiresInMinutes: number;
  permissions: {
    canView: boolean;
    canDownload: boolean;
    canPrint: boolean;
    printCopyLimit?: number;
    downloadLimit?: number;
    watermarkEnabled: boolean;
    requirePin: boolean;
    oneTimeUse: boolean;
  };
  pin?: string;
}) {
  const { raw, hash } = generateGuestToken();
  let code = generateSessionCode();

  // Vanishingly unlikely, but guard the unique-code collision anyway.
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.accessSession.findUnique({ where: { code } });
    if (!existing) break;
    code = generateSessionCode();
  }

  const pinHash = params.pin ? hashToken(params.pin) : null;

  const session = await prisma.accessSession.create({
    data: {
      code,
      tokenHash: hash,
      ownerId: params.ownerId,
      purpose: params.purpose,
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + params.expiresInMinutes * 60_000),
      oneTimeUse: params.permissions.oneTimeUse,
      pinHash,
      documents: {
        create: params.documentIds.map((documentId) => ({ documentId })),
      },
      policy: {
        create: {
          canView: params.permissions.canView,
          canDownload: params.permissions.canDownload,
          canPrint: params.permissions.canPrint,
          printCopyLimit: params.permissions.printCopyLimit,
          downloadLimit: params.permissions.downloadLimit,
          watermarkEnabled: params.permissions.watermarkEnabled,
          requirePin: params.permissions.requirePin,
        },
      },
    },
    include: { policy: true, documents: true },
  });

  await recordEvent({ sessionId: session.id, type: "SESSION_CREATED", actorLabel: "Owner" });

  // Raw token is returned once, for embedding in the share link/QR —
  // it is never persisted or logged in plaintext.
  return { session, guestToken: raw };
}

export async function revokeSession(sessionId: string, ownerId: string) {
  const session = await prisma.accessSession.findUnique({ where: { id: sessionId } });
  if (!session || session.ownerId !== ownerId) throw new Error("Not found");
  const updated = await prisma.accessSession.update({
    where: { id: sessionId },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
  await recordEvent({ sessionId, type: "ACCESS_REVOKED", actorLabel: "Owner" });
  return updated;
}
