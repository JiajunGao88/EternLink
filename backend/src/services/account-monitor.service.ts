import cron from 'node-cron';
import { prisma } from '../config/database';
import { emailService } from './email.service';
import { smsService } from './sms.service';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

class AccountMonitorService {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Start the account monitoring cron job
   */
  start(): void {
    if (this.cronJob) {
      logger.warn('Account monitor service already running');
      return;
    }

    // Run daily at 2 AM (different from heartbeat check to spread load)
    this.cronJob = cron.schedule('0 2 * * *', async () => {
      logger.info('Running account inactivity check...');
      await this.checkInactiveAccounts();
    });

    logger.info('Account monitor service started');
  }

  /**
   * Stop the account monitoring cron job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Account monitor service stopped');
    }
  }

  /**
   * Check for inactive accounts and send notifications
   */
  async checkInactiveAccounts(): Promise<void> {
    try {
      const now = new Date();

      // Find all users with notification settings configured
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { emailNotificationDays: { not: null } },
            { phoneNotificationDays: { not: null } },
            { freezeDays: { not: null } },
          ],
          accountFrozen: false, // Don't check already frozen accounts
        },
      });

      for (const user of users) {
        if (!user.lastLoginAt) continue;

        const daysSinceLogin = Math.floor(
          (now.getTime() - user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check freeze threshold
        if (user.freezeDays && daysSinceLogin >= user.freezeDays) {
          await this.freezeAccount(user, daysSinceLogin);
          continue;
        }

        // Check phone notification threshold
        if (
          user.phoneNotificationDays &&
          daysSinceLogin >= user.phoneNotificationDays &&
          daysSinceLogin < (user.freezeDays || Infinity)
        ) {
          await this.sendPhoneNotification(user, daysSinceLogin);
        }

        // Check email notification threshold
        if (
          user.emailNotificationDays &&
          daysSinceLogin >= user.emailNotificationDays &&
          daysSinceLogin < (user.phoneNotificationDays || Infinity)
        ) {
          await this.sendEmailNotification(user, daysSinceLogin);
        }
      }

      logger.info('Account inactivity check completed');
    } catch (error) {
      logger.error('Error checking inactive accounts:', error);
    }
  }

  /**
   * Send email notification for inactivity
   */
  private async sendEmailNotification(user: any, daysSinceLogin: number): Promise<void> {
    try {
      // Check if we already sent notification today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const recentNotification = await prisma.loginHistory.findFirst({
        where: {
          userId: user.id,
          loginAt: { gte: today },
        },
      });

      if (recentNotification) {
        logger.debug('Email notification already sent today:', { userId: user.id });
        return;
      }

      await emailService.sendInactivityNotification(
        user.email,
        user.email.split('@')[0],
        daysSinceLogin,
        'email'
      );

      logger.info('Email notification sent:', {
        userId: user.id,
        email: user.email,
        daysSinceLogin,
      });
    } catch (error) {
      logger.error('Error sending email notification:', {
        userId: user.id,
        error,
      });
    }
  }

  /**
   * Send phone notification for inactivity
   */
  private async sendPhoneNotification(user: any, daysSinceLogin: number): Promise<void> {
    try {
      // Send email notification (phone level)
      await emailService.sendInactivityNotification(
        user.email,
        user.email.split('@')[0],
        daysSinceLogin,
        'phone'
      );

      // Send SMS notification
      if (user.phoneNumber && user.phoneVerified) {
        const smsResult = await smsService.sendInactivityNotification(
          user.phoneNumber,
          daysSinceLogin
        );

        if (smsResult.success) {
          logger.info('SMS notification sent:', {
            userId: user.id,
            phoneNumber: user.phoneNumber,
            messageId: smsResult.messageId,
          });
        } else {
          logger.error('SMS notification failed:', {
            userId: user.id,
            phoneNumber: user.phoneNumber,
            error: smsResult.error,
          });
        }
      }

      logger.info('Phone level notification sent:', {
        userId: user.id,
        daysSinceLogin,
      });
    } catch (error) {
      logger.error('Error sending phone notification:', {
        userId: user.id,
        error,
      });
    }
  }

  /**
   * Freeze account due to prolonged inactivity
   */
  private async freezeAccount(user: any, daysSinceLogin: number): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          accountFrozen: true,
          freezeReason: `Account frozen due to ${daysSinceLogin} days of inactivity`,
        },
      });

      // Send freeze notification email
      await emailService.sendInactivityNotification(
        user.email,
        user.email.split('@')[0],
        daysSinceLogin,
        'freeze'
      );

      logger.warn('Account frozen:', {
        userId: user.id,
        email: user.email,
        daysSinceLogin,
      });
    } catch (error) {
      logger.error('Error freezing account:', {
        userId: user.id,
        error,
      });
    }
  }
}

export const accountMonitorService = new AccountMonitorService();
