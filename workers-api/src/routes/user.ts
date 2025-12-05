/**
 * User Routes - Profile, Settings
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createDb, users } from '../db';
import { verifyToken } from '../utils/auth';
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

