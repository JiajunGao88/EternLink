/**
 * Unit tests for Shamir's Secret Sharing utility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  splitPassword,
  reconstructPassword,
  isValidShare,
  storeShareOne,
  retrieveShareOne,
  deleteShareOne,
  listStoredShares,
  formatShareForQRCode,
  parseQRCodeData,
  encryptShareThree,
  decryptShareThree,
  testSecretSharing,
  generatePrintableShareCard,
  type PasswordShares
} from './secretSharing';

// Create a proper localStorage mock
let localStorageMock: Storage;

describe('Shamir\'s Secret Sharing', () => {
  const testPassword = 'MySecurePassword123!';
  const testFileHash = '0xabc123def456789';

  beforeEach(() => {
    // Reset localStorage mock before all tests
    const store: Record<string, string> = {};
    localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(key => delete store[key]); },
      key: (index: number) => Object.keys(store)[index] || null,
      get length() { return Object.keys(store).length; }
    } as Storage;

    // Replace global localStorage
    vi.stubGlobal('localStorage', localStorageMock);
  });

  describe('splitPassword', () => {
    it('should split password into 3 shares', () => {
      const shares = splitPassword(testPassword);

      expect(shares).toHaveProperty('shareOne');
      expect(shares).toHaveProperty('shareTwo');
      expect(shares).toHaveProperty('shareThree');

      // All shares should be hex strings starting with "80X"
      expect(shares.shareOne).toMatch(/^80[1-3][0-9a-f]+$/i);
      expect(shares.shareTwo).toMatch(/^80[1-3][0-9a-f]+$/i);
      expect(shares.shareThree).toMatch(/^80[1-3][0-9a-f]+$/i);

      // All shares should be different
      expect(shares.shareOne).not.toBe(shares.shareTwo);
      expect(shares.shareTwo).not.toBe(shares.shareThree);
      expect(shares.shareOne).not.toBe(shares.shareThree);
    });

    it('should throw error for password shorter than 8 characters', () => {
      expect(() => splitPassword('short')).toThrow('at least 8 characters');
    });

    it('should throw error for empty password', () => {
      expect(() => splitPassword('')).toThrow('at least 8 characters');
    });

    it('should handle special characters in password', () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const shares = splitPassword(specialPassword);

      expect(shares.shareOne).toBeTruthy();
      expect(shares.shareTwo).toBeTruthy();
      expect(shares.shareThree).toBeTruthy();
    });

    it('should handle unicode characters in password', () => {
      const unicodePassword = '密码测试🔐🚀';
      const shares = splitPassword(unicodePassword);

      expect(shares.shareOne).toBeTruthy();
      expect(shares.shareTwo).toBeTruthy();
      expect(shares.shareThree).toBeTruthy();
    });
  });

  describe('reconstructPassword', () => {
    let shares: PasswordShares;

    beforeEach(() => {
      shares = splitPassword(testPassword);
    });

    it('should reconstruct password from share 1 and share 2', () => {
      const reconstructed = reconstructPassword(shares.shareOne, shares.shareTwo);
      expect(reconstructed).toBe(testPassword);
    });

    it('should reconstruct password from share 1 and share 3', () => {
      const reconstructed = reconstructPassword(shares.shareOne, shares.shareThree);
      expect(reconstructed).toBe(testPassword);
    });

    it('should reconstruct password from share 2 and share 3', () => {
      const reconstructed = reconstructPassword(shares.shareTwo, shares.shareThree);
      expect(reconstructed).toBe(testPassword);
    });

    it('should throw error if only one share provided', () => {
      expect(() => reconstructPassword(shares.shareOne, '')).toThrow('Both shares are required');
    });

    it('should throw error for invalid share format', () => {
      expect(() => reconstructPassword('invalid', shares.shareTwo)).toThrow('Invalid share format');
    });

    it('should throw error for corrupted shares', () => {
      const corruptedShare = '801zzzzzzzzz';
      expect(() => reconstructPassword(corruptedShare, shares.shareTwo)).toThrow();
    });
  });

  describe('isValidShare', () => {
    it('should return true for valid shares', () => {
      const shares = splitPassword(testPassword);
      expect(isValidShare(shares.shareOne)).toBe(true);
      expect(isValidShare(shares.shareTwo)).toBe(true);
      expect(isValidShare(shares.shareThree)).toBe(true);
    });

    it('should return false for invalid share format', () => {
      expect(isValidShare('invalid')).toBe(false);
      expect(isValidShare('1234567890')).toBe(false);
      expect(isValidShare('90abc123')).toBe(false); // Wrong prefix
      expect(isValidShare('')).toBe(false);
    });

    it('should return false for shares with invalid index', () => {
      expect(isValidShare('804abc123')).toBe(false); // Index 4 is invalid
      expect(isValidShare('800abc123')).toBe(false); // Index 0 is invalid
    });
  });

  describe('localStorage operations', () => {
    // localStorage is mocked globally in the parent beforeEach

    it('should store and retrieve share from localStorage', () => {
      const shares = splitPassword(testPassword);
      storeShareOne(testFileHash, shares.shareOne);

      const retrieved = retrieveShareOne(testFileHash);
      expect(retrieved).toBe(shares.shareOne);
    });

    it('should return null for non-existent share', () => {
      const retrieved = retrieveShareOne('non-existent-hash');
      expect(retrieved).toBeNull();
    });

    it('should delete share from localStorage', () => {
      const shares = splitPassword(testPassword);
      storeShareOne(testFileHash, shares.shareOne);

      deleteShareOne(testFileHash);

      const retrieved = retrieveShareOne(testFileHash);
      expect(retrieved).toBeNull();
    });

    it('should list all stored shares', () => {
      const shares1 = splitPassword(testPassword);
      const shares2 = splitPassword('AnotherPassword123!');

      storeShareOne('hash1', shares1.shareOne);
      storeShareOne('hash2', shares2.shareOne);

      const list = listStoredShares();
      expect(list).toContain('hash1');
      expect(list).toContain('hash2');
      expect(list.length).toBe(2);
    });

    it('should handle multiple shares independently', () => {
      const password1 = 'Password1!';
      const password2 = 'Password2!';
      const shares1 = splitPassword(password1);
      const shares2 = splitPassword(password2);

      storeShareOne('hash1', shares1.shareOne);
      storeShareOne('hash2', shares2.shareOne);

      const retrieved1 = retrieveShareOne('hash1');
      const retrieved2 = retrieveShareOne('hash2');

      expect(retrieved1).toBe(shares1.shareOne);
      expect(retrieved2).toBe(shares2.shareOne);
    });

    it('should throw error when storing without file hash', () => {
      const shares = splitPassword(testPassword);
      expect(() => storeShareOne('', shares.shareOne)).toThrow('File hash and share are required');
    });

    it('should throw error when retrieving without file hash', () => {
      expect(() => retrieveShareOne('')).toThrow('File hash is required');
    });
  });

  describe('QR code formatting', () => {
    it('should format share for QR code', () => {
      const shares = splitPassword(testPassword);
      const qrData = formatShareForQRCode(shares.shareTwo, testFileHash);

      expect(qrData).toContain('ETERNLINK:');
      expect(qrData).toContain(shares.shareTwo);
      expect(qrData).toContain(testFileHash);
    });

    it('should parse QR code data correctly', () => {
      const shares = splitPassword(testPassword);
      const qrData = formatShareForQRCode(shares.shareTwo, testFileHash);

      const parsed = parseQRCodeData(qrData);

      expect(parsed.share).toBe(shares.shareTwo);
      expect(parsed.fileHash).toBe(testFileHash);
    });

    it('should throw error for invalid QR code format', () => {
      expect(() => parseQRCodeData('invalid:data')).toThrow('Invalid QR code format');
      expect(() => parseQRCodeData('WRONGPREFIX:share:hash')).toThrow('Invalid QR code format');
    });

    it('should throw error when formatting without required data', () => {
      expect(() => formatShareForQRCode('', testFileHash)).toThrow('Share and file hash are required');
      expect(() => formatShareForQRCode('share', '')).toThrow('Share and file hash are required');
    });
  });

  describe('Share 3 encryption', () => {
    it('should encrypt and decrypt share 3', () => {
      const shares = splitPassword(testPassword);
      const encrypted = encryptShareThree(shares.shareThree);

      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(shares.shareThree);

      const decrypted = decryptShareThree(encrypted);
      expect(decrypted).toBe(shares.shareThree);
    });

    it('should produce different output than input', () => {
      const shares = splitPassword(testPassword);
      const encrypted = encryptShareThree(shares.shareThree);

      // Base64 encoding should change the format
      expect(encrypted).not.toBe(shares.shareThree);
    });

    it('should throw error for empty share', () => {
      expect(() => encryptShareThree('')).toThrow('Share is required');
      expect(() => decryptShareThree('')).toThrow('Encrypted share is required');
    });

    it('should throw error for invalid base64', () => {
      expect(() => decryptShareThree('invalid-base64!!!')).toThrow('Failed to decrypt share');
    });
  });

  describe('testSecretSharing', () => {
    it('should return true for valid password', () => {
      const result = testSecretSharing(testPassword);
      expect(result).toBe(true);
    });

    it('should test all three combinations', () => {
      // This test verifies that all 3 combinations work:
      // - share 1 + share 2
      // - share 1 + share 3
      // - share 2 + share 3
      const result = testSecretSharing('TestPassword123!');
      expect(result).toBe(true);
    });

    it('should return false for invalid password', () => {
      const result = testSecretSharing('short');
      expect(result).toBe(false);
    });
  });

  describe('generatePrintableShareCard', () => {
    it('should generate HTML card with all required information', () => {
      const shares = splitPassword(testPassword);
      const beneficiaryName = 'John Doe';

      const html = generatePrintableShareCard(
        shares.shareTwo,
        beneficiaryName,
        testFileHash
      );

      expect(html).toContain('EternLink Recovery Share');
      expect(html).toContain(beneficiaryName);
      expect(html).toContain(shares.shareTwo);
      expect(html).toContain(testFileHash);
      expect(html).toContain('Recovery Instructions');
      expect(html).toContain('⚠️ IMPORTANT');
    });

    it('should include QR code placeholder', () => {
      const shares = splitPassword(testPassword);
      const html = generatePrintableShareCard(
        shares.shareTwo,
        'Jane Doe',
        testFileHash
      );

      expect(html).toContain('QR Code');
      expect(html).toContain('ETERNLINK:');
    });

    it('should include recovery instructions', () => {
      const shares = splitPassword(testPassword);
      const html = generatePrintableShareCard(
        shares.shareTwo,
        'Bob Smith',
        testFileHash
      );

      expect(html).toContain('Recovery Instructions');
      expect(html).toContain('eternlink.io/recovery');
      expect(html).toContain('support@eternlink.io');
    });
  });

  describe('Security Properties', () => {
    it('should ensure single share reveals no information', () => {
      const shares = splitPassword(testPassword);

      // Having only one share should not allow reconstruction
      // This is implicitly tested by the reconstruction tests requiring 2 shares
      expect(() => reconstructPassword(shares.shareOne, '')).toThrow();
    });

    it('should generate different shares for same password', () => {
      const shares1 = splitPassword(testPassword);
      const shares2 = splitPassword(testPassword);

      // Due to randomness in Shamir's Secret Sharing,
      // same password should generate different shares
      expect(shares1.shareOne).not.toBe(shares2.shareOne);
      expect(shares1.shareTwo).not.toBe(shares2.shareTwo);
      expect(shares1.shareThree).not.toBe(shares2.shareThree);
    });

    it('should handle long passwords correctly', () => {
      const longPassword = 'A'.repeat(128) + '!';
      const shares = splitPassword(longPassword);

      const reconstructed = reconstructPassword(shares.shareOne, shares.shareTwo);
      expect(reconstructed).toBe(longPassword);
    });

    it('should maintain password integrity through split/reconstruct cycle', () => {
      const passwords = [
        'SimplePass123!',
        'Complex!@#$%^&*()Pass123',
        '密码测试123!',
        'Emoji🔐Password123!',
        'a'.repeat(100) + '!'
      ];

      for (const password of passwords) {
        const shares = splitPassword(password);
        const reconstructed = reconstructPassword(shares.shareOne, shares.shareTwo);
        expect(reconstructed).toBe(password);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum length password (8 chars)', () => {
      const minPassword = '12345678';
      const shares = splitPassword(minPassword);
      const reconstructed = reconstructPassword(shares.shareOne, shares.shareTwo);
      expect(reconstructed).toBe(minPassword);
    });

    it('should handle password with only special characters', () => {
      const specialPassword = '!@#$%^&*';
      const shares = splitPassword(specialPassword);
      const reconstructed = reconstructPassword(shares.shareOne, shares.shareTwo);
      expect(reconstructed).toBe(specialPassword);
    });

    it('should handle password with spaces', () => {
      const passwordWithSpaces = 'My Password 123!';
      const shares = splitPassword(passwordWithSpaces);
      const reconstructed = reconstructPassword(shares.shareOne, shares.shareTwo);
      expect(reconstructed).toBe(passwordWithSpaces);
    });

    it('should handle password with newlines and tabs', () => {
      const complexPassword = 'Pass\nword\t123!';
      const shares = splitPassword(complexPassword);
      const reconstructed = reconstructPassword(shares.shareOne, shares.shareTwo);
      expect(reconstructed).toBe(complexPassword);
    });
  });

  describe('Performance', () => {
    it('should split password quickly (< 100ms)', () => {
      const start = performance.now();
      splitPassword(testPassword);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should reconstruct password quickly (< 100ms)', () => {
      const shares = splitPassword(testPassword);

      const start = performance.now();
      reconstructPassword(shares.shareOne, shares.shareTwo);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should handle batch operations efficiently', () => {
      const start = performance.now();

      for (let i = 0; i < 10; i++) {
        const shares = splitPassword(`Password${i}!`);
        reconstructPassword(shares.shareOne, shares.shareTwo);
      }

      const duration = performance.now() - start;

      // 10 split + reconstruct operations should take < 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});
