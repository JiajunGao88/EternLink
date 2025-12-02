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
 * Register a new user with email and password
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        emailVerified: false,
      },
    });

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

    logger.info('User registered:', { userId: user.id, email: user.email });

    res.status(201).json({
      message: 'Registration successful. Please check your email for verification code.',
      userId: user.id,
      email: user.email,
    });
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
