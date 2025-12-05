/**
 * Beneficiary Routes - Manage beneficiaries
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { createDb, users, beneficiaryLinks, deathClaims } from '../db';
import { verifyToken } from '../utils/auth';
import type { Env } from '../types';

export const beneficiaryRoutes = new Hono<{ Bindings: Env }>();

// Auth middleware
beneficiaryRoutes.use('*', async (c, next) => {
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
  c.set('accountType', payload.accountType);
  await next();
});

// Get linked beneficiaries (for user accounts)
beneficiaryRoutes.get('/linked', async (c) => {
  const userId = c.get('userId');
  const accountType = c.get('accountType');
  const db = createDb(c.env.DB);

  try {
    if (accountType !== 'user') {
      return c.json({ success: false, error: 'Only user accounts can have beneficiaries' }, 403);
    }

    const links = await db.query.beneficiaryLinks.findMany({
      where: and(
        eq(beneficiaryLinks.userId, userId),
        eq(beneficiaryLinks.status, 'active')
      ),
    });

    // Get beneficiary details
    const beneficiaryIds = links.map(l => l.beneficiaryId);
    const beneficiaryUsers = beneficiaryIds.length > 0
      ? await Promise.all(
          beneficiaryIds.map(id => 
            db.query.users.findFirst({ where: eq(users.id, id) })
          )
        )
      : [];

    return c.json({
      success: true,
      beneficiaries: links.map((link, idx) => ({
        linkId: link.id,
        beneficiary: beneficiaryUsers[idx] ? {
          id: beneficiaryUsers[idx]!.id,
          email: beneficiaryUsers[idx]!.email,
        } : null,
        createdAt: link.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get beneficiaries error:', error);
    return c.json({ success: false, error: 'Failed to get beneficiaries' }, 500);
  }
});

// Get linked users (for beneficiary accounts)
beneficiaryRoutes.get('/linked-users', async (c) => {
  const userId = c.get('userId');
  const accountType = c.get('accountType');
  const db = createDb(c.env.DB);

  try {
    if (accountType !== 'beneficiary') {
      return c.json({ success: false, error: 'Only beneficiary accounts can view linked users' }, 403);
    }

    const links = await db.query.beneficiaryLinks.findMany({
      where: and(
        eq(beneficiaryLinks.beneficiaryId, userId),
        eq(beneficiaryLinks.status, 'active')
      ),
    });

    // Get user details
    const userIds = links.map(l => l.userId);
    const linkedUsers = userIds.length > 0
      ? await Promise.all(
          userIds.map(id => 
            db.query.users.findFirst({ where: eq(users.id, id) })
          )
        )
      : [];

    return c.json({
      success: true,
      linkedUsers: links.map((link, idx) => ({
        linkId: link.id,
        user: linkedUsers[idx] ? {
          id: linkedUsers[idx]!.id,
          email: linkedUsers[idx]!.email,
          accountFrozen: linkedUsers[idx]!.accountFrozen,
        } : null,
        createdAt: link.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get linked users error:', error);
    return c.json({ success: false, error: 'Failed to get linked users' }, 500);
  }
});

// Initiate death claim
beneficiaryRoutes.post('/death-claim', async (c) => {
  const userId = c.get('userId');
  const accountType = c.get('accountType');
  const db = createDb(c.env.DB);
  const body = await c.req.json();

  try {
    if (accountType !== 'beneficiary') {
      return c.json({ success: false, error: 'Only beneficiary accounts can initiate death claims' }, 403);
    }

    const { linkId } = body;

    // Verify link exists and is active
    const link = await db.query.beneficiaryLinks.findFirst({
      where: and(
        eq(beneficiaryLinks.id, linkId),
        eq(beneficiaryLinks.beneficiaryId, userId),
        eq(beneficiaryLinks.status, 'active')
      ),
    });

    if (!link) {
      return c.json({ success: false, error: 'Link not found' }, 404);
    }

    // Check for existing pending claim
    const existingClaim = await db.query.deathClaims.findFirst({
      where: and(
        eq(deathClaims.linkId, linkId),
        eq(deathClaims.status, 'pending')
      ),
    });

    if (existingClaim) {
      return c.json({ success: false, error: 'A death claim is already pending for this user' }, 400);
    }

    // Create death claim
    const [claim] = await db.insert(deathClaims).values({
      linkId,
      userId: link.userId,
      beneficiaryId: userId,
      status: 'pending',
      currentStage: 'email_level',
    }).returning();

    return c.json({
      success: true,
      message: 'Death claim initiated. Verification process will begin.',
      claim: {
        id: claim.id,
        status: claim.status,
        currentStage: claim.currentStage,
      },
    }, 201);
  } catch (error) {
    console.error('Death claim error:', error);
    return c.json({ success: false, error: 'Failed to initiate death claim' }, 500);
  }
});

