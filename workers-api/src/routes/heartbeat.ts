/**
 * Heartbeat Routes - Check-ins, Dead Man's Switch
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createDb, users, heartbeats } from '../db';
import { verifyToken } from '../utils/auth';
import type { Env } from '../types';

export const heartbeatRoutes = new Hono<{ Bindings: Env }>();

// Auth middleware
heartbeatRoutes.use('*', async (c, next) => {
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
  await next();
});

// Get user's heartbeats
heartbeatRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);

  try {
    const userHeartbeats = await db.query.heartbeats.findMany({
      where: eq(heartbeats.userId, userId),
    });

    return c.json({
      success: true,
      heartbeats: userHeartbeats,
    });
  } catch (error) {
    console.error('Get heartbeats error:', error);
    return c.json({ success: false, error: 'Failed to get heartbeats' }, 500);
  }
});

// Create heartbeat
heartbeatRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);
  const body = await c.req.json();

  try {
    const { intervalDays, encryptedFileHash, shareOneEncrypted, shareThreeEncrypted } = body;

    const [newHeartbeat] = await db.insert(heartbeats).values({
      userId,
      lastCheckIn: new Date(),
      intervalDays: intervalDays || 30,
      encryptedFileHash,
      shareOneEncrypted,
      shareThreeEncrypted,
      recoveryTriggered: false,
    }).returning();

    return c.json({
      success: true,
      heartbeat: newHeartbeat,
    }, 201);
  } catch (error) {
    console.error('Create heartbeat error:', error);
    return c.json({ success: false, error: 'Failed to create heartbeat' }, 500);
  }
});

// Check in (update heartbeat)
heartbeatRoutes.post('/:id/checkin', async (c) => {
  const userId = c.get('userId');
  const heartbeatId = c.req.param('id');
  const db = createDb(c.env.DB);

  try {
    // Verify ownership
    const heartbeat = await db.query.heartbeats.findFirst({
      where: eq(heartbeats.id, heartbeatId),
    });

    if (!heartbeat || heartbeat.userId !== userId) {
      return c.json({ success: false, error: 'Heartbeat not found' }, 404);
    }

    // Update check-in time
    await db.update(heartbeats)
      .set({ lastCheckIn: new Date(), updatedAt: new Date() })
      .where(eq(heartbeats.id, heartbeatId));

    return c.json({
      success: true,
      message: 'Check-in successful',
      lastCheckIn: new Date(),
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return c.json({ success: false, error: 'Failed to check in' }, 500);
  }
});

