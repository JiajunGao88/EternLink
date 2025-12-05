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

// Get heartbeat status (for dashboard)
heartbeatRoutes.get('/status', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);

  try {
    const userHeartbeats = await db.query.heartbeats.findMany({
      where: eq(heartbeats.userId, userId),
    });

    // Calculate status
    const now = new Date();
    let status = 'healthy';
    let daysUntilDeadline = null;
    let lastCheckIn = null;

    if (userHeartbeats.length > 0) {
      const latest = userHeartbeats[0];
      lastCheckIn = latest.lastCheckIn;
      const checkInDate = new Date(latest.lastCheckIn);
      const daysSinceCheckIn = Math.floor((now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      daysUntilDeadline = latest.intervalDays - daysSinceCheckIn;

      if (daysUntilDeadline < 0) {
        status = 'overdue';
      } else if (daysUntilDeadline < 7) {
        status = 'warning';
      }
    } else {
      status = 'no_heartbeat';
    }

    return c.json({
      success: true,
      status,
      daysUntilDeadline,
      lastCheckIn,
      heartbeatCount: userHeartbeats.length,
    });
  } catch (error) {
    console.error('Get heartbeat status error:', error);
    return c.json({ success: false, error: 'Failed to get status' }, 500);
  }
});

// Send heartbeat (quick check-in for all heartbeats)
heartbeatRoutes.post('/send', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);

  try {
    // Update all user's heartbeats
    await db.update(heartbeats)
      .set({ lastCheckIn: new Date(), updatedAt: new Date() })
      .where(eq(heartbeats.userId, userId));

    // Also update user's last heartbeat timestamp
    await db.update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));

    return c.json({
      success: true,
      message: 'Heartbeat sent successfully',
      lastCheckIn: new Date(),
    });
  } catch (error) {
    console.error('Send heartbeat error:', error);
    return c.json({ success: false, error: 'Failed to send heartbeat' }, 500);
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

