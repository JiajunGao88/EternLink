/**
 * EternLink Workers API - Main Entry Point
 * Full backend API using Hono + Drizzle + D1
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createDb, heartbeats } from './db';
import type { Env } from './types';

// Import routes
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/user';
import { heartbeatRoutes } from './routes/heartbeat';
import { beneficiaryRoutes } from './routes/beneficiary';
import { blockchainRoutes } from './routes/blockchain';
import { fileRoutes } from './routes/files';

// Create Hono app with typed env
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', cors({
  origin: (origin, c) => {
    const env = c.env;
    // Allow configured frontend URL, production domains, and localhost for development
    const allowedOrigins = [
      env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'https://eternlink.pages.dev',
      'https://eternlink.co',
      'https://www.eternlink.co',
    ];
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Inject database into context
app.use('*', async (c, next) => {
  const db = createDb(c.env.DB);
  c.set('db', db);
  await next();
});

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'EternLink API',
    version: '3.0.0',
    status: 'healthy',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'EternLink API',
    environment: c.env.ENVIRONMENT,
  });
});

// Mount routes
app.route('/api/auth', authRoutes);
app.route('/api/user', userRoutes);
app.route('/api/heartbeat', heartbeatRoutes);
app.route('/api/beneficiary', beneficiaryRoutes);
app.route('/api/blockchain', blockchainRoutes);
app.route('/api/files', fileRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({
    success: false,
    error: c.env.ENVIRONMENT === 'production' 
      ? 'Internal server error' 
      : err.message,
  }, 500);
});

// Scheduled handler for Cron Triggers
async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  console.log('Cron trigger fired:', event.cron);
  
  const db = createDb(env.DB);
  
  try {
    // Check for missed heartbeats
    const now = new Date();
    const heartbeatsToCheck = await db.query.heartbeats.findMany({
      where: (heartbeats, { eq }) => eq(heartbeats.recoveryTriggered, false),
    });

    for (const heartbeat of heartbeatsToCheck) {
      const lastCheckIn = new Date(heartbeat.lastCheckIn);
      const daysSinceCheckIn = Math.floor((now.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceCheckIn > heartbeat.intervalDays) {
        console.log(`Heartbeat ${heartbeat.id} missed! Days since check-in: ${daysSinceCheckIn}`);
        // TODO: Trigger notification flow
        // TODO: Check user's notification settings
        // TODO: Send email/SMS notifications
      }
    }

    console.log(`Checked ${heartbeatsToCheck.length} heartbeats`);
  } catch (error) {
    console.error('Scheduled task error:', error);
  }
}

// Export for Cloudflare Workers
export default {
  fetch: app.fetch,
  scheduled,
};

