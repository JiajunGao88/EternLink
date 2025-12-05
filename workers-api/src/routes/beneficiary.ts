/**
 * Beneficiary Routes - Manage beneficiaries
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { createDb, users, beneficiaryLinks, deathClaims } from '../db';
import { verifyToken, generateReferCode } from '../utils/auth';
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

// Generate refer code for inviting beneficiaries
beneficiaryRoutes.post('/generate-refer-code', async (c) => {
  const userId = c.get('userId');
  const accountType = c.get('accountType');
  const db = createDb(c.env.DB);

  try {
    if (accountType !== 'user') {
      return c.json({ success: false, error: 'Only user accounts can generate refer codes' }, 403);
    }

    // Check if user already has a refer code
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (user?.referCode) {
      return c.json({
        success: true,
        referCode: user.referCode,
        message: 'Existing refer code returned',
      });
    }

    // Generate new refer code
    const referCode = generateReferCode();

    await db.update(users)
      .set({ referCode, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return c.json({
      success: true,
      referCode,
      message: 'Refer code generated successfully',
    });
  } catch (error) {
    console.error('Generate refer code error:', error);
    return c.json({ success: false, error: 'Failed to generate refer code' }, 500);
  }
});

// Send beneficiary invitation (email)
beneficiaryRoutes.post('/send-invitation', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);
  const body = await c.req.json();

  try {
    const { email, referCode } = body;

    if (!email || !referCode) {
      return c.json({ success: false, error: 'Email and refer code are required' }, 400);
    }

    // Verify the refer code belongs to this user
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || user.referCode !== referCode) {
      return c.json({ success: false, error: 'Invalid refer code' }, 400);
    }

    // TODO: In production, send email via Resend/SendGrid
    console.log(`[DEV MODE] Sending invitation to ${email} with code ${referCode}`);

    return c.json({
      success: true,
      message: 'Invitation sent successfully',
    });
  } catch (error) {
    console.error('Send invitation error:', error);
    return c.json({ success: false, error: 'Failed to send invitation' }, 500);
  }
});

// Get death claims pending against current user
beneficiaryRoutes.get('/death-claim/pending-against-me', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);

  try {
    const pendingClaims = await db.query.deathClaims.findMany({
      where: and(
        eq(deathClaims.userId, userId),
        eq(deathClaims.status, 'pending')
      ),
    });

    return c.json({
      success: true,
      claims: pendingClaims.map(claim => ({
        id: claim.id,
        status: claim.status,
        currentStage: claim.currentStage,
        createdAt: claim.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get pending claims error:', error);
    return c.json({ success: false, error: 'Failed to get pending claims' }, 500);
  }
});

// Respond to death claim (user proves they're alive)
beneficiaryRoutes.post('/death-claim/respond', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);
  const body = await c.req.json();

  try {
    const { claimId, response } = body;

    // Find the claim
    const claim = await db.query.deathClaims.findFirst({
      where: and(
        eq(deathClaims.id, claimId),
        eq(deathClaims.userId, userId),
        eq(deathClaims.status, 'pending')
      ),
    });

    if (!claim) {
      return c.json({ success: false, error: 'Claim not found or already resolved' }, 404);
    }

    // User responded - reject the claim
    await db.update(deathClaims)
      .set({ 
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: response || 'User responded - claim rejected',
        updatedAt: new Date(),
      })
      .where(eq(deathClaims.id, claimId));

    return c.json({
      success: true,
      message: 'Death claim rejected - you have confirmed you are alive',
    });
  } catch (error) {
    console.error('Respond to claim error:', error);
    return c.json({ success: false, error: 'Failed to respond to claim' }, 500);
  }
});

// Submit death claim (alias for POST /death-claim)
beneficiaryRoutes.post('/death-claim/submit', async (c) => {
  const userId = c.get('userId');
  const accountType = c.get('accountType');
  const db = createDb(c.env.DB);
  const body = await c.req.json();

  try {
    if (accountType !== 'beneficiary') {
      return c.json({ success: false, error: 'Only beneficiary accounts can submit death claims' }, 403);
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
      message: 'Death claim submitted. Verification process will begin.',
      claim: {
        id: claim.id,
        status: claim.status,
        currentStage: claim.currentStage,
      },
    }, 201);
  } catch (error) {
    console.error('Submit death claim error:', error);
    return c.json({ success: false, error: 'Failed to submit death claim' }, 500);
  }
});

// Get all death claims for beneficiary
beneficiaryRoutes.get('/death-claim', async (c) => {
  const userId = c.get('userId');
  const accountType = c.get('accountType');
  const db = createDb(c.env.DB);

  try {
    if (accountType !== 'beneficiary') {
      return c.json({ success: false, error: 'Only beneficiary accounts can view death claims' }, 403);
    }

    const claims = await db.query.deathClaims.findMany({
      where: eq(deathClaims.beneficiaryId, userId),
    });

    return c.json({
      success: true,
      claims: claims.map(claim => ({
        id: claim.id,
        userId: claim.userId,
        status: claim.status,
        currentStage: claim.currentStage,
        createdAt: claim.createdAt,
        verifiedAt: claim.verifiedAt,
      })),
    });
  } catch (error) {
    console.error('Get death claims error:', error);
    return c.json({ success: false, error: 'Failed to get death claims' }, 500);
  }
});

// Get death claim details
beneficiaryRoutes.get('/death-claim/:claimId', async (c) => {
  const userId = c.get('userId');
  const claimId = c.req.param('claimId');
  const db = createDb(c.env.DB);

  try {
    const claim = await db.query.deathClaims.findFirst({
      where: eq(deathClaims.id, claimId),
    });

    if (!claim) {
      return c.json({ success: false, error: 'Claim not found' }, 404);
    }

    // Verify user has access (either the user or the beneficiary)
    if (claim.userId !== userId && claim.beneficiaryId !== userId) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    return c.json({
      success: true,
      claim,
    });
  } catch (error) {
    console.error('Get claim details error:', error);
    return c.json({ success: false, error: 'Failed to get claim details' }, 500);
  }
});

// Initiate death claim (legacy endpoint)
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

