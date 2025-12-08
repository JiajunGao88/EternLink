/**
 * Auth Routes - Registration, Login, Verification
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, gt } from 'drizzle-orm';
import { createDb, users, verificationCodes, loginHistory, beneficiaryLinks } from '../db';
import {
  generateToken,
  hashPassword,
  comparePassword,
  generateVerificationCode,
  generateReferCode,
} from '../utils/auth';
import type { Env } from '../types';

const VERIFICATION_CODE_EXPIRY_MINUTES = 15;

export const authRoutes = new Hono<{ Bindings: Env }>();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  accountType: z.enum(['user', 'beneficiary']).default('user'),
  referCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const resendCodeSchema = z.object({
  email: z.string().email(),
});

// ==================== REGISTER ====================
authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, accountType, referCode } = c.req.valid('json');
  const db = createDb(c.env.DB);

  try {
    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      return c.json({ success: false, error: 'Email already registered' }, 400);
    }

    // If beneficiary, verify refer code
    let linkedUser = null;
    if (accountType === 'beneficiary') {
      if (!referCode) {
        return c.json({ success: false, error: 'Refer code is required for beneficiary accounts' }, 400);
      }

      linkedUser = await db.query.users.findFirst({
        where: eq(users.referCode, referCode.toUpperCase()),
      });

      if (!linkedUser || linkedUser.accountType !== 'user') {
        return c.json({ success: false, error: 'Invalid refer code' }, 400);
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate refer code for user accounts
    let userReferCode: string | null = null;
    if (accountType === 'user') {
      userReferCode = generateReferCode();
      
      // Ensure uniqueness
      let attempts = 0;
      while (attempts < 10) {
        const existing = await db.query.users.findFirst({
          where: eq(users.referCode, userReferCode),
        });
        if (!existing) break;
        userReferCode = generateReferCode();
        attempts++;
      }
    }

    // Create user
    const [newUser] = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      emailVerified: false,
      accountType,
      referCode: userReferCode,
    }).returning();

    // If beneficiary, create link
    if (accountType === 'beneficiary' && linkedUser) {
      await db.insert(beneficiaryLinks).values({
        userId: linkedUser.id,
        beneficiaryId: newUser.id,
        status: 'active',
      });
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    await db.insert(verificationCodes).values({
      userId: newUser.id,
      email: newUser.email,
      code,
      type: 'email_verification',
      expiresAt,
    });

    // TODO: Send verification email via Resend/SendGrid
    console.log(`[DEV] Verification code for ${email}: ${code}`);

    const response: Record<string, unknown> = {
      success: true,
      message: 'Registration successful. Please check your email for verification code.',
      userId: newUser.id,
      email: newUser.email,
      accountType,
    };

    if (accountType === 'user') {
      response.referCode = userReferCode;
    }

    if (accountType === 'beneficiary' && linkedUser) {
      response.linkedUser = { email: linkedUser.email };
    }

    return c.json(response, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ success: false, error: 'Failed to register user' }, 500);
  }
});

// ==================== VERIFY EMAIL ====================
authRoutes.post('/verify-email', zValidator('json', verifyEmailSchema), async (c) => {
  const { email, code } = c.req.valid('json');
  const db = createDb(c.env.DB);

  try {
    // Find verification code
    const verification = await db.query.verificationCodes.findFirst({
      where: and(
        eq(verificationCodes.email, email.toLowerCase()),
        eq(verificationCodes.code, code),
        eq(verificationCodes.type, 'email_verification'),
        eq(verificationCodes.verified, false),
        gt(verificationCodes.expiresAt, new Date())
      ),
    });

    if (!verification) {
      return c.json({ success: false, error: 'Invalid or expired verification code' }, 400);
    }

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.id, verification.userId!),
    });

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    // Mark verification as used
    await db.update(verificationCodes)
      .set({ verified: true })
      .where(eq(verificationCodes.id, verification.id));

    // Update user email verification status
    await db.update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    // Generate JWT token
    const token = await generateToken(
      user.id,
      user.email,
      user.accountType,
      c.env.JWT_SECRET,
      c.env.JWT_EXPIRES_IN
    );

    return c.json({
      success: true,
      message: 'Email verified successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: true,
        accountType: user.accountType,
      },
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return c.json({ success: false, error: 'Failed to verify email' }, 500);
  }
});

// ==================== RESEND VERIFICATION CODE ====================
authRoutes.post('/resend-code', zValidator('json', resendCodeSchema), async (c) => {
  const { email } = c.req.valid('json');
  const db = createDb(c.env.DB);

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    if (user.emailVerified) {
      return c.json({ success: false, error: 'Email already verified' }, 400);
    }

    // Invalidate old codes
    await db.update(verificationCodes)
      .set({ verified: true })
      .where(and(
        eq(verificationCodes.userId, user.id),
        eq(verificationCodes.type, 'email_verification'),
        eq(verificationCodes.verified, false)
      ));

    // Generate new code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    await db.insert(verificationCodes).values({
      userId: user.id,
      email: user.email,
      code,
      type: 'email_verification',
      expiresAt,
    });

    // TODO: Send verification email
    console.log(`[DEV] New verification code for ${email}: ${code}`);

    return c.json({
      success: true,
      message: 'Verification code sent successfully',
    });
  } catch (error) {
    console.error('Resend code error:', error);
    return c.json({ success: false, error: 'Failed to resend verification code' }, 500);
  }
});

// ==================== LOGIN ====================
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const db = createDb(c.env.DB);
  const ipAddress = c.req.header('CF-Connecting-IP') || 'unknown';
  const userAgent = c.req.header('User-Agent') || '';

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    // Verify password
    const passwordValid = await comparePassword(password, user.passwordHash);
    if (!passwordValid) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    // Check email verification
    if (!user.emailVerified) {
      return c.json({
        success: false,
        error: 'Email not verified. Please verify your email first.',
        requiresVerification: true,
      }, 403);
    }

    // Check if account frozen
    if (user.accountFrozen) {
      return c.json({
        success: false,
        error: 'Account is frozen. Voice verification required.',
        accountFrozen: true,
        freezeReason: user.freezeReason,
      }, 403);
    }

    // Check 2FA
    if (user.twoFactorEnabled) {
      return c.json({
        success: true,
        message: '2FA verification required',
        requires2FA: true,
        userId: user.id,
      });
    }

    // Update last login (capture previous for response)
    const previousLastLoginAt = user.lastLoginAt;
    const now = new Date();
    await db.update(users)
      .set({ lastLoginAt: now, updatedAt: now })
      .where(eq(users.id, user.id));

    // Record login history
    await db.insert(loginHistory).values({
      userId: user.id,
      ipAddress,
      userAgent,
      loginMethod: 'password',
    });

    // Generate token
    const token = await generateToken(
      user.id,
      user.email,
      user.accountType,
      c.env.JWT_SECRET,
      c.env.JWT_EXPIRES_IN
    );

    return c.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        accountType: user.accountType,
        emailVerified: user.emailVerified,
        phoneNumber: user.phoneNumber,
        phoneVerified: user.phoneVerified,
        hasVoiceSignature: !!user.voiceSignature,
        referCode: user.referCode,
        subscriptionActive: user.subscriptionActive,
        onboardingCompleted: user.onboardingCompleted,
        lastLoginAt: previousLastLoginAt || now,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ success: false, error: 'Failed to login' }, 500);
  }
});

// ==================== REQUEST PASSWORD RESET ====================
authRoutes.post('/request-password-reset', zValidator('json', resendCodeSchema), async (c) => {
  const { email } = c.req.valid('json');
  const db = createDb(c.env.DB);

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    // Don't reveal if user exists
    if (!user) {
      return c.json({
        success: true,
        message: 'If an account exists with this email, a password reset code has been sent.',
      });
    }

    // Invalidate old codes
    await db.update(verificationCodes)
      .set({ verified: true })
      .where(and(
        eq(verificationCodes.userId, user.id),
        eq(verificationCodes.type, 'password_reset'),
        eq(verificationCodes.verified, false)
      ));

    // Generate new code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    await db.insert(verificationCodes).values({
      userId: user.id,
      email: user.email,
      code,
      type: 'password_reset',
      expiresAt,
    });

    // TODO: Send password reset email
    console.log(`[DEV] Password reset code for ${email}: ${code}`);

    return c.json({
      success: true,
      message: 'If an account exists with this email, a password reset code has been sent.',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return c.json({ success: false, error: 'Failed to process password reset request' }, 500);
  }
});

// ==================== RESET PASSWORD ====================
const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8),
});

authRoutes.post('/reset-password', zValidator('json', resetPasswordSchema), async (c) => {
  const { email, code, newPassword } = c.req.valid('json');
  const db = createDb(c.env.DB);

  try {
    // Find verification code
    const verification = await db.query.verificationCodes.findFirst({
      where: and(
        eq(verificationCodes.email, email.toLowerCase()),
        eq(verificationCodes.code, code),
        eq(verificationCodes.type, 'password_reset'),
        eq(verificationCodes.verified, false),
        gt(verificationCodes.expiresAt, new Date())
      ),
    });

    if (!verification) {
      return c.json({ success: false, error: 'Invalid or expired reset code' }, 400);
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update user password
    await db.update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, verification.userId!));

    // Mark verification as used
    await db.update(verificationCodes)
      .set({ verified: true })
      .where(eq(verificationCodes.id, verification.id));

    return c.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return c.json({ success: false, error: 'Failed to reset password' }, 500);
  }
});

