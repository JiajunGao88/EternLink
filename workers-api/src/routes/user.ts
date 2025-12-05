/**
 * User Routes - Profile, Settings, 2FA
 */

import { Hono } from 'hono';
import { eq, and, gt } from 'drizzle-orm';
import { createDb, users, verificationCodes } from '../db';
import { verifyToken, generateVerificationCode } from '../utils/auth';
import type { Env } from '../types';

export const userRoutes = new Hono<{ Bindings: Env }>();

// Auth middleware
userRoutes.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);
  const payload = await verifyToken(token, c.env.JWT_SECRET);
  
  if (!payload) {
    return c.json({ success: false, error: 'Invalid token' }, 401);
  }

  c.set('userId', payload.sub);
  c.set('userEmail', payload.email);
  await next();
});

// Get profile
userRoutes.get('/profile', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        accountType: user.accountType,
        emailVerified: user.emailVerified,
        phoneNumber: user.phoneNumber,
        phoneVerified: user.phoneVerified,
        hasVoiceSignature: !!user.voiceSignature,
        accountFrozen: user.accountFrozen,
        referCode: user.referCode,
        subscriptionActive: user.subscriptionActive,
        onboardingCompleted: user.onboardingCompleted,
        emailNotificationDays: user.emailNotificationDays,
        phoneNotificationDays: user.phoneNotificationDays,
        freezeDays: user.freezeDays,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return c.json({ success: false, error: 'Failed to get profile' }, 500);
  }
});

// Update profile
userRoutes.put('/profile', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);
  const body = await c.req.json();

  try {
    const allowedFields = [
      'phoneNumber',
      'emailNotificationDays',
      'phoneNotificationDays',
      'freezeDays',
      'onboardingCompleted',
      'subscriptionActive',
    ];

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    return c.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ success: false, error: 'Failed to update profile' }, 500);
  }
});

// ==================== 2FA ROUTES ====================

// Send SMS verification code
userRoutes.post('/2fa/send-sms', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);
  const body = await c.req.json();
  const { phoneNumber } = body;

  if (!phoneNumber) {
    return c.json({ success: false, error: 'Phone number is required' }, 400);
  }

  // Clean phone number (remove non-digits except +)
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
  
  if (cleanPhone.length < 10) {
    return c.json({ success: false, error: 'Invalid phone number' }, 400);
  }

  try {
    // Update user's phone number
    await db.update(users)
      .set({ phoneNumber: cleanPhone, updatedAt: new Date() })
      .where(eq(users.id, userId));

    // Generate 6-digit code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing phone verification codes for this user
    await db.delete(verificationCodes)
      .where(and(
        eq(verificationCodes.userId, userId),
        eq(verificationCodes.type, 'phone_verification')
      ));

    // Create new verification code
    await db.insert(verificationCodes).values({
      userId,
      phoneNumber: cleanPhone,
      code,
      type: 'phone_verification',
      expiresAt,
    });

    // TODO: In production, send SMS via Twilio/MessageBird/etc.
    // For now, just log the code (development mode)
    console.log(`[DEV MODE] SMS verification code for ${cleanPhone}: ${code}`);

    return c.json({
      success: true,
      message: 'Verification code sent',
      // In development, return the code for testing
      ...(c.env.ENVIRONMENT !== 'production' && { devCode: code }),
    });
  } catch (error) {
    console.error('Send SMS error:', error);
    return c.json({ success: false, error: 'Failed to send verification code' }, 500);
  }
});

// Verify SMS code
userRoutes.post('/2fa/verify-sms', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);
  const body = await c.req.json();
  const { code, phoneNumber } = body;

  if (!code) {
    return c.json({ success: false, error: 'Verification code is required' }, 400);
  }

  try {
    // Find valid verification code
    const verification = await db.query.verificationCodes.findFirst({
      where: and(
        eq(verificationCodes.userId, userId),
        eq(verificationCodes.code, code),
        eq(verificationCodes.type, 'phone_verification'),
        eq(verificationCodes.verified, false),
        gt(verificationCodes.expiresAt, new Date())
      ),
    });

    if (!verification) {
      return c.json({ success: false, error: 'Invalid or expired verification code' }, 400);
    }

    // Mark code as verified
    await db.update(verificationCodes)
      .set({ verified: true })
      .where(eq(verificationCodes.id, verification.id));

    // Update user's phone verification status
    await db.update(users)
      .set({ 
        phoneVerified: true,
        twoFactorEnabled: true,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));

    return c.json({
      success: true,
      message: 'Phone number verified successfully',
    });
  } catch (error) {
    console.error('Verify SMS error:', error);
    return c.json({ success: false, error: 'Failed to verify code' }, 500);
  }
});

// Get user status (for onboarding checks)
userRoutes.get('/status', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    return c.json({
      success: true,
      status: {
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        hasVoiceSignature: !!user.voiceSignature,
        onboardingCompleted: user.onboardingCompleted,
        accountFrozen: user.accountFrozen,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (error) {
    console.error('Get status error:', error);
    return c.json({ success: false, error: 'Failed to get status' }, 500);
  }
});

// Complete onboarding
userRoutes.post('/complete-onboarding', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);
  const body = await c.req.json();

  try {
    const updateData: Record<string, unknown> = {
      onboardingCompleted: true,
      updatedAt: new Date(),
    };

    // Optional fields from onboarding
    if (body.emailNotificationDays !== undefined) {
      updateData.emailNotificationDays = body.emailNotificationDays;
    }
    if (body.phoneNotificationDays !== undefined) {
      updateData.phoneNotificationDays = body.phoneNotificationDays;
    }
    if (body.freezeDays !== undefined) {
      updateData.freezeDays = body.freezeDays;
    }

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    return c.json({
      success: true,
      message: 'Onboarding completed',
    });
  } catch (error) {
    console.error('Complete onboarding error:', error);
    return c.json({ success: false, error: 'Failed to complete onboarding' }, 500);
  }
});

// Get current user (alias for /profile)
userRoutes.get('/me', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        accountType: user.accountType,
        emailVerified: user.emailVerified,
        phoneNumber: user.phoneNumber,
        phoneVerified: user.phoneVerified,
        hasVoiceSignature: !!user.voiceSignature,
        accountFrozen: user.accountFrozen,
        referCode: user.referCode,
        subscriptionActive: user.subscriptionActive,
        onboardingCompleted: user.onboardingCompleted,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    return c.json({ success: false, error: 'Failed to get user' }, 500);
  }
});

// Update account settings
userRoutes.put('/settings', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);
  const body = await c.req.json();

  try {
    const allowedFields = [
      'emailNotificationDays',
      'phoneNotificationDays', 
      'freezeDays',
      'twoFactorEnabled',
    ];

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    return c.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return c.json({ success: false, error: 'Failed to update settings' }, 500);
  }
});

// Send phone verification code (for account settings)
userRoutes.post('/phone/send-code', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);
  const body = await c.req.json();
  const { phoneNumber } = body;

  if (!phoneNumber) {
    return c.json({ success: false, error: 'Phone number is required' }, 400);
  }

  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');

  try {
    // Update user's phone number
    await db.update(users)
      .set({ phoneNumber: cleanPhone, phoneVerified: false, updatedAt: new Date() })
      .where(eq(users.id, userId));

    // Generate 6-digit code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete existing codes
    await db.delete(verificationCodes)
      .where(and(
        eq(verificationCodes.userId, userId),
        eq(verificationCodes.type, 'phone_verification')
      ));

    // Create new code
    await db.insert(verificationCodes).values({
      userId,
      phoneNumber: cleanPhone,
      code,
      type: 'phone_verification',
      expiresAt,
    });

    console.log(`[DEV MODE] Phone verification code for ${cleanPhone}: ${code}`);

    return c.json({
      success: true,
      message: 'Verification code sent',
      ...(c.env.ENVIRONMENT !== 'production' && { devCode: code }),
    });
  } catch (error) {
    console.error('Send phone code error:', error);
    return c.json({ success: false, error: 'Failed to send code' }, 500);
  }
});

// Verify phone code (for account settings)
userRoutes.post('/phone/verify', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);
  const body = await c.req.json();
  const { code } = body;

  if (!code) {
    return c.json({ success: false, error: 'Code is required' }, 400);
  }

  try {
    const verification = await db.query.verificationCodes.findFirst({
      where: and(
        eq(verificationCodes.userId, userId),
        eq(verificationCodes.code, code),
        eq(verificationCodes.type, 'phone_verification'),
        eq(verificationCodes.verified, false),
        gt(verificationCodes.expiresAt, new Date())
      ),
    });

    if (!verification) {
      return c.json({ success: false, error: 'Invalid or expired code' }, 400);
    }

    await db.update(verificationCodes)
      .set({ verified: true })
      .where(eq(verificationCodes.id, verification.id));

    await db.update(users)
      .set({ phoneVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return c.json({
      success: true,
      message: 'Phone verified successfully',
    });
  } catch (error) {
    console.error('Verify phone error:', error);
    return c.json({ success: false, error: 'Failed to verify' }, 500);
  }
});

// Upload voice signature
userRoutes.post('/voice/upload', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);
  
  try {
    const contentType = c.req.header('Content-Type') || '';
    let voiceData: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData upload
      const formData = await c.req.formData();
      const voiceFile = formData.get('voice');
      
      if (voiceFile && voiceFile instanceof File) {
        const arrayBuffer = await voiceFile.arrayBuffer();
        // Safe base64 encoding for large files
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        voiceData = btoa(binary);
      }
    } else if (contentType.includes('application/json')) {
      // Handle JSON with base64 voice data
      const body = await c.req.json();
      voiceData = body.voiceData || body.voice || body.voiceSignature || body.data;
    }

    if (!voiceData) {
      return c.json({ success: false, error: 'Voice data is required' }, 400);
    }

    // Store voice signature
    await db.update(users)
      .set({ 
        voiceSignature: voiceData,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));

    return c.json({
      success: true,
      message: 'Voice signature saved',
    });
  } catch (error) {
    console.error('Voice upload error:', error);
    return c.json({ success: false, error: 'Failed to save voice signature' }, 500);
  }
});

// Verify voice signature (for unlock)
userRoutes.post('/voice/verify', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);

  try {
    const formData = await c.req.formData();
    const voiceFile = formData.get('voice');
    
    if (!voiceFile || !(voiceFile instanceof File)) {
      return c.json({ success: false, error: 'Voice file is required' }, 400);
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.voiceSignature) {
      return c.json({ success: false, error: 'No voice signature on file' }, 400);
    }

    // TODO: In production, use Azure Cognitive Services or similar
    // For now, just mark as verified (development mode)
    console.log(`[DEV MODE] Voice verification for user ${userId}`);

    // Unfreeze account if frozen
    if (user.accountFrozen) {
      await db.update(users)
        .set({ 
          accountFrozen: false, 
          freezeReason: null,
          updatedAt: new Date() 
        })
        .where(eq(users.id, userId));
    }

    return c.json({
      success: true,
      message: 'Voice verified',
      verified: true, // In dev mode, always pass
    });
  } catch (error) {
    console.error('Voice verify error:', error);
    return c.json({ success: false, error: 'Failed to verify voice' }, 500);
  }
});

