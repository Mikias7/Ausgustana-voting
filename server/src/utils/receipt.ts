import { createHash, randomInt } from "node:crypto";

// Unambiguous alphabet (no 0/O, 1/I/L) so receipts are easy to read back.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Random receipt code like "K7QM-3XRT-P9WD". Only its hash is stored. */
export function generateReceiptCode(): string {
  const chars = Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return chars.match(/.{4}/g)!.join("-");
}

export function hashReceiptCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

/**
 * Canonical form of user-typed input: uppercase, spaces/dashes ignored, regrouped
 * as XXXX-XXXX-XXXX. Returns null when it can't be a receipt code.
 */
export function normalizeReceiptCode(input: string): string | null {
  const raw = input.toUpperCase().replace(/[\s-]/g, "");
  if (raw.length !== 12 || [...raw].some((c) => !ALPHABET.includes(c))) return null;
  return raw.match(/.{4}/g)!.join("-");
}
