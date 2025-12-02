import cron from 'node-cron';
import { prisma } from '../config/database';
import { emailService } from './email.service';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

class HeartbeatService {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Start the heartbeat monitoring cron job
   */
  start(): void {
    if (this.cronJob) {
      logger.warn('Heartbeat service already running');
      return;
    }

    this.cronJob = cron.schedule(config.heartbeatCheckCron, async () => {
      logger.info('Running heartbeat check...');
      await this.checkMissedHeartbeats();
    });

    logger.info(`Heartbeat service started with schedule: ${config.heartbeatCheckCron}`);
  }

  /**
   * Stop the heartbeat monitoring cron job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Heartbeat service stopped');
    }
  }

  /**
   * Check for missed heartbeats and trigger recovery
   */
  async checkMissedHeartbeats(): Promise<void> {
    try {
      const now = new Date();
      const gracePeriodMs = config.heartbeatGracePeriodDays * 24 * 60 * 60 * 1000;

      // Find heartbeats that haven't checked in within their interval + grace period
      const missedHeartbeats = await prisma.heartbeat.findMany({
        where: {
          recoveryTriggered: false,
        },
        include: {
          beneficiaries: true,
          user: true,
        },
      });

      for (const heartbeat of missedHeartbeats) {
        const lastCheckInTime = heartbeat.lastCheckIn.getTime();
        const intervalMs = heartbeat.intervalDays * 24 * 60 * 60 * 1000;
        const deadlineMs = lastCheckInTime + intervalMs + gracePeriodMs;

        if (now.getTime() > deadlineMs) {
          logger.warn('Missed heartbeat detected:', {
            heartbeatId: heartbeat.id,
            userId: heartbeat.userId,
            lastCheckIn: heartbeat.lastCheckIn,
            intervalDays: heartbeat.intervalDays,
          });

          await this.triggerRecovery(heartbeat);
        }
      }

      logger.info('Heartbeat check completed');
    } catch (error) {
      logger.error('Error checking missed heartbeats:', error);
    }
  }

  /**
   * Trigger recovery process for a missed heartbeat
   */
  private async triggerRecovery(heartbeat: any): Promise<void> {
    try {
      // Mark recovery as triggered
      await prisma.heartbeat.update({
        where: { id: heartbeat.id },
        data: { recoveryTriggered: true },
      });

      logger.info('Recovery triggered:', { heartbeatId: heartbeat.id });

      // Send notifications to all beneficiaries
      for (const beneficiary of heartbeat.beneficiaries) {
        try {
          const result = await emailService.sendRecoveryNotification(
            beneficiary.email,
            beneficiary.name,
            beneficiary.shareTwoEncrypted,
            heartbeat.encryptedFileHash
          );

          // Log notification
          await prisma.notificationLog.create({
            data: {
              heartbeatId: heartbeat.id,
              beneficiaryId: beneficiary.id,
              emailStatus: result.success ? 'sent' : 'failed',
              emailProviderId: result.messageId,
              errorMessage: result.error,
            },
          });

          // Update beneficiary notification time
          if (result.success) {
            await prisma.beneficiary.update({
              where: { id: beneficiary.id },
              data: { notifiedAt: new Date() },
            });

            logger.info('Beneficiary notified:', {
              beneficiaryId: beneficiary.id,
              email: beneficiary.email,
            });
          } else {
            logger.error('Failed to notify beneficiary:', {
              beneficiaryId: beneficiary.id,
              email: beneficiary.email,
              error: result.error,
            });
          }
        } catch (error) {
          logger.error('Error sending notification to beneficiary:', {
            beneficiaryId: beneficiary.id,
            error,
          });
        }
      }

      logger.info('Recovery process completed:', {
        heartbeatId: heartbeat.id,
        beneficiariesNotified: heartbeat.beneficiaries.length,
      });
    } catch (error) {
      logger.error('Error triggering recovery:', { heartbeatId: heartbeat.id, error });
    }
  }

  /**
   * Manually trigger recovery for testing
   */
  async manualTriggerRecovery(heartbeatId: string): Promise<void> {
    const heartbeat = await prisma.heartbeat.findUnique({
      where: { id: heartbeatId },
      include: {
        beneficiaries: true,
        user: true,
      },
    });

    if (!heartbeat) {
      throw new Error('Heartbeat not found');
    }

    if (heartbeat.recoveryTriggered) {
      throw new Error('Recovery already triggered for this heartbeat');
    }

    await this.triggerRecovery(heartbeat);
  }
}

export const heartbeatService = new HeartbeatService();
