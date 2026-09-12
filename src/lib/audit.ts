import { AccessEventType, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function recordEvent(params: {
  sessionId: string;
  documentId?: string | null;
  type: AccessEventType;
  actorLabel?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.accessEvent.create({
    data: {
      sessionId: params.sessionId,
      documentId: params.documentId ?? null,
      type: params.type,
      actorLabel: params.actorLabel ?? "Guest",
      metadata: params.metadata,
    },
  });
}
