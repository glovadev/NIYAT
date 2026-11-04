import crypto from "crypto";

/**
 * Generates a secure salt and PBKDF2 hash of a password string.
 * Output format: "<hex_salt>:<hex_hash>"
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a plain text password against a stored "<hex_salt>:<hex_hash>".
 */
export function verifyPassword(password: string, combinedHash: string): boolean {
  if (!combinedHash || !combinedHash.includes(":")) return false;
  const [salt, storedHash] = combinedHash.split(":");
  if (!salt || !storedHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(hash, "hex"));
}

