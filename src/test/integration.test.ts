import { describe, it, expect } from 'vitest';
import {
  sha256,
  hex32,
  encryptFile,
  decryptFile,
  packEncryptedFile,
  unpackEncryptedFile,
} from '../utils/crypto';

describe('Integration Tests - Full Workflow', () => {
  const testPassword = 'SecureTestPassword123!@#';

  describe('Complete File Encryption and Verification Workflow', () => {
    it('should simulate the full user workflow', async () => {
      // Step 1: User creates a file
      const encoder = new TextEncoder();
      const originalContent = 'Important document content that needs proof of existence';
      const fileBuffer = encoder.encode(originalContent).buffer;

      // Step 2: Calculate hash (for blockchain registration)
      const originalHash = await sha256(fileBuffer);
      const hashForBlockchain = hex32(originalHash);

      expect(hashForBlockchain).toMatch(/^0x[0-9a-f]{64}$/);

      // Step 3: Encrypt the file
      const { encrypted, iv, salt } = await encryptFile(fileBuffer, testPassword);

      // Step 4: Pack encrypted file for download
      const encryptedBlob = packEncryptedFile(encrypted, iv, salt);

      // Verify .enc file format
      expect(encryptedBlob.size).toBe(16 + 12 + encrypted.byteLength);

      // Step 5: Simulate user downloading and re-uploading .enc file
      const encryptedArrayBuffer = await encryptedBlob.arrayBuffer();

      // Step 6: Unpack the encrypted file
      const { encrypted: unpackedEncrypted, iv: unpackedIv, salt: unpackedSalt } =
        unpackEncryptedFile(encryptedArrayBuffer);

      // Step 7: Decrypt the file
      const decryptedBuffer = await decryptFile(
        unpackedEncrypted,
        unpackedIv,
        unpackedSalt,
        testPassword
      );

      // Step 8: Verify decrypted content matches original
      const decoder = new TextDecoder();
      const decryptedContent = decoder.decode(decryptedBuffer);

      expect(decryptedContent).toBe(originalContent);

      // Step 9: Verify hash matches (for blockchain verification)
      const decryptedHash = await sha256(decryptedBuffer);
      const verificationHash = hex32(decryptedHash);

      expect(verificationHash).toBe(hashForBlockchain);
    });

    it('should handle multiple files with different passwords', async () => {
      const encoder = new TextEncoder();
      const files = [
        { content: 'File 1 content', password: 'password1' },
        { content: 'File 2 content', password: 'password2' },
        { content: 'File 3 content', password: 'password3' },
      ];

      const results = [];

      // Encrypt all files
      for (const file of files) {
        const buffer = encoder.encode(file.content).buffer;
        const hash = hex32(await sha256(buffer));
        const encrypted = await encryptFile(buffer, file.password);

        results.push({
          originalContent: file.content,
          password: file.password,
          hash,
          encrypted,
        });
      }

      // Verify each file independently
      const decoder = new TextDecoder();
      for (const result of results) {
        const decrypted = await decryptFile(
          result.encrypted.encrypted,
          result.encrypted.iv,
          result.encrypted.salt,
          result.password
        );

        const content = decoder.decode(decrypted);
        expect(content).toBe(result.originalContent);

        const verifyHash = hex32(await sha256(decrypted));
        expect(verifyHash).toBe(result.hash);
      }
    });

    it('should verify file existence simulation', async () => {
      const encoder = new TextEncoder();
      const content = 'Test file for existence verification';
      const buffer = encoder.encode(content).buffer;

      // Calculate hash (this would be stored on blockchain)
      const fileHash = hex32(await sha256(buffer));

      // Simulate blockchain storage
      const blockchainStorage = new Map<string, boolean>();
      blockchainStorage.set(fileHash, true);

      // Later verification: User uploads same file
      const verificationBuffer = encoder.encode(content).buffer;
      const verificationHash = hex32(await sha256(verificationBuffer));

      // Check if exists on "blockchain"
      const exists = blockchainStorage.has(verificationHash);
      expect(exists).toBe(true);

      // Try with different content
      const differentBuffer = encoder.encode('Different content').buffer;
      const differentHash = hex32(await sha256(differentBuffer));
      const notExists = blockchainStorage.has(differentHash);
      expect(notExists).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    it('should handle encryption in reasonable time (< 1 second)', async () => {
      const encoder = new TextEncoder();
      const content = 'x'.repeat(1024 * 100); // 100KB
      const buffer = encoder.encode(content).buffer;

      const start = performance.now();
      await encryptFile(buffer, testPassword);
      const end = performance.now();

      const duration = end - start;
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should handle hash calculation quickly', async () => {
      const encoder = new TextEncoder();
      const content = 'x'.repeat(1024 * 100); // 100KB
      const buffer = encoder.encode(content).buffer;

      const start = performance.now();
      await sha256(buffer);
      const end = performance.now();

      const duration = end - start;
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted encrypted file', async () => {
      const encoder = new TextEncoder();
      const buffer = encoder.encode('test content').buffer;
      const { encrypted, iv, salt } = await encryptFile(buffer, testPassword);

      // Corrupt the encrypted data
      const corruptedEncrypted = new Uint8Array(encrypted.byteLength);
      crypto.getRandomValues(corruptedEncrypted);

      // Should throw error when decrypting corrupted data
      await expect(
        decryptFile(corruptedEncrypted, iv, salt, testPassword)
      ).rejects.toThrow();
    });

    it('should handle invalid password gracefully', async () => {
      const encoder = new TextEncoder();
      const buffer = encoder.encode('secret content').buffer;
      const { encrypted, iv, salt } = await encryptFile(buffer, 'correct-password');

      await expect(
        decryptFile(encrypted, iv, salt, 'wrong-password')
      ).rejects.toThrow();
    });

    it('should handle tampered IV', async () => {
      const encoder = new TextEncoder();
      const buffer = encoder.encode('test').buffer;
      const { encrypted, salt } = await encryptFile(buffer, testPassword);

      // Create tampered IV
      const tamperedIv = new Uint8Array(12);
      crypto.getRandomValues(tamperedIv);

      await expect(
        decryptFile(encrypted, tamperedIv, salt, testPassword)
      ).rejects.toThrow();
    });

    it('should handle tampered salt', async () => {
      const encoder = new TextEncoder();
      const buffer = encoder.encode('test').buffer;
      const { encrypted, iv } = await encryptFile(buffer, testPassword);

      // Create tampered salt
      const tamperedSalt = new Uint8Array(16);
      crypto.getRandomValues(tamperedSalt);

      await expect(
        decryptFile(encrypted, iv, tamperedSalt, testPassword)
      ).rejects.toThrow();
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data integrity through multiple pack/unpack cycles', async () => {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const originalContent = 'Critical data that must not be corrupted';
      const buffer = encoder.encode(originalContent).buffer;

      let result = await encryptFile(buffer, testPassword);

      // Perform 5 pack/unpack cycles
      for (let i = 0; i < 5; i++) {
        const packed = packEncryptedFile(result.encrypted, result.iv, result.salt);
        const arrayBuffer = await packed.arrayBuffer();
        result = unpackEncryptedFile(arrayBuffer);
      }

      // Decrypt final result
      const decrypted = await decryptFile(
        result.encrypted,
        result.iv,
        result.salt,
        testPassword
      );

      const finalContent = decoder.decode(decrypted);
      expect(finalContent).toBe(originalContent);
    });

    it('should produce consistent hashes', async () => {
      const encoder = new TextEncoder();
      const content = 'Consistent content';
      const buffer = encoder.encode(content).buffer;

      const hashes = [];
      for (let i = 0; i < 10; i++) {
        const hash = hex32(await sha256(buffer));
        hashes.push(hash);
      }

      // All hashes should be identical
      const firstHash = hashes[0];
      hashes.forEach((hash) => {
        expect(hash).toBe(firstHash);
      });
    });
  });
});
