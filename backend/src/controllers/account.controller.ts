import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { emailService } from '../services/email.service';
import { smsService } from '../services/sms.service';
import { voiceService } from '../services/voice.service';
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

    // Send SMS verification code
    const smsResult = await smsService.sendVerificationCode(targetPhone, code);

    if (!smsResult.success) {
      logger.error('Failed to send SMS verification code:', {
        userId,
        phoneNumber: targetPhone,
        error: smsResult.error,
      });
      // Still return success to prevent enumeration attacks
      // User won't know if SMS failed, but code is still stored in DB
    }

    logger.info('Phone verification code sent:', {
      userId,
      phoneNumber: targetPhone,
      messageId: smsResult.messageId,
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

    // Create voice profile using Azure Speaker Recognition
    const profileResult = await voiceService.createVoiceProfile(voiceData);

    if (!profileResult.success) {
      logger.error('Failed to create voice profile:', {
        userId,
        error: profileResult.error,
      });
      res.status(500).json({
        error: 'Failed to create voice profile',
        details: profileResult.error,
      });
      return;
    }

    // Store the profile ID in the database
    await prisma.user.update({
      where: { id: userId },
      data: { voiceSignature: profileResult.profileId! },
    });

    logger.info('Voice signature uploaded:', {
      userId,
      profileId: profileResult.profileId,
    });

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

    // Verify voice using Azure Speaker Recognition
    const verificationResult = await voiceService.verifyVoice(voiceData, user.voiceSignature);

    if (!verificationResult.success) {
      logger.warn('Voice verification failed:', {
        userId,
        similarityScore: verificationResult.similarityScore,
        error: verificationResult.error,
      });
      res.status(401).json({
        error: 'Voice verification failed',
        similarityScore: verificationResult.similarityScore,
        details: verificationResult.error,
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

/**
 * Complete onboarding wizard and save notification settings
 */
export async function completeOnboarding(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const {
      notificationConfig,
    } = req.body;

    const updateData: any = {};

    // Save notification settings from onboarding
    if (notificationConfig) {
      // Map accountFreezeDays to freezeDays (field name mismatch fix)
      if (notificationConfig.emailNotificationDays !== undefined) {
        updateData.emailNotificationDays = notificationConfig.emailNotificationDays;
      }
      if (notificationConfig.phoneNotificationDays !== undefined) {
        updateData.phoneNotificationDays = notificationConfig.phoneNotificationDays;
      }
      if (notificationConfig.accountFreezeDays !== undefined) {
        updateData.freezeDays = notificationConfig.accountFreezeDays;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    logger.info('Onboarding completed and settings saved:', {
      userId,
      emailNotificationDays: updatedUser.emailNotificationDays,
      phoneNotificationDays: updatedUser.phoneNotificationDays,
      freezeDays: updatedUser.freezeDays,
    });

    res.json({
      message: 'Onboarding completed successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        emailNotificationDays: updatedUser.emailNotificationDays,
        phoneNotificationDays: updatedUser.phoneNotificationDays,
        freezeDays: updatedUser.freezeDays,
      },
    });
  } catch (error) {
    logger.error('Error completing onboarding:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
}
