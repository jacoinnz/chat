import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required for encrypting API keys. " +
      "Set a 32-byte hex string (64 characters)."
    );
  }
  const buf = Buffer.from(key, "hex");
  if (buf.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY must be a 32-byte hex string (64 hex characters). " +
      `Got ${buf.length} bytes.`
    );
  }
  return buf;
}

/** Encrypt plaintext with AES-256-GCM. Returns `iv:ciphertext:tag` as base64. */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    encrypted.toString("base64"),
    tag.toString("base64"),
  ].join(":");
}

/** Decrypt an `iv:ciphertext:tag` string encrypted with AES-256-GCM. */
export function decrypt(encryptedStr: string): string {
  const key = getEncryptionKey();
  const parts = encryptedStr.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted string format — expected iv:ciphertext:tag");
  }

  const iv = Buffer.from(parts[0], "base64");
  const ciphertext = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");

  if (tag.length !== TAG_LENGTH) {
    throw new Error("Invalid auth tag length");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
