import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/database';
import { generateToken, AuthRequest } from '../middleware/auth.middleware';
import { emailService } from '../services/email.service';
import { logger } from '../utils/logger';

const SALT_ROUNDS = 10;
const VERIFICATION_CODE_LENGTH = 6;
const VERIFICATION_CODE_EXPIRY_MINUTES = 15;

/**
 * Generate a random 6-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a random 12-character refer code
 */
function generateReferCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Register a new user with email and password
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, accountType, referCode } = req.body;

    // Validate account type
    const validAccountTypes = ['user', 'beneficiary'];
    const selectedAccountType = accountType || 'user';

    if (!validAccountTypes.includes(selectedAccountType)) {
      res.status(400).json({ error: 'Invalid account type. Must be "user" or "beneficiary"' });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    // If beneficiary account, verify refer code
    let linkedUser = null;
    if (selectedAccountType === 'beneficiary') {
      if (!referCode) {
        res.status(400).json({ error: 'Refer code is required for beneficiary accounts' });
        return;
      }

      // Find user with this refer code
      linkedUser = await prisma.user.findUnique({
        where: { referCode: referCode.toUpperCase() },
      });

      if (!linkedUser) {
        res.status(400).json({ error: 'Invalid refer code' });
        return;
      }

      if (linkedUser.accountType !== 'user') {
        res.status(400).json({ error: 'Invalid refer code - not a user account' });
        return;
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Generate refer code for user accounts
    let userReferCode = null;
    if (selectedAccountType === 'user') {
      userReferCode = generateReferCode();

      // Ensure uniqueness
      let codeExists = true;
      while (codeExists) {
        const existing = await prisma.user.findUnique({
          where: { referCode: userReferCode },
        });
        if (!existing) {
          codeExists = false;
        } else {
          userReferCode = generateReferCode();
        }
      }
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        emailVerified: false,
        accountType: selectedAccountType,
        referCode: userReferCode,
      },
    });

    // If beneficiary, create the link to the user
    if (selectedAccountType === 'beneficiary' && linkedUser) {
      await prisma.beneficiaryLink.create({
        data: {
          userId: linkedUser.id,
          beneficiaryId: user.id,
          status: 'active',
        },
      });
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        email: user.email,
        code,
        type: 'email_verification',
        expiresAt,
      },
    });

    // Send verification email
    await emailService.sendVerificationCode(user.email, code);

    logger.info('User registered:', {
      userId: user.id,
      email: user.email,
      accountType: selectedAccountType,
      referCode: userReferCode
    });

    const response: any = {
      message: 'Registration successful. Please check your email for verification code.',
      userId: user.id,
      email: user.email,
      accountType: selectedAccountType,
    };

    // Include refer code for user accounts
    if (selectedAccountType === 'user') {
      response.referCode = userReferCode;
    }

    // Include linked user info for beneficiary accounts
    if (selectedAccountType === 'beneficiary' && linkedUser) {
      response.linkedUser = {
        email: linkedUser.email,
      };
    }

    res.status(201).json(response);
  } catch (error) {
    logger.error('Error during registration:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
}

/**
 * Verify email with verification code
 */
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { email, code } = req.body;

    // Find verification code
    const verification = await prisma.verificationCode.findFirst({
      where: {
        email: email.toLowerCase(),
        code,
        type: 'email_verification',
        verified: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
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

    // Update user email verification status
    await prisma.user.update({
      where: { id: verification.userId! },
      data: { emailVerified: true },
    });

    logger.info('Email verified:', { userId: verification.userId, email });

    // Generate JWT token
    const token = generateToken(verification.userId!, verification.user!.email);

    res.json({
      message: 'Email verified successfully',
      token,
      user: {
        id: verification.user!.id,
        email: verification.user!.email,
        emailVerified: true,
        accountType: verification.user!.accountType,
      },
    });
  } catch (error) {
    logger.error('Error verifying email:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
}

/**
 * Resend verification code
 */
export async function resendVerificationCode(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({ error: 'Email already verified' });
      return;
    }

    // Invalidate old codes
    await prisma.verificationCode.updateMany({
      where: {
        userId: user.id,
        type: 'email_verification',
        verified: false,
      },
      data: { verified: true }, // Mark as used to invalidate
    });

    // Generate new verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        email: user.email,
        code,
        type: 'email_verification',
        expiresAt,
      },
    });

    // Send verification email
    await emailService.sendVerificationCode(user.email, code);

    logger.info('Verification code resent:', { userId: user.id, email });

    res.json({ message: 'Verification code sent successfully' });
  } catch (error) {
    logger.error('Error resending verification code:', error);
    res.status(500).json({ error: 'Failed to resend verification code' });
  }
}

/**
 * Login with email and password
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Check if email is verified
    if (!user.emailVerified) {
      res.status(403).json({
        error: 'Email not verified. Please verify your email first.',
        requiresVerification: true,
      });
      return;
    }

    // Check if account is frozen
    if (user.accountFrozen) {
      res.status(403).json({
        error: 'Account is frozen. Voice verification required.',
        accountFrozen: true,
        freezeReason: user.freezeReason,
      });
      return;
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Return special response indicating 2FA is required
      // Frontend will then prompt for 2FA token
      res.json({
        message: '2FA verification required',
        requires2FA: true,
        userId: user.id, // Temporary ID for 2FA verification
      });
      return;
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Record login history
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress,
        userAgent,
        loginMethod: 'password',
      },
    });

    logger.info('User logged in:', { userId: user.id, email });

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        phoneNumber: user.phoneNumber,
        phoneVerified: user.phoneVerified,
        hasVoiceSignature: !!user.voiceSignature,
        emailNotificationDays: user.emailNotificationDays,
        phoneNotificationDays: user.phoneNotificationDays,
        freezeDays: user.freezeDays,
      },
    });
  } catch (error) {
    logger.error('Error during login:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
}

/**
 * Request password reset
 * Sends a password reset code to the user's email
 */
export async function requestPasswordReset(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Don't reveal if user exists (prevent enumeration attacks)
    if (!user) {
      logger.warn('Password reset requested for non-existent email:', { email });
      res.json({
        message: 'If an account exists with this email, a password reset code has been sent.',
      });
      return;
    }

    // Invalidate old password reset codes
    await prisma.verificationCode.updateMany({
      where: {
        userId: user.id,
        type: 'password_reset',
        verified: false,
      },
      data: { verified: true }, // Mark as used to invalidate
    });

    // Generate new reset code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        email: user.email,
        code,
        type: 'password_reset',
        expiresAt,
      },
    });

    // Send password reset email
    await emailService.sendPasswordResetCode(user.email, code);

    logger.info('Password reset code sent:', { userId: user.id, email });

    res.json({
      message: 'If an account exists with this email, a password reset code has been sent.',
    });
  } catch (error) {
    logger.error('Error requesting password reset:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
}

/**
 * Verify password reset code
 * Validates the reset code before allowing password change
 */
export async function verifyPasswordResetCode(req: Request, res: Response): Promise<void> {
  try {
    const { email, code } = req.body;

    const verification = await prisma.verificationCode.findFirst({
      where: {
        email: email.toLowerCase(),
        code,
        type: 'password_reset',
        verified: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!verification) {
      res.status(400).json({ error: 'Invalid or expired reset code' });
      return;
    }

    logger.info('Password reset code verified:', {
      userId: verification.userId,
      email,
    });

    res.json({
      message: 'Reset code verified. You may now reset your password.',
      resetToken: verification.id, // Use verification ID as one-time reset token
    });
  } catch (error) {
    logger.error('Error verifying password reset code:', error);
    res.status(500).json({ error: 'Failed to verify reset code' });
  }
}

/**
 * Reset password
 * Changes the user's password after verifying the reset token
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { resetToken, newPassword } = req.body;

    // Find the verification code by ID (resetToken)
    const verification = await prisma.verificationCode.findFirst({
      where: {
        id: resetToken,
        type: 'password_reset',
        verified: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!verification) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update user password
    await prisma.user.update({
      where: { id: verification.userId! },
      data: { passwordHash },
    });

    // Mark verification as used
    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { verified: true },
    });

    logger.info('Password reset successfully:', {
      userId: verification.userId,
      email: verification.email,
    });

    res.json({
      message: 'Password reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    logger.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}

/**
 * Complete login after 2FA verification
 * This endpoint is called after the user successfully verifies their 2FA token
 */
export async function complete2FALogin(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Record login history
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress,
        userAgent,
        loginMethod: 'password_2fa',
      },
    });

    logger.info('User logged in with 2FA:', { userId: user.id, email: user.email });

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        phoneNumber: user.phoneNumber,
        phoneVerified: user.phoneVerified,
        hasVoiceSignature: !!user.voiceSignature,
        emailNotificationDays: user.emailNotificationDays,
        phoneNotificationDays: user.phoneNotificationDays,
        freezeDays: user.freezeDays,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (error) {
    logger.error('Error completing 2FA login:', error);
    res.status(500).json({ error: 'Failed to complete login' });
  }
}
