import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { config } from '../config/environment';
import crypto from 'crypto';

const BACKUP_CODES_COUNT = 10;

/**
 * Generate backup codes for 2FA recovery
 */
function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
    // Generate 8-character alphanumeric codes
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Hash backup codes for secure storage
 */
function hashBackupCodes(codes: string[]): string {
  // Store hashed backup codes as JSON array
  const hashedCodes = codes.map(code => crypto.createHash('sha256').update(code).digest('hex'));
  return JSON.stringify(hashedCodes);
}

/**
 * Verify a backup code
 */
function verifyBackupCode(code: string, storedHashedCodes: string): { valid: boolean; remainingCodes?: string } {
  const hashedCodes = JSON.parse(storedHashedCodes);
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');

  const index = hashedCodes.indexOf(codeHash);
  if (index === -1) {
    return { valid: false };
  }

  // Remove used code
  hashedCodes.splice(index, 1);
  return {
    valid: true,
    remainingCodes: JSON.stringify(hashedCodes),
  };
}

/**
 * Enable 2FA - Generate secret and QR code
 */
export async function enable2FA(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.twoFactorEnabled) {
      res.status(400).json({ error: '2FA is already enabled' });
      return;
    }

    // Generate 2FA secret
    const secret = speakeasy.generateSecret({
      name: `${config.twoFAIssuer} (${user.email})`,
      issuer: config.twoFAIssuer,
      length: 32,
    });

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Store secret temporarily (not enabled yet until verified)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32,
        twoFactorEnabled: false, // Not enabled until first verification
      },
    });

    logger.info('2FA setup initiated:', { userId, email: user.email });

    res.json({
      message: '2FA secret generated. Please scan the QR code and verify with a code.',
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      manualEntryKey: secret.base32,
    });
  } catch (error) {
    logger.error('Error enabling 2FA:', error);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
}

/**
 * Verify and activate 2FA
 */
export async function verify2FA(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { token } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.twoFactorSecret) {
      res.status(400).json({ error: '2FA setup not initiated. Call enable endpoint first.' });
      return;
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps in either direction
    });

    if (!verified) {
      res.status(401).json({ error: 'Invalid 2FA token' });
      return;
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = hashBackupCodes(backupCodes);

    // Enable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedBackupCodes,
      },
    });

    logger.info('2FA enabled successfully:', { userId, email: user.email });

    res.json({
      message: '2FA enabled successfully',
      backupCodes, // Return plaintext codes ONCE for user to save
      twoFactorEnabled: true,
    });
  } catch (error) {
    logger.error('Error verifying 2FA:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
}

/**
 * Disable 2FA
 */
export async function disable2FA(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { password, token } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.twoFactorEnabled) {
      res.status(400).json({ error: '2FA is not enabled' });
      return;
    }

    // Verify password
    const bcrypt = require('bcrypt');
    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    // Verify 2FA token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret!,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      res.status(401).json({ error: 'Invalid 2FA token' });
      return;
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    });

    logger.info('2FA disabled:', { userId, email: user.email });

    res.json({
      message: '2FA disabled successfully',
      twoFactorEnabled: false,
    });
  } catch (error) {
    logger.error('Error disabling 2FA:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
}

/**
 * Verify 2FA token during login
 */
export async function verify2FALogin(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId, token, backupCode } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled) {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }

    let verified = false;
    let usedBackupCode = false;

    // Try backup code first if provided
    if (backupCode && user.twoFactorBackupCodes) {
      const backupResult = verifyBackupCode(backupCode, user.twoFactorBackupCodes);
      if (backupResult.valid) {
        verified = true;
        usedBackupCode = true;

        // Update remaining backup codes
        await prisma.user.update({
          where: { id: userId },
          data: {
            twoFactorBackupCodes: backupResult.remainingCodes,
          },
        });

        logger.warn('2FA backup code used:', {
          userId,
          email: user.email,
          remainingCodes: JSON.parse(backupResult.remainingCodes!).length,
        });
      }
    }

    // Try TOTP token if backup code wasn't used
    if (!verified && token) {
      verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret!,
        encoding: 'base32',
        token,
        window: 2,
      });
    }

    if (!verified) {
      res.status(401).json({ error: 'Invalid 2FA token or backup code' });
      return;
    }

    logger.info('2FA verification successful:', { userId, email: user.email, usedBackupCode });

    res.json({
      message: '2FA verification successful',
      verified: true,
      usedBackupCode,
    });
  } catch (error) {
    logger.error('Error verifying 2FA login:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { password, token } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.twoFactorEnabled) {
      res.status(400).json({ error: '2FA is not enabled' });
      return;
    }

    // Verify password
    const bcrypt = require('bcrypt');
    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    // Verify 2FA token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret!,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      res.status(401).json({ error: 'Invalid 2FA token' });
      return;
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = hashBackupCodes(backupCodes);

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorBackupCodes: hashedBackupCodes,
      },
    });

    logger.info('2FA backup codes regenerated:', { userId, email: user.email });

    res.json({
      message: 'Backup codes regenerated successfully',
      backupCodes, // Return plaintext codes ONCE for user to save
    });
  } catch (error) {
    logger.error('Error regenerating backup codes:', error);
    res.status(500).json({ error: 'Failed to regenerate backup codes' });
  }
}

/**
 * Get 2FA status
 */
export async function get2FAStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        twoFactorEnabled: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Count remaining backup codes
    let remainingBackupCodes = 0;
    if (user.twoFactorBackupCodes) {
      remainingBackupCodes = JSON.parse(user.twoFactorBackupCodes).length;
    }

    res.json({
      twoFactorEnabled: user.twoFactorEnabled,
      remainingBackupCodes: user.twoFactorEnabled ? remainingBackupCodes : 0,
    });
  } catch (error) {
    logger.error('Error fetching 2FA status:', error);
    res.status(500).json({ error: 'Failed to fetch 2FA status' });
  }
}
