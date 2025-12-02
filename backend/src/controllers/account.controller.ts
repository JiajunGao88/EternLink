import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { emailService } from '../services/email.service';
import { logger } from '../utils/logger';

const VERIFICATION_CODE_EXPIRY_MINUTES = 15;

/**
 * Generate a random 6-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Update user account settings
 */
export async function updateAccountSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const {
      phoneNumber,
      emailNotificationDays,
      phoneNotificationDays,
      freezeDays,
    } = req.body;

    // Validation
    if (emailNotificationDays && phoneNotificationDays && emailNotificationDays >= phoneNotificationDays) {
      res.status(400).json({
        error: 'Email notification days must be less than phone notification days',
      });
      return;
    }

    if (phoneNotificationDays && freezeDays && phoneNotificationDays >= freezeDays) {
      res.status(400).json({
        error: 'Phone notification days must be less than freeze days',
      });
      return;
    }

    const updateData: any = {};

    if (phoneNumber !== undefined) {
      updateData.phoneNumber = phoneNumber;
      updateData.phoneVerified = false; // Reset phone verification if changed
    }

    if (emailNotificationDays !== undefined) {
      updateData.emailNotificationDays = emailNotificationDays;
    }

    if (phoneNotificationDays !== undefined) {
      updateData.phoneNotificationDays = phoneNotificationDays;
    }

    if (freezeDays !== undefined) {
      updateData.freezeDays = freezeDays;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    logger.info('Account settings updated:', { userId });

    res.json({
      message: 'Account settings updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        phoneVerified: updatedUser.phoneVerified,
        emailNotificationDays: updatedUser.emailNotificationDays,
        phoneNotificationDays: updatedUser.phoneNotificationDays,
        freezeDays: updatedUser.freezeDays,
      },
    });
  } catch (error) {
    logger.error('Error updating account settings:', error);
    res.status(500).json({ error: 'Failed to update account settings' });
  }
}

/**
 * Send phone verification code
 */
export async function sendPhoneVerificationCode(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { phoneNumber } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Update phone number if provided
    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          phoneNumber,
          phoneVerified: false,
        },
      });
    }

    const targetPhone = phoneNumber || user.phoneNumber;

    if (!targetPhone) {
      res.status(400).json({ error: 'Phone number required' });
      return;
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        userId,
        phoneNumber: targetPhone,
        code,
        type: 'phone_verification',
        expiresAt,
      },
    });

    // TODO: Integrate with SMS service (Twilio, etc.)
    // For now, log the code
    logger.info('Phone verification code generated:', {
      userId,
      phoneNumber: targetPhone,
      code, // In production, remove this
    });

    res.json({
      message: 'Verification code sent to phone',
      phoneNumber: targetPhone,
    });
  } catch (error) {
    logger.error('Error sending phone verification code:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
}

/**
 * Verify phone number
 */
export async function verifyPhone(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { code } = req.body;

    const verification = await prisma.verificationCode.findFirst({
      where: {
        userId,
        code,
        type: 'phone_verification',
        verified: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!verification) {
      res.status(400).json({ error: 'Invalid or expired verification code' });
      return;
    }

    // Mark verification as used
    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { verified: true },
    });

    // Update user phone verification status
    await prisma.user.update({
      where: { id: userId },
      data: { phoneVerified: true },
    });

    logger.info('Phone verified:', { userId });

    res.json({
      message: 'Phone number verified successfully',
      phoneVerified: true,
    });
  } catch (error) {
    logger.error('Error verifying phone:', error);
    res.status(500).json({ error: 'Failed to verify phone number' });
  }
}

/**
 * Upload voice signature
 */
export async function uploadVoiceSignature(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { voiceData } = req.body; // Base64 encoded audio

    if (!voiceData) {
      res.status(400).json({ error: 'Voice data required' });
      return;
    }

    // In production, you might want to:
    // 1. Validate audio format
    // 2. Extract voice features using ML model
    // 3. Store features instead of raw audio for efficiency

    await prisma.user.update({
      where: { id: userId },
      data: { voiceSignature: voiceData },
    });

    logger.info('Voice signature uploaded:', { userId });

    res.json({
      message: 'Voice signature uploaded successfully',
      hasVoiceSignature: true,
    });
  } catch (error) {
    logger.error('Error uploading voice signature:', error);
    res.status(500).json({ error: 'Failed to upload voice signature' });
  }
}

/**
 * Verify voice signature (for unlocking frozen account)
 */
export async function verifyVoiceSignature(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { voiceData } = req.body; // Base64 encoded audio for verification

    if (!voiceData) {
      res.status(400).json({ error: 'Voice data required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.voiceSignature) {
      res.status(400).json({ error: 'No voice signature registered' });
      return;
    }

    // In production, use voice recognition ML model to compare
    // For now, simple comparison (THIS IS NOT SECURE - USE ML IN PRODUCTION)
    const similarityScore = calculateVoiceSimilarity(user.voiceSignature, voiceData);

    if (similarityScore < 0.8) {
      logger.warn('Voice verification failed:', { userId, similarityScore });
      res.status(401).json({
        error: 'Voice verification failed',
        similarityScore,
      });
      return;
    }

    // Unfreeze account
    await prisma.user.update({
      where: { id: userId },
      data: {
        accountFrozen: false,
        freezeReason: null,
      },
    });

    // Record login
    await prisma.loginHistory.create({
      data: {
        userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || '',
        loginMethod: 'voice',
      },
    });

    logger.info('Account unfrozen via voice verification:', { userId });

    res.json({
      message: 'Voice verified successfully. Account unfrozen.',
      accountFrozen: false,
    });
  } catch (error) {
    logger.error('Error verifying voice:', error);
    res.status(500).json({ error: 'Failed to verify voice' });
  }
}

/**
 * Calculate voice similarity (PLACEHOLDER - USE ML MODEL IN PRODUCTION)
 */
function calculateVoiceSimilarity(signature1: string, signature2: string): number {
  // This is a PLACEHOLDER
  // In production, use:
  // - Voice biometric SDK (e.g., Azure Speaker Recognition, AWS Transcribe)
  // - ML model trained on voice features (MFCC, spectrograms)
  // - Deep learning models like SpeakerNet or VGGVox

  // For demo purposes, simple string comparison
  if (signature1 === signature2) return 1.0;

  // Calculate Levenshtein distance for demo
  const maxLen = Math.max(signature1.length, signature2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(signature1.substring(0, 100), signature2.substring(0, 100));
  return 1 - (distance / maxLen);
}

/**
 * Levenshtein distance (for demo only)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Get account status
 */
export async function getAccountStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        phoneNumber: true,
        phoneVerified: true,
        voiceSignature: true,
        accountFrozen: true,
        freezeReason: true,
        lastLoginAt: true,
        emailNotificationDays: true,
        phoneNotificationDays: true,
        freezeDays: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Calculate days since last login
    const daysSinceLogin = user.lastLoginAt
      ? Math.floor((Date.now() - user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    res.json({
      user: {
        ...user,
        hasVoiceSignature: !!user.voiceSignature,
        voiceSignature: undefined, // Don't send voice data
        daysSinceLogin,
      },
    });
  } catch (error) {
    logger.error('Error fetching account status:', error);
    res.status(500).json({ error: 'Failed to fetch account status' });
  }
}
