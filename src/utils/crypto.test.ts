import { describe, it, expect, beforeAll } from 'vitest';
import {
  sha256,
  hex32,
  deriveAesKey,
  encryptFile,
  decryptFile,
  packEncryptedFile,
  unpackEncryptedFile,
} from './crypto';

describe('Crypto Utils', () => {
  let testData: ArrayBuffer;
  let testPassword: string;

  beforeAll(() => {
    // Setup test data
    const encoder = new TextEncoder();
    testData = encoder.encode('Hello, EternLink!').buffer;
    testPassword = 'test-password-123';
  });

  describe('SHA-256 Hashing', () => {
    it('should generate consistent SHA-256 hash for same input', async () => {
      const hash1 = await sha256(testData);
      const hash2 = await sha256(testData);

      expect(hash1).toEqual(hash2);
      expect(hash1.byteLength).toBe(32); // SHA-256 produces 32 bytes
    });

    it('should generate different hashes for different inputs', async () => {
      const encoder = new TextEncoder();
      const data1 = encoder.encode('data1').buffer;
      const data2 = encoder.encode('data2').buffer;

      const hash1 = await sha256(data1);
      const hash2 = await sha256(data2);

      expect(hash1).not.toEqual(hash2);
    });

    it('should convert hash to 32-byte hex string', async () => {
      const hash = await sha256(testData);
      const hexHash = hex32(hash);

      expect(hexHash).toMatch(/^0x[0-9a-f]{64}$/); // 0x + 64 hex chars = 32 bytes
    });
  });

  describe('Key Derivation (PBKDF2)', () => {
    it('should derive AES key from password and salt', async () => {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const key = await deriveAesKey(testPassword, salt);

      expect(key).toBeInstanceOf(CryptoKey);
      expect(key.type).toBe('secret');
      expect(key.algorithm.name).toBe('AES-GCM');
    });

    it('should generate same key with same password and salt', async () => {
      const salt = crypto.getRandomValues(new Uint8Array(16));

      const key1 = await deriveAesKey(testPassword, salt);
      const key2 = await deriveAesKey(testPassword, salt);

      // Export keys to compare
      const exported1 = await crypto.subtle.exportKey('raw', key1);
      const exported2 = await crypto.subtle.exportKey('raw', key2);

      expect(new Uint8Array(exported1)).toEqual(new Uint8Array(exported2));
    });

    it('should generate different keys with different salts', async () => {
      const salt1 = crypto.getRandomValues(new Uint8Array(16));
      const salt2 = crypto.getRandomValues(new Uint8Array(16));

      const key1 = await deriveAesKey(testPassword, salt1);
      const key2 = await deriveAesKey(testPassword, salt2);

      const exported1 = await crypto.subtle.exportKey('raw', key1);
      const exported2 = await crypto.subtle.exportKey('raw', key2);

      expect(new Uint8Array(exported1)).not.toEqual(new Uint8Array(exported2));
    });
  });

  describe('File Encryption/Decryption', () => {
    it('should encrypt and decrypt file successfully', async () => {
      // Encrypt
      const { encrypted, iv, salt } = await encryptFile(testData, testPassword);

      expect(encrypted).toBeInstanceOf(ArrayBuffer);
      expect(iv).toBeInstanceOf(Uint8Array);
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(iv.length).toBe(12); // AES-GCM IV is 12 bytes
      expect(salt.length).toBe(16); // Salt is 16 bytes

      // Decrypt
      const decrypted = await decryptFile(encrypted, iv, salt, testPassword);

      // Verify decrypted data matches original
      const originalArray = new Uint8Array(testData);
      const decryptedArray = new Uint8Array(decrypted);

      expect(decryptedArray).toEqual(originalArray);
    });

    it('should fail decryption with wrong password', async () => {
      const { encrypted, iv, salt } = await encryptFile(testData, testPassword);

      await expect(
        decryptFile(encrypted, iv, salt, 'wrong-password')
      ).rejects.toThrow();
    });

    it('should produce different encrypted output each time', async () => {
      const result1 = await encryptFile(testData, testPassword);
      const result2 = await encryptFile(testData, testPassword);

      // Different salt and IV should produce different encrypted data
      expect(result1.salt).not.toEqual(result2.salt);
      expect(result1.iv).not.toEqual(result2.iv);
      expect(new Uint8Array(result1.encrypted)).not.toEqual(
        new Uint8Array(result2.encrypted)
      );
    });
  });

  describe('File Packing/Unpacking', () => {
    it('should pack and unpack encrypted file correctly', async () => {
      const { encrypted, iv, salt } = await encryptFile(testData, testPassword);

      // Pack
      const packed = packEncryptedFile(encrypted, iv, salt);
      expect(packed).toBeInstanceOf(Blob);

      // Convert Blob to ArrayBuffer for unpacking
      const arrayBuffer = await packed.arrayBuffer();

      // Unpack
      const unpacked = unpackEncryptedFile(arrayBuffer);

      expect(unpacked.salt).toEqual(salt);
      expect(unpacked.iv).toEqual(iv);
      expect(new Uint8Array(unpacked.encrypted)).toEqual(
        new Uint8Array(encrypted)
      );
    });

    it('should maintain data integrity through pack/unpack cycle', async () => {
      // Original encryption
      const { encrypted, iv, salt } = await encryptFile(testData, testPassword);

      // Pack
      const packed = packEncryptedFile(encrypted, iv, salt);
      const arrayBuffer = await packed.arrayBuffer();

      // Unpack
      const unpacked = unpackEncryptedFile(arrayBuffer);

      // Decrypt with unpacked data
      const decrypted = await decryptFile(
        unpacked.encrypted,
        unpacked.iv,
        unpacked.salt,
        testPassword
      );

      // Verify original data
      expect(new Uint8Array(decrypted)).toEqual(new Uint8Array(testData));
    });

    it('should have correct file format (salt + iv + encrypted)', async () => {
      const { encrypted, iv, salt } = await encryptFile(testData, testPassword);
      const packed = packEncryptedFile(encrypted, iv, salt);

      // Expected size: 16 (salt) + 12 (iv) + encrypted.byteLength
      const expectedSize = 16 + 12 + encrypted.byteLength;
      expect(packed.size).toBe(expectedSize);
    });
  });

  describe('End-to-End Encryption Flow', () => {
    it('should complete full encryption and decryption cycle', async () => {
      const originalText = 'This is a test file for EternLink encryption';
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const originalData = encoder.encode(originalText).buffer;

      // 1. Calculate hash before encryption
      const originalHash = await sha256(originalData);
      const hashHex = hex32(originalHash);

      // 2. Encrypt
      const { encrypted, iv, salt } = await encryptFile(
        originalData,
        testPassword
      );

      // 3. Pack (simulate download)
      const packed = packEncryptedFile(encrypted, iv, salt);

      // 4. Unpack (simulate upload)
      const arrayBuffer = await packed.arrayBuffer();
      const unpacked = unpackEncryptedFile(arrayBuffer);

      // 5. Decrypt
      const decrypted = await decryptFile(
        unpacked.encrypted,
        unpacked.iv,
        unpacked.salt,
        testPassword
      );

      // 6. Verify hash matches
      const decryptedHash = await sha256(decrypted);
      const decryptedHashHex = hex32(decryptedHash);

      expect(decryptedHashHex).toBe(hashHex);

      // 7. Verify content matches
      const decryptedText = decoder.decode(decrypted);
      expect(decryptedText).toBe(originalText);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file', async () => {
      const emptyData = new ArrayBuffer(0);
      const { encrypted, iv, salt } = await encryptFile(emptyData, testPassword);

      const decrypted = await decryptFile(encrypted, iv, salt, testPassword);
      expect(decrypted.byteLength).toBe(0);
    });

    it('should handle large file (1MB)', async () => {
      const largeData = new ArrayBuffer(1024 * 1024); // 1MB
      const view = new Uint8Array(largeData);
      // Fill with random data
      crypto.getRandomValues(view);

      const { encrypted, iv, salt } = await encryptFile(largeData, testPassword);
      const decrypted = await decryptFile(encrypted, iv, salt, testPassword);

      expect(new Uint8Array(decrypted)).toEqual(view);
    });

    it('should handle special characters in password', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const { encrypted, iv, salt } = await encryptFile(testData, specialPassword);
      const decrypted = await decryptFile(encrypted, iv, salt, specialPassword);

      expect(new Uint8Array(decrypted)).toEqual(new Uint8Array(testData));
    });

    it('should handle Unicode characters in data', async () => {
      const encoder = new TextEncoder();
      const unicodeText = '你好世界 🌍 مرحبا בעולם';
      const unicodeData = encoder.encode(unicodeText).buffer;

      const { encrypted, iv, salt } = await encryptFile(
        unicodeData,
        testPassword
      );
      const decrypted = await decryptFile(encrypted, iv, salt, testPassword);

      const decoder = new TextDecoder();
      const decryptedText = decoder.decode(decrypted);

      expect(decryptedText).toBe(unicodeText);
    });
  });
});
