import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(envVar: string): Buffer {
  const hex = process.env[envVar];
  if (!hex || hex.length < 32) {
    throw new Error(`${envVar} must be a hex string of at least 32 chars (16 bytes). Got ${hex?.length ?? 0}.`);
  }
  return Buffer.from(hex.slice(0, 64).padEnd(64, "0"), "hex");
}

/** AES-256-GCM encrypt. Returns `iv_hex:tag_hex:ciphertext_hex`. */
export function encrypt(plaintext: string, keyEnv: string): string {
  const key = getKey(keyEnv);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

/** AES-256-GCM decrypt from the `iv:tag:ciphertext` hex format. */
export function decrypt(blob: string, keyEnv: string): string {
  const key = getKey(keyEnv);
  const [ivHex, tagHex, ctHex] = blob.split(":");
  if (!ivHex || !tagHex || !ctHex) throw new Error("Invalid encrypted blob format");
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(ctHex, "hex")), decipher.final()]).toString("utf8");
}
