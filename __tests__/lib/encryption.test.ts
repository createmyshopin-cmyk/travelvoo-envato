import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt } from "@/lib/encryption";

const TEST_KEY_ENV = "TEST_ENCRYPTION_KEY";

beforeAll(() => {
  // Set a 64-char hex key for testing (32 bytes)
  process.env[TEST_KEY_ENV] = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
});

describe("encryption", () => {
  it("encrypts and decrypts a string", () => {
    const plain = "my_super_secret_token_123";
    const cipher = encrypt(plain, TEST_KEY_ENV);

    expect(cipher).not.toBe(plain);
    expect(cipher.split(":")).toHaveLength(3);

    const result = decrypt(cipher, TEST_KEY_ENV);
    expect(result).toBe(plain);
  });

  it("produces different ciphertext for same plaintext (random IV)", () => {
    const plain = "same_text";
    const a = encrypt(plain, TEST_KEY_ENV);
    const b = encrypt(plain, TEST_KEY_ENV);
    expect(a).not.toBe(b);

    expect(decrypt(a, TEST_KEY_ENV)).toBe(plain);
    expect(decrypt(b, TEST_KEY_ENV)).toBe(plain);
  });

  it("throws on invalid blob format", () => {
    expect(() => decrypt("not_valid", TEST_KEY_ENV)).toThrow();
  });

  it("throws when key env is missing", () => {
    expect(() => encrypt("test", "MISSING_KEY_VAR")).toThrow();
  });
});
