// server/_core/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY ?? "";
  if (hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be set to 64 hex characters (32 bytes). " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts a plaintext string. Returns "ivHex:authTagHex:ciphertextHex".
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Decrypts a value produced by `encrypt()`.
 */
export function decrypt(stored: string): string {
  const key = getKey();
  const parts = stored.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value format");
  }
  const [ivHex, tagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
