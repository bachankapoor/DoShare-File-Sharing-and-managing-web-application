import { AccessSession, AccessPolicy, AccessSessionDocument } from "@prisma/client";

export type PolicyAction = "VIEW" | "DOWNLOAD" | "PRINT";

export type PolicyDecision = "ALLOW" | "DENY" | "REQUIRE_VERIFICATION" | "EXPIRED" | "REVOKED";

type SessionWithPolicy = AccessSession & {
  policy: AccessPolicy | null;
  documents: AccessSessionDocument[];
};

/**
 * The single choke point for "can this actor do this action on this
 * document, right now?" Every route — owner UI, guest page, print
 * workflow — must call through here instead of re-implementing checks.
 * See ARCHITECTURE.md §7 and SECURITY.md §3.
 */
export function authorize(params: {
  session: SessionWithPolicy;
  documentId: string;
  action: PolicyAction;
  pinVerified: boolean;
}): PolicyDecision {
  const { session, documentId, action, pinVerified } = params;

  if (session.status === "REVOKED") return "REVOKED";
  if (session.status === "EXPIRED") return "EXPIRED";
  if (session.status === "BLOCKED") return "DENY";
  if (session.expiresAt.getTime() <= Date.now()) return "EXPIRED";

  const inScope = session.documents.some((d) => d.documentId === documentId);
  if (!inScope) return "DENY";

  if (!session.policy) return "DENY";

  if (session.policy.requirePin && !pinVerified) return "REQUIRE_VERIFICATION";

  if (session.oneTimeUse && session.useCount >= 1) return "DENY";
  if (session.maxUses != null && session.useCount >= session.maxUses) return "DENY";

  switch (action) {
    case "VIEW":
      return session.policy.canView ? "ALLOW" : "DENY";
    case "DOWNLOAD":
      return session.policy.canDownload ? "ALLOW" : "DENY";
    case "PRINT":
      return session.policy.canPrint ? "ALLOW" : "DENY";
    default:
      return "DENY";
  }
}
