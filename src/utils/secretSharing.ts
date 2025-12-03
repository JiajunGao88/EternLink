/**
 * Shamir's Secret Sharing Utility
 *
 * Splits AES keys into multiple shares using Shamir's Secret Sharing scheme.
 * Threshold: 2/3 (any 2 shares can reconstruct the original key)
 *
 * Security Properties:
 * - Share 1: User keeps (device/paper backup)
 * - Share 2: Given to beneficiary (offline/paper/QR code)
 * - Share 3: Stored on blockchain
 *
 * Single share alone reveals ZERO information about the key.
 */

// Declare global secrets variable (loaded from HTML script tag)
// secrets.js is loaded globally via script tag in index.html
declare const secrets: {
  str2hex: (str: string) => string;
  hex2str: (hex: string) => string;
  share: (secret: string, numShares: number, threshold: number) => string[];
  combine: (shares: string[]) => string;
  random: (bits: number) => string;
};

/**
 * Share distribution model for AES key
 */
export interface KeyShares {
  shareOne: string;    // User keeps (device/paper)
  shareTwo: string;    // Beneficiary gets (offline/QR)
  shareThree: string;  // Stored on blockchain
}

/**
 * Legacy: Share distribution model for passwords
 */
export interface PasswordShares {
  shareOne: string;    // User keeps (device)
  shareTwo: string;    // Beneficiary gets (offline)
  shareThree: string;  // Embedded in .enc file
}

/**
 * Split an AES-256 key into 3 shares (threshold: 2)
 * 
 * @param keyHex - 64-character hex string (256-bit AES key)
 * @returns Object containing 3 shares
 *
 * @example
 * const shares = splitKey("a1b2c3d4..."); // 64 hex chars
 * // shares.shareOne = "801abc..." (hex string)
 * // shares.shareTwo = "802def..." (hex string)
 * // shares.shareThree = "803ghi..." (hex string)
 */
export function splitKey(keyHex: string): KeyShares {
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('Key must be exactly 64 hex characters (256 bits)');
  }

  // Validate hex format
  if (!/^[0-9a-fA-F]+$/.test(keyHex)) {
    throw new Error('Key must be a valid hex string');
  }

  // Generate 3 shares with threshold of 2
  // secrets.js works with hex strings directly
  const shares = secrets.share(keyHex, 3, 2);

  if (shares.length !== 3) {
    throw new Error('Failed to generate exactly 3 shares');
  }

  return {
    shareOne: shares[0],
    shareTwo: shares[1],
    shareThree: shares[2]
  };
}

/**
 * Reconstruct AES key from any 2 shares
 *
 * @param shareA - First share (hex string)
 * @param shareB - Second share (hex string)
 * @returns Original 64-character hex key
 */
export function reconstructKey(shareA: string, shareB: string): string {
  if (!shareA || !shareB) {
    throw new Error('Both shares are required for reconstruction');
  }

  // Validate share format
  if (!isValidShare(shareA) || !isValidShare(shareB)) {
    throw new Error('Invalid share format');
  }

  try {
    // Combine the two shares
    const keyHex = secrets.combine([shareA, shareB]);
    return keyHex;
  } catch (error) {
    throw new Error('Failed to reconstruct key: ' + (error as Error).message);
  }
}

/**
 * Legacy: Split a password into 3 shares (threshold: 2)
 *
 * @param password - Master password to split
 * @returns Object containing 3 shares
 *
 * @example
 * const shares = splitPassword("MySecurePassword123!");
 * // shares.shareOne = "801abc..." (hex string)
 * // shares.shareTwo = "802def..." (hex string)
 * // shares.shareThree = "803ghi..." (hex string)
 */
export function splitPassword(password: string): PasswordShares {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // Convert password to hex string
  const passwordHex = secrets.str2hex(password);

  // Generate 3 shares with threshold of 2
  // This means any 2 shares can reconstruct the password
  const shares = secrets.share(passwordHex, 3, 2);

  if (shares.length !== 3) {
    throw new Error('Failed to generate exactly 3 shares');
  }

  return {
    shareOne: shares[0],
    shareTwo: shares[1],
    shareThree: shares[2]
  };
}

/**
 * Reconstruct password from any 2 shares
 *
 * @param shareA - First share (hex string)
 * @param shareB - Second share (hex string)
 * @returns Original password
 *
 * @example
 * const password = reconstructPassword(shares.shareOne, shares.shareThree);
 * // password = "MySecurePassword123!"
 */
export function reconstructPassword(shareA: string, shareB: string): string {
  if (!shareA || !shareB) {
    throw new Error('Both shares are required for reconstruction');
  }

  // Validate share format (should be hex strings starting with "80X")
  if (!isValidShare(shareA) || !isValidShare(shareB)) {
    throw new Error('Invalid share format');
  }

  try {
    // Combine the two shares
    const combined = secrets.combine([shareA, shareB]);

    // Convert hex back to string
    const password = secrets.hex2str(combined);

    return password;
  } catch (error) {
    throw new Error('Failed to reconstruct password: ' + (error as Error).message);
  }
}

/**
 * Validate share format
 *
 * @param share - Share to validate
 * @returns True if valid share format
 */
export function isValidShare(share: string): boolean {
  // Valid share should be a hex string starting with "80X" where X is 1-3
  const sharePattern = /^80[1-3][0-9a-f]+$/i;
  return sharePattern.test(share);
}

/**
 * Store Share 1 in browser localStorage
 *
 * @param fileHash - File hash as identifier
 * @param shareOne - Share 1 to store
 */
export function storeShareOne(fileHash: string, shareOne: string): void {
  if (!fileHash || !shareOne) {
    throw new Error('File hash and share are required');
  }

  const key = `eternlink_share1_${fileHash}`;

  try {
    localStorage.setItem(key, shareOne);
  } catch (error) {
    throw new Error('Failed to store share in localStorage: ' + (error as Error).message);
  }
}

/**
 * Retrieve Share 1 from browser localStorage
 *
 * @param fileHash - File hash as identifier
 * @returns Share 1 or null if not found
 */
export function retrieveShareOne(fileHash: string): string | null {
  if (!fileHash) {
    throw new Error('File hash is required');
  }

  const key = `eternlink_share1_${fileHash}`;

  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error('Failed to retrieve share from localStorage:', error);
    return null;
  }
}

/**
 * Delete Share 1 from localStorage
 *
 * @param fileHash - File hash as identifier
 */
export function deleteShareOne(fileHash: string): void {
  if (!fileHash) {
    throw new Error('File hash is required');
  }

  const key = `eternlink_share1_${fileHash}`;

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to delete share from localStorage:', error);
  }
}

/**
 * List all stored Share 1 keys
 *
 * @returns Array of file hashes that have stored shares
 */
export function listStoredShares(): string[] {
  const prefix = 'eternlink_share1_';
  const shares: string[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        shares.push(key.replace(prefix, ''));
      }
    }
  } catch (error) {
    console.error('Failed to list shares:', error);
  }

  return shares;
}

/**
 * Generate a QR code-friendly format for Share 2
 *
 * This formats the share for easy QR code generation and paper backup.
 *
 * @param shareTwo - Share 2 hex string
 * @param fileHash - File hash for identification
 * @returns Formatted string for QR code
 *
 * @example
 * const qrData = formatShareForQRCode(shares.shareTwo, "0xabc123...");
 * // Returns: "ETERNLINK:802def...:0xabc123..."
 */
export function formatShareForQRCode(shareTwo: string, fileHash: string): string {
  if (!shareTwo || !fileHash) {
    throw new Error('Share and file hash are required');
  }

  return `ETERNLINK:${shareTwo}:${fileHash}`;
}

/**
 * Parse QR code data back into share and file hash
 *
 * @param qrData - QR code data string
 * @returns Object with share and file hash
 */
export function parseQRCodeData(qrData: string): { share: string; fileHash: string } {
  const parts = qrData.split(':');

  if (parts.length !== 3 || parts[0] !== 'ETERNLINK') {
    throw new Error('Invalid QR code format');
  }

  return {
    share: parts[1],
    fileHash: parts[2]
  };
}

/**
 * Encrypt Share 3 for storage in file metadata
 *
 * For now, we'll store it as base64. In production, you might want
 * additional encryption here.
 *
 * @param shareThree - Share 3 to encrypt
 * @returns Base64 encoded share
 */
export function encryptShareThree(shareThree: string): string {
  if (!shareThree) {
    throw new Error('Share is required');
  }

  // Convert to base64 for storage
  return btoa(shareThree);
}

/**
 * Decrypt Share 3 from file metadata
 *
 * @param encryptedShare - Base64 encoded share
 * @returns Original share
 */
export function decryptShareThree(encryptedShare: string): string {
  if (!encryptedShare) {
    throw new Error('Encrypted share is required');
  }

  try {
    return atob(encryptedShare);
  } catch (error) {
    throw new Error('Failed to decrypt share: ' + (error as Error).message);
  }
}

/**
 * Test if reconstruction works correctly
 *
 * This is a utility function for testing purposes.
 *
 * @param password - Password to test
 * @returns True if split and reconstruction works
 */
export function testSecretSharing(password: string): boolean {
  try {
    const shares = splitPassword(password);

    // Test all combinations
    const reconstructed1 = reconstructPassword(shares.shareOne, shares.shareTwo);
    const reconstructed2 = reconstructPassword(shares.shareOne, shares.shareThree);
    const reconstructed3 = reconstructPassword(shares.shareTwo, shares.shareThree);

    return (
      reconstructed1 === password &&
      reconstructed2 === password &&
      reconstructed3 === password
    );
  } catch (error) {
    console.error('Secret sharing test failed:', error);
    return false;
  }
}

/**
 * Generate a printable share card for beneficiaries
 *
 * @param shareTwo - Share 2 hex string
 * @param beneficiaryName - Name of beneficiary
 * @param fileHash - File hash
 * @returns HTML string for printing
 */
export function generatePrintableShareCard(
  shareTwo: string,
  beneficiaryName: string,
  fileHash: string
): string {
  const qrData = formatShareForQRCode(shareTwo, fileHash);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>EternLink Recovery Share</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          max-width: 600px;
          margin: 40px auto;
          padding: 20px;
          border: 2px solid #0a1628;
        }
        h1 {
          color: #0a1628;
          text-align: center;
        }
        .warning {
          background: #fff3cd;
          border: 1px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .share-box {
          background: #f8f9fa;
          padding: 15px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          word-break: break-all;
          font-size: 12px;
        }
        .qr-placeholder {
          text-align: center;
          margin: 20px 0;
          padding: 20px;
          border: 2px dashed #6c757d;
        }
        .instructions {
          margin-top: 30px;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <h1>🔐 EternLink Recovery Share</h1>

      <p><strong>Beneficiary:</strong> ${beneficiaryName}</p>
      <p><strong>Generated:</strong> ${new Date().toISOString()}</p>

      <div class="warning">
        <strong>⚠️ IMPORTANT</strong><br>
        Keep this card in a secure location. This share alone cannot access the encrypted file.
        You will need BOTH this share AND Share 3 (sent via email) to recover the asset.
      </div>

      <h2>Your Recovery Share (Part 2)</h2>
      <div class="share-box">
        ${shareTwo}
      </div>

      <h2>QR Code</h2>
      <div class="qr-placeholder">
        [QR Code will be generated here]<br>
        Data: ${qrData}
      </div>

      <h2>File Hash</h2>
      <div class="share-box">
        ${fileHash}
      </div>

      <div class="instructions">
        <h2>Recovery Instructions</h2>
        <ol>
          <li>Wait for recovery notification email from EternLink</li>
          <li>Email will contain Share 3 and encrypted file download link</li>
          <li>Visit recovery portal: https://eternlink.io/recovery</li>
          <li>Upload encrypted file</li>
          <li>Enter this share (Part 2) and Share 3 (from email)</li>
          <li>System will decrypt and display the seed phrase</li>
        </ol>

        <p><strong>Questions?</strong> Contact support@eternlink.io</p>
      </div>
    </body>
    </html>
  `;
}
