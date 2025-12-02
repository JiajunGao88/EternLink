import nodemailer from 'nodemailer';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const info = await this.transporter.sendMail({
        from: config.emailFrom,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      logger.info('Email sent successfully:', { to: options.to, messageId: info.messageId });

      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      logger.error('Failed to send email:', { to: options.to, error: error.message });
      return { success: false, error: error.message };
    }
  }

  async sendRecoveryNotification(
    beneficiaryEmail: string,
    beneficiaryName: string,
    shareTwoEncrypted: string,
    fileHash: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = 'EternLink Recovery Notification - You Have Been Named as a Beneficiary';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EternLink Recovery Notification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2942 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #C0C8D4; margin: 0; font-size: 28px;">EternLink</h1>
    <p style="color: #8b96a8; margin: 10px 0 0 0;">Dead Man's Switch Activated</p>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #1a2942; margin-top: 0;">Dear ${beneficiaryName},</h2>

    <p>You have been named as a beneficiary in an EternLink Dead Man's Switch. The account holder has not checked in for their specified interval, and their recovery process has been initiated.</p>

    <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #C0C8D4; margin: 20px 0;">
      <h3 style="color: #1a2942; margin-top: 0;">Your Recovery Share (Share 2)</h3>
      <p style="margin: 10px 0; font-size: 14px; color: #666;">This encrypted share is part of a Shamir's Secret Sharing scheme. You will need to combine it with Share 3 (from the file metadata or blockchain) to reconstruct the decryption key.</p>
      <div style="background: #fff; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 12px; margin-top: 10px;">
        ${shareTwoEncrypted}
      </div>
    </div>

    <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
      <h3 style="color: #856404; margin-top: 0;">File Information</h3>
      <p style="margin: 5px 0; font-size: 14px; color: #856404;"><strong>Encrypted File Hash:</strong></p>
      <p style="margin: 5px 0; font-family: monospace; font-size: 12px; word-break: break-all; color: #856404;">${fileHash}</p>
    </div>

    <h3 style="color: #1a2942;">How to Use This Share</h3>
    <ol style="line-height: 1.8;">
      <li>Save this email securely or copy the encrypted share above</li>
      <li>Locate the encrypted file (you should have received this separately)</li>
      <li>Extract Share 3 from the file metadata or retrieve it from the blockchain</li>
      <li>Visit the EternLink recovery portal at <a href="https://eternlink.com/recovery" style="color: #C0C8D4;">eternlink.com/recovery</a></li>
      <li>Upload the encrypted file and provide both Share 2 (above) and Share 3</li>
      <li>The system will reconstruct the decryption key and decrypt your file</li>
    </ol>

    <div style="background: #e7f3ff; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #0c5484;"><strong>Security Note:</strong> This share alone cannot decrypt the file. You need at least 2 out of 3 shares to reconstruct the decryption key. This is a zero-knowledge system - the EternLink backend never had access to the plaintext password.</p>
    </div>

    <p style="margin-top: 30px;">If you have questions or need assistance, please contact EternLink support.</p>

    <p style="margin-top: 20px;">Best regards,<br><strong>EternLink Team</strong></p>
  </div>

  <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="margin: 0; font-size: 12px; color: #6c757d;">© 2025 EternLink. All rights reserved.</p>
    <p style="margin: 5px 0 0 0; font-size: 12px; color: #6c757d;">
      Secured with AES-256-GCM Encryption · Base Sepolia L2 Network
    </p>
  </div>
</body>
</html>
    `;

    const text = `
EternLink Recovery Notification

Dear ${beneficiaryName},

You have been named as a beneficiary in an EternLink Dead Man's Switch. The account holder has not checked in for their specified interval, and their recovery process has been initiated.

Your Recovery Share (Share 2):
${shareTwoEncrypted}

Encrypted File Hash:
${fileHash}

How to Use This Share:
1. Save this email securely or copy the encrypted share above
2. Locate the encrypted file (you should have received this separately)
3. Extract Share 3 from the file metadata or retrieve it from the blockchain
4. Visit the EternLink recovery portal at https://eternlink.com/recovery
5. Upload the encrypted file and provide both Share 2 (above) and Share 3
6. The system will reconstruct the decryption key and decrypt your file

Security Note: This share alone cannot decrypt the file. You need at least 2 out of 3 shares to reconstruct the decryption key.

Best regards,
EternLink Team

© 2025 EternLink. All rights reserved.
    `;

    return this.sendEmail({
      to: beneficiaryEmail,
      subject,
      html,
      text,
    });
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error: any) {
      logger.error('Email service connection failed:', error.message);
      return false;
    }
  }
}

export const emailService = new EmailService();
