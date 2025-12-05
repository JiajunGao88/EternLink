import { config } from '../config/environment';
import { logger } from '../utils/logger';

// Twilio types (will be installed via npm)
interface TwilioClient {
  messages: {
    create: (options: any) => Promise<any>;
  };
}

class SMSService {
  private client: TwilioClient | null = null;
  private enabled: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      // Check if Twilio credentials are configured
      if (!config.twilio.accountSid || !config.twilio.authToken || !config.twilio.phoneNumber) {
        logger.warn('Twilio credentials not configured. SMS service disabled.');
        return;
      }

      // In production, uncomment this to use real Twilio:
      // const twilio = require('twilio');
      // this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
      // this.enabled = true;
      // logger.info('SMS service initialized with Twilio');

      // For now, use mock mode
      logger.info('SMS service initialized in MOCK mode');
      this.enabled = true;
    } catch (error: any) {
      logger.error('Failed to initialize SMS service:', error.message);
    }
  }

  /**
   * Send SMS message
   */
  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.enabled) {
      logger.warn('SMS service not enabled, skipping SMS to:', to);
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      // MOCK MODE - Just log the message
      // In production, uncomment the real Twilio code below
      logger.info('📱 [MOCK SMS]', {
        to,
        message: message.substring(0, 100),
        from: config.twilio.phoneNumber,
      });

      // Simulate success
      return {
        success: true,
        messageId: `MOCK_${Date.now()}`,
      };

      // PRODUCTION CODE (uncomment when ready):
      /*
      const result = await this.client!.messages.create({
        body: message,
        from: config.twilio.phoneNumber,
        to: to,
      });

      logger.info('SMS sent successfully:', {
        to,
        messageId: result.sid,
      });

      return {
        success: true,
        messageId: result.sid,
      };
      */
    } catch (error: any) {
      logger.error('Failed to send SMS:', {
        to,
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send verification code via SMS
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Your EternLink verification code is: ${code}\n\nThis code will expire in 15 minutes.\n\nIf you didn't request this code, please ignore this message.`;

    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send inactivity notification via SMS
   */
  async sendInactivityNotification(
    phoneNumber: string,
    daysSinceLogin: number
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `⚠️ EternLink Account Alert\n\nYour account has been inactive for ${daysSinceLogin} days. Please log in to prevent account freeze.\n\nLog in at: https://eternlink.com/login`;

    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send account freeze warning via SMS
   */
  async sendFreezeWarning(
    phoneNumber: string,
    daysSinceLogin: number,
    daysUntilFreeze: number
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `🚨 URGENT - EternLink Account\n\nYour account has been inactive for ${daysSinceLogin} days and will be FROZEN in ${daysUntilFreeze} days.\n\nVoice verification will be required to unlock.\n\nLog in NOW: https://eternlink.com/login`;

    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send account frozen notification via SMS
   */
  async sendAccountFrozenNotification(
    phoneNumber: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `🔒 EternLink Account FROZEN\n\nYour account has been frozen due to prolonged inactivity.\n\nTo unlock, you must verify your identity using voice verification.\n\nVisit: https://eternlink.com/login`;

    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send 2FA code via SMS
   */
  async send2FACode(phoneNumber: string, code: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Your EternLink 2FA code is: ${code}\n\nThis code will expire in 5 minutes.`;

    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send death verification SMS (sent to USER when beneficiary claims death)
   */
  async sendDeathVerificationSMS(phoneNumber: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `⚠️ URGENT - EternLink Death Claim\n\nSomeone has reported you DECEASED. If you are ALIVE, log in IMMEDIATELY to reject this claim.\n\nYour encrypted files will be released if you don't respond.\n\nLog in NOW: https://eternlink.com/death-verification`;

    logger.info('Sending death verification SMS:', {
      phoneNumber: phoneNumber.substring(0, 7) + '***', // Partially hide phone number in logs
    });

    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Verify SMS service is working
   */
  async verifyService(): Promise<boolean> {
    return this.enabled;
  }
}

export const smsService = new SMSService();
