import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { emailService } from '../services/email.service';
import { smsService } from '../services/sms.service';
import { logger } from '../utils/logger';

// Configuration for death verification process
const EMAIL_VERIFICATION_ATTEMPTS = 3; // Number of emails to send
const EMAIL_VERIFICATION_INTERVAL_DAYS = 3; // Days between each email
const PHONE_VERIFICATION_ATTEMPTS = 2; // Number of SMS to send
const PHONE_VERIFICATION_INTERVAL_DAYS = 2; // Days between each SMS

/**
 * Submit death claim (beneficiary initiates)
 */
export async function submitDeathClaim(req: AuthRequest, res: Response): Promise<void> {
  try {
    const beneficiaryId = req.userId!;
    const { linkId } = req.body;

    const beneficiary = await prisma.user.findUnique({
      where: { id: beneficiaryId },
    });

    if (!beneficiary || beneficiary.accountType !== 'beneficiary') {
      res.status(400).json({ error: 'Invalid beneficiary account' });
      return;
    }

    // Verify the link exists and is active
    const link = await prisma.beneficiaryLink.findUnique({
      where: { id: linkId },
      include: {
        user: true,
      },
    });

    if (!link) {
      res.status(404).json({ error: 'Beneficiary link not found' });
      return;
    }

    if (link.beneficiaryId !== beneficiaryId) {
      res.status(403).json({ error: 'Not authorized to make claim for this user' });
      return;
    }

    if (link.status !== 'active') {
      res.status(400).json({ error: 'Beneficiary link is not active' });
      return;
    }

    // Check if there's already a pending claim
    const existingClaim = await prisma.deathClaim.findFirst({
      where: {
        linkId,
        status: {
          in: ['pending', 'email_verification', 'phone_verification'],
        },
      },
    });

    if (existingClaim) {
      res.status(400).json({
        error: 'A death claim is already in progress for this user',
        claimId: existingClaim.id,
      });
      return;
    }

    // Create death claim
    const claim = await prisma.deathClaim.create({
      data: {
        linkId,
        userId: link.userId,
        beneficiaryId,
        status: 'email_verification',
        currentStage: 'email_level',
      },
    });

    // Send first email verification to user
    await sendEmailVerification(claim.id, link.user);

    // Send claim submission notification to beneficiary
    await emailService.sendDeathClaimSubmitted(beneficiary.email, link.user.email);

    // Record notification
    await prisma.deathClaimNotification.create({
      data: {
        claimId: claim.id,
        notificationType: 'claim_submitted',
        emailStatus: 'sent',
      },
    });

    logger.info('Death claim submitted:', {
      claimId: claim.id,
      beneficiaryId,
      userId: link.userId,
    });

    res.status(201).json({
      message: 'Death claim submitted successfully',
      claim: {
        id: claim.id,
        status: claim.status,
        currentStage: claim.currentStage,
        createdAt: claim.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error submitting death claim:', error);
    res.status(500).json({ error: 'Failed to submit death claim' });
  }
}

/**
 * Send email verification to user
 */
async function sendEmailVerification(claimId: string, user: any): Promise<void> {
  const claim = await prisma.deathClaim.findUnique({
    where: { id: claimId },
  });

  if (!claim) {
    throw new Error('Claim not found');
  }

  // Send email to user
  await emailService.sendDeathVerificationEmail(user.email, claim.id);

  // Update claim
  await prisma.deathClaim.update({
    where: { id: claimId },
    data: {
      emailVerificationSentAt: new Date(),
      emailVerificationCount: { increment: 1 },
    },
  });

  // Record event
  await prisma.deathVerificationEvent.create({
    data: {
      claimId,
      eventType: 'email_sent',
      verificationLevel: 'email',
      details: JSON.stringify({
        attemptNumber: claim.emailVerificationCount + 1,
        email: user.email,
      }),
    },
  });

  logger.info('Email verification sent:', {
    claimId,
    attemptNumber: claim.emailVerificationCount + 1,
    email: user.email,
  });
}

/**
 * Send phone verification to user
 */
async function sendPhoneVerification(claimId: string, user: any): Promise<void> {
  const claim = await prisma.deathClaim.findUnique({
    where: { id: claimId },
  });

  if (!claim) {
    throw new Error('Claim not found');
  }

  if (!user.phoneNumber || !user.phoneVerified) {
    logger.warn('Cannot send phone verification - no verified phone number:', {
      claimId,
      userId: user.id,
    });
    // Skip phone verification and move to key retrieval
    await moveToKeyRetrieval(claimId);
    return;
  }

  // Send SMS to user
  await smsService.sendDeathVerificationSMS(user.phoneNumber);

  // Update claim
  await prisma.deathClaim.update({
    where: { id: claimId },
    data: {
      phoneVerificationSentAt: new Date(),
      phoneVerificationCount: { increment: 1 },
    },
  });

  // Record event
  await prisma.deathVerificationEvent.create({
    data: {
      claimId,
      eventType: 'phone_sent',
      verificationLevel: 'phone',
      details: JSON.stringify({
        attemptNumber: claim.phoneVerificationCount + 1,
        phoneNumber: user.phoneNumber,
      }),
    },
  });

  logger.info('Phone verification sent:', {
    claimId,
    attemptNumber: claim.phoneVerificationCount + 1,
    phoneNumber: user.phoneNumber,
  });
}

/**
 * Move to phone verification stage
 */
async function moveToPhoneVerification(claimId: string): Promise<void> {
  const claim = await prisma.deathClaim.findUnique({
    where: { id: claimId },
    include: {
      link: {
        include: {
          user: true,
          beneficiary: true,
        },
      },
    },
  });

  if (!claim) {
    throw new Error('Claim not found');
  }

  // Update claim stage
  await prisma.deathClaim.update({
    where: { id: claimId },
    data: {
      status: 'phone_verification',
      currentStage: 'phone_level',
    },
  });

  // Send notification to beneficiary
  await emailService.sendDeathClaimPhoneStageStarted(
    claim.link.beneficiary.email,
    claim.link.user.email
  );

  // Record notification
  await prisma.deathClaimNotification.create({
    data: {
      claimId,
      notificationType: 'phone_stage_started',
      emailStatus: 'sent',
    },
  });

  // Send first phone verification
  await sendPhoneVerification(claimId, claim.link.user);

  logger.info('Moved to phone verification stage:', { claimId });
}

/**
 * Move to key retrieval stage
 */
async function moveToKeyRetrieval(claimId: string): Promise<void> {
  const claim = await prisma.deathClaim.findUnique({
    where: { id: claimId },
    include: {
      link: {
        include: {
          beneficiary: true,
          user: true,
        },
      },
    },
  });

  if (!claim) {
    throw new Error('Claim not found');
  }

  // Update claim stage
  await prisma.deathClaim.update({
    where: { id: claimId },
    data: {
      status: 'approved',
      currentStage: 'key_retrieval',
      verifiedAt: new Date(),
    },
  });

  // Send notification to beneficiary
  await emailService.sendDeathClaimVerificationComplete(
    claim.link.beneficiary.email,
    claim.link.user.email
  );

  // Record notification
  await prisma.deathClaimNotification.create({
    data: {
      claimId,
      notificationType: 'verification_complete',
      emailStatus: 'sent',
    },
  });

  logger.info('Moved to key retrieval stage:', { claimId });
}

/**
 * Get death claim status (for beneficiary)
 */
export async function getDeathClaimStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const beneficiaryId = req.userId!;
    const { claimId } = req.params;

    const claim = await prisma.deathClaim.findUnique({
      where: { id: claimId },
      include: {
        link: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        verificationEvents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        progressNotifications: {
          orderBy: {
            sentAt: 'desc',
          },
        },
      },
    });

    if (!claim) {
      res.status(404).json({ error: 'Death claim not found' });
      return;
    }

    if (claim.beneficiaryId !== beneficiaryId) {
      res.status(403).json({ error: 'Not authorized to view this claim' });
      return;
    }

    res.json({
      claim: {
        id: claim.id,
        status: claim.status,
        currentStage: claim.currentStage,
        emailVerificationCount: claim.emailVerificationCount,
        phoneVerificationCount: claim.phoneVerificationCount,
        verifiedAt: claim.verifiedAt,
        keyRetrievedAt: claim.keyRetrievedAt,
        keyRetrievalTxHash: claim.keyRetrievalTxHash,
        createdAt: claim.createdAt,
        updatedAt: claim.updatedAt,
      },
      user: claim.link.user,
      timeline: claim.verificationEvents,
      notifications: claim.progressNotifications,
    });
  } catch (error) {
    logger.error('Error fetching death claim status:', error);
    res.status(500).json({ error: 'Failed to fetch death claim status' });
  }
}

/**
 * Get all death claims for beneficiary
 */
export async function getMyDeathClaims(req: AuthRequest, res: Response): Promise<void> {
  try {
    const beneficiaryId = req.userId!;

    const claims = await prisma.deathClaim.findMany({
      where: { beneficiaryId },
      include: {
        link: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      claims: claims.map(claim => ({
        id: claim.id,
        user: claim.link.user,
        status: claim.status,
        currentStage: claim.currentStage,
        createdAt: claim.createdAt,
        verifiedAt: claim.verifiedAt,
        keyRetrievedAt: claim.keyRetrievedAt,
      })),
      count: claims.length,
    });
  } catch (error) {
    logger.error('Error fetching death claims:', error);
    res.status(500).json({ error: 'Failed to fetch death claims' });
  }
}

/**
 * User responds to death verification (confirms they're alive)
 * This endpoint is called when user clicks link in email/SMS
 */
export async function respondToDeathVerification(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { claimId } = req.body;

    const claim = await prisma.deathClaim.findUnique({
      where: { id: claimId },
      include: {
        link: {
          include: {
            beneficiary: true,
          },
        },
      },
    });

    if (!claim) {
      res.status(404).json({ error: 'Death claim not found' });
      return;
    }

    if (claim.userId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    // Reject the claim
    await prisma.deathClaim.update({
      where: { id: claimId },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: 'User confirmed they are alive',
      },
    });

    // Record event
    await prisma.deathVerificationEvent.create({
      data: {
        claimId,
        eventType: 'user_responded',
        verificationLevel: claim.currentStage === 'email_level' ? 'email' : 'phone',
        details: JSON.stringify({
          respondedAt: new Date(),
          userConfirmedAlive: true,
        }),
      },
    });

    // Notify beneficiary
    await emailService.sendDeathClaimRejected(
      claim.link.beneficiary.email,
      'User confirmed they are alive'
    );

    logger.info('User responded to death verification - claim rejected:', {
      claimId,
      userId,
    });

    res.json({
      message: 'Thank you for confirming. The death claim has been rejected.',
    });
  } catch (error) {
    logger.error('Error responding to death verification:', error);
    res.status(500).json({ error: 'Failed to process response' });
  }
}

/**
 * Mark key as retrieved (called after beneficiary retrieves key from blockchain)
 */
export async function markKeyRetrieved(req: AuthRequest, res: Response): Promise<void> {
  try {
    const beneficiaryId = req.userId!;
    const { claimId, txHash } = req.body;

    const claim = await prisma.deathClaim.findUnique({
      where: { id: claimId },
      include: {
        link: {
          include: {
            beneficiary: true,
            user: true,
          },
        },
      },
    });

    if (!claim) {
      res.status(404).json({ error: 'Death claim not found' });
      return;
    }

    if (claim.beneficiaryId !== beneficiaryId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    if (claim.currentStage !== 'key_retrieval') {
      res.status(400).json({ error: 'Claim is not in key retrieval stage' });
      return;
    }

    // Update claim
    await prisma.deathClaim.update({
      where: { id: claimId },
      data: {
        currentStage: 'completed',
        keyRetrievedAt: new Date(),
        keyRetrievalTxHash: txHash,
      },
    });

    // Send final notification to beneficiary
    await emailService.sendDeathClaimKeyRetrieved(
      claim.link.beneficiary.email,
      claim.link.user.email,
      txHash
    );

    // Record notification
    await prisma.deathClaimNotification.create({
      data: {
        claimId,
        notificationType: 'key_retrieved',
        emailStatus: 'sent',
      },
    });

    logger.info('Key retrieval marked as complete:', {
      claimId,
      beneficiaryId,
      txHash,
    });

    res.json({
      message: 'Key retrieval recorded successfully',
      txHash,
    });
  } catch (error) {
    logger.error('Error marking key retrieved:', error);
    res.status(500).json({ error: 'Failed to mark key retrieved' });
  }
}

// Export helper functions for cron job
export {
  sendEmailVerification,
  sendPhoneVerification,
  moveToPhoneVerification,
  moveToKeyRetrieval,
  EMAIL_VERIFICATION_ATTEMPTS,
  EMAIL_VERIFICATION_INTERVAL_DAYS,
  PHONE_VERIFICATION_ATTEMPTS,
  PHONE_VERIFICATION_INTERVAL_DAYS,
};
