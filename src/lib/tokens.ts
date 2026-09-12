import { randomBytes, createHash } from "crypto";

/**
 * Guests never get a user account — they get a bearer token scoped to
 * exactly one AccessSession. The raw token is shown to the owner once
 * (embedded in the share link/QR); only its hash is ever stored, so a
 * database leak alone can't be used to replay access.
 */
export function generateGuestToken() {
  const raw = randomBytes(32).toString("base64url"); // 256 bits of entropy
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

/** Short human-shareable code, e.g. "X8K4-92". Not itself a credential —
 *  it's a lookup key; the bearer token is the actual capability. */
export function generateSessionCode() {
  const part = (len: number) =>
    Array.from({ length: len }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
  return `${part(4)}-${part(2)}`;
}
