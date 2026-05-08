/**
 * Encryption utilities for API keys
 * Uses AES-256-GCM
 */

import * as crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Key from env or fallback dev key (32 bytes hex = 256 bits)
function getKey(): Buffer {
  const envKey = process.env.CONTENT_ENCRYPTION_KEY;
  if (envKey && envKey.length === 64) {
    return Buffer.from(envKey, "hex");
  }
  // Fallback dev key - MUST be replaced in production
  return crypto.createHash("sha256").update("content-module-dev-key-2025").digest();
}

export function encrypt(plaintext: string): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("hex"),
  };
}

export function decrypt(encrypted: string, ivHex: string): string {
  const iv = Buffer.from(ivHex, "hex");
  const encryptedBuffer = Buffer.from(encrypted, "base64");
  const authTag = encryptedBuffer.slice(-AUTH_TAG_LENGTH);
  const ciphertext = encryptedBuffer.slice(0, -AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}

export function isEncrypted(encrypted: string, iv: string): boolean {
  try {
    decrypt(encrypted, iv);
    return true;
  } catch {
    return false;
  }
}
