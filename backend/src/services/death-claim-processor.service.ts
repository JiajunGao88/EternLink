import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import {
  sendEmailVerification,
  sendPhoneVerification,
  moveToPhoneVerification,
  moveToKeyRetrieval,
  EMAIL_VERIFICATION_ATTEMPTS,
  EMAIL_VERIFICATION_INTERVAL_DAYS,
  PHONE_VERIFICATION_ATTEMPTS,
  PHONE_VERIFICATION_INTERVAL_DAYS,
} from '../controllers/death-claim.controller';

/**
 * Death Claim Processor Service
 * Runs periodically to process pending death claims and send verification messages
 */
class DeathClaimProcessorService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 60 * 60 * 1000; // Run every hour

  /**
   * Start the death claim processor service
   */
  start(): void {
    if (this.intervalId) {
      logger.warn('Death claim processor is already running');
      return;
    }

    logger.info('Starting death claim processor service');

    // Run immediately on start
    this.processClaims();

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.processClaims();
    }, this.CHECK_INTERVAL_MS);

    logger.info('Death claim processor service started', {
      checkIntervalMs: this.CHECK_INTERVAL_MS,
    });
  }

  /**
   * Stop the death claim processor service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Death claim processor service stopped');
    }
  }

  /**
   * Main processing function - checks all pending claims and sends verifications
   */
  private async processClaims(): Promise<void> {
    try {
      logger.info('Death claim processor: Starting claim processing cycle');

      // Process email verification claims
      await this.processEmailVerificationClaims();

      // Process phone verification claims
      await this.processPhoneVerificationClaims();

      logger.info('Death claim processor: Claim processing cycle completed');
    } catch (error) {
      logger.error('Error in death claim processor:', error);
    }
  }

  /**
   * Process claims in email verification stage
   */
  private async processEmailVerificationClaims(): Promise<void> {
    try {
      // Find all claims in email verification stage
      const claims = await prisma.deathClaim.findMany({
        where: {
          status: 'email_verification',
          currentStage: 'email_level',
        },
        include: {
          link: {
            include: {
              user: true,
              beneficiary: true,
            },
          },
        },
      });

      logger.info(`Death claim processor: Found ${claims.length} claims in email verification stage`);

      for (const claim of claims) {
        try {
          // Check if we've reached max attempts
          if (claim.emailVerificationCount >= EMAIL_VERIFICATION_ATTEMPTS) {
            logger.info('Email verification attempts exhausted, moving to phone stage:', {
              claimId: claim.id,
              attempts: claim.emailVerificationCount,
            });
            await moveToPhoneVerification(claim.id);
            continue;
          }

          // Check if it's time to send next email
          if (this.shouldSendEmailVerification(claim)) {
            logger.info('Sending email verification:', {
              claimId: claim.id,
              attemptNumber: claim.emailVerificationCount + 1,
            });
            await sendEmailVerification(claim.id, claim.link.user);
          }
        } catch (error) {
          logger.error('Error processing email verification claim:', {
            claimId: claim.id,
            error,
          });
        }
      }
    } catch (error) {
      logger.error('Error processing email verification claims:', error);
    }
  }

  /**
   * Process claims in phone verification stage
   */
  private async processPhoneVerificationClaims(): Promise<void> {
    try {
      // Find all claims in phone verification stage
      const claims = await prisma.deathClaim.findMany({
        where: {
          status: 'phone_verification',
          currentStage: 'phone_level',
        },
        include: {
          link: {
            include: {
              user: true,
              beneficiary: true,
            },
          },
        },
      });

      logger.info(`Death claim processor: Found ${claims.length} claims in phone verification stage`);

      for (const claim of claims) {
        try {
          // Check if we've reached max attempts
          if (claim.phoneVerificationCount >= PHONE_VERIFICATION_ATTEMPTS) {
            logger.info('Phone verification attempts exhausted, moving to key retrieval:', {
              claimId: claim.id,
              attempts: claim.phoneVerificationCount,
            });
            await moveToKeyRetrieval(claim.id);
            continue;
          }

          // Check if it's time to send next SMS
          if (this.shouldSendPhoneVerification(claim)) {
            logger.info('Sending phone verification:', {
              claimId: claim.id,
              attemptNumber: claim.phoneVerificationCount + 1,
            });
            await sendPhoneVerification(claim.id, claim.link.user);
          }
        } catch (error) {
          logger.error('Error processing phone verification claim:', {
            claimId: claim.id,
            error,
          });
        }
      }
    } catch (error) {
      logger.error('Error processing phone verification claims:', error);
    }
  }

  /**
   * Determine if we should send email verification
   */
  private shouldSendEmailVerification(claim: any): boolean {
    // If no email has been sent yet, send immediately
    if (!claim.emailVerificationSentAt) {
      return true;
    }

    // Calculate time since last email
    const now = new Date();
    const lastSentAt = new Date(claim.emailVerificationSentAt);
    const daysSinceLastEmail = (now.getTime() - lastSentAt.getTime()) / (1000 * 60 * 60 * 24);

    // Send if enough days have passed
    return daysSinceLastEmail >= EMAIL_VERIFICATION_INTERVAL_DAYS;
  }

  /**
   * Determine if we should send phone verification
   */
  private shouldSendPhoneVerification(claim: any): boolean {
    // If no SMS has been sent yet, send immediately
    if (!claim.phoneVerificationSentAt) {
      return true;
    }

    // Calculate time since last SMS
    const now = new Date();
    const lastSentAt = new Date(claim.phoneVerificationSentAt);
    const daysSinceLastSMS = (now.getTime() - lastSentAt.getTime()) / (1000 * 60 * 60 * 24);

    // Send if enough days have passed
    return daysSinceLastSMS >= PHONE_VERIFICATION_INTERVAL_DAYS;
  }

  /**
   * Get service status
   */
  getStatus(): { running: boolean; checkIntervalMs: number } {
    return {
      running: this.intervalId !== null,
      checkIntervalMs: this.CHECK_INTERVAL_MS,
    };
  }
}

export const deathClaimProcessorService = new DeathClaimProcessorService();
