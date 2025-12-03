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

  async sendVerificationCode(email: string, code: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = 'EternLink Email Verification Code';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2942 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #C0C8D4; margin: 0; font-size: 28px;">EternLink</h1>
    <p style="color: #8b96a8; margin: 10px 0 0 0;">Email Verification</p>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #1a2942; margin-top: 0;">Verify Your Email Address</h2>

    <p>Thank you for registering with EternLink. Please use the verification code below to complete your registration:</p>

    <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #C0C8D4; margin: 20px 0; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #666;">Your Verification Code</p>
      <div style="font-size: 32px; font-weight: bold; color: #1a2942; letter-spacing: 8px; margin-top: 10px; font-family: monospace;">
        ${code}
      </div>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">This code will expire in 15 minutes</p>
    </div>

    <p>If you didn't request this verification code, please ignore this email.</p>

    <p style="margin-top: 30px;">Best regards,<br><strong>EternLink Team</strong></p>
  </div>

  <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="margin: 0; font-size: 12px; color: #6c757d;">© 2025 EternLink. All rights reserved.</p>
  </div>
</body>
</html>
    `;

    const text = `
EternLink Email Verification

Your verification code: ${code}

This code will expire in 15 minutes.

If you didn't request this verification code, please ignore this email.

Best regards,
EternLink Team

© 2025 EternLink. All rights reserved.
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async sendPasswordResetCode(email: string, code: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = 'EternLink Password Reset Code';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2942 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #C0C8D4; margin: 0; font-size: 28px;">EternLink</h1>
    <p style="color: #8b96a8; margin: 10px 0 0 0;">Password Reset Request</p>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #1a2942; margin-top: 0;">Reset Your Password</h2>

    <p>We received a request to reset your password. Please use the verification code below to proceed:</p>

    <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #C0C8D4; margin: 20px 0; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #666;">Your Password Reset Code</p>
      <div style="font-size: 32px; font-weight: bold; color: #1a2942; letter-spacing: 8px; margin-top: 10px; font-family: monospace;">
        ${code}
      </div>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">This code will expire in 15 minutes</p>
    </div>

    <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #856404;"><strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
    </div>

    <p style="margin-top: 30px;">Best regards,<br><strong>EternLink Team</strong></p>
  </div>

  <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="margin: 0; font-size: 12px; color: #6c757d;">© 2025 EternLink. All rights reserved.</p>
  </div>
</body>
</html>
    `;

    const text = `
EternLink Password Reset

Your password reset code: ${code}

This code will expire in 15 minutes.

If you didn't request this password reset, please ignore this email. Your account remains secure.

Best regards,
EternLink Team

© 2025 EternLink. All rights reserved.
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async sendInactivityNotification(
    email: string,
    userName: string,
    daysSinceLogin: number,
    notificationLevel: 'email' | 'phone' | 'freeze'
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = `EternLink Account Alert - ${daysSinceLogin} Days of Inactivity`;

    let message = '';
    let urgency = '';

    if (notificationLevel === 'email') {
      urgency = 'Notice';
      message = `This is a friendly reminder that you haven't logged into your EternLink account for ${daysSinceLogin} days.`;
    } else if (notificationLevel === 'phone') {
      urgency = 'Important';
      message = `Your EternLink account has been inactive for ${daysSinceLogin} days. You will also receive an SMS notification.`;
    } else {
      urgency = 'Critical';
      message = `Your EternLink account has been inactive for ${daysSinceLogin} days and will be frozen soon. Voice verification will be required to unlock.`;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Inactivity Alert</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2942 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #C0C8D4; margin: 0; font-size: 28px;">EternLink</h1>
    <p style="color: #8b96a8; margin: 10px 0 0 0;">${urgency}: Account Inactivity</p>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #1a2942; margin-top: 0;">Hello ${userName || 'User'},</h2>

    <p>${message}</p>

    <div style="background: ${notificationLevel === 'freeze' ? '#fff3cd' : '#e7f3ff'}; padding: 20px; border-left: 4px solid ${notificationLevel === 'freeze' ? '#ffc107' : '#2196F3'}; margin: 20px 0;">
      <p style="margin: 0; font-weight: bold; color: ${notificationLevel === 'freeze' ? '#856404' : '#0c5484'};">Days Since Last Login: ${daysSinceLogin}</p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: ${notificationLevel === 'freeze' ? '#856404' : '#0c5484'};">Please log in to keep your account active.</p>
    </div>

    ${notificationLevel === 'freeze' ? `
    <div style="background: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #721c24;"><strong>Warning:</strong> If you don't log in soon, your account will be frozen and you'll need voice verification to unlock it.</p>
    </div>
    ` : ''}

    <p style="margin-top: 30px;">To prevent account freeze, please log in to your account:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://eternlink.com/login" style="background: linear-gradient(135deg, #C0C8D4 0%, #8b9da8 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Log In to Your Account</a>
    </div>

    <p style="margin-top: 30px;">Best regards,<br><strong>EternLink Team</strong></p>
  </div>

  <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="margin: 0; font-size: 12px; color: #6c757d;">© 2025 EternLink. All rights reserved.</p>
  </div>
</body>
</html>
    `;

    const text = `
EternLink Account Alert - ${daysSinceLogin} Days of Inactivity

Hello ${userName || 'User'},

${message}

Days Since Last Login: ${daysSinceLogin}

${notificationLevel === 'freeze' ? 'Warning: If you don\'t log in soon, your account will be frozen and you\'ll need voice verification to unlock it.' : ''}

Please log in to your account: https://eternlink.com/login

Best regards,
EternLink Team

© 2025 EternLink. All rights reserved.
    `;

    return this.sendEmail({
      to: email,
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

  /**
   * BENEFICIARY / DEATH CLAIM EMAIL TEMPLATES
   */

  /**
   * Email 1: Death claim submitted - sent to beneficiary
   */
  async sendDeathClaimSubmitted(beneficiaryEmail: string, userEmail: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = 'EternLink Death Claim Submitted';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Death Claim Submitted</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2942 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #C0C8D4; margin: 0; font-size: 28px;">EternLink</h1>
    <p style="color: #8b96a8; margin: 10px 0 0 0;">Death Claim Submitted</p>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #1a2942; margin-top: 0;">Claim Submitted Successfully</h2>

    <p>Your death claim for user <strong>${userEmail}</strong> has been submitted successfully.</p>

    <div style="background: #e7f3ff; padding: 20px; border-left: 4px solid #2196F3; margin: 20px 0;">
      <h3 style="color: #0c5484; margin-top: 0;">What Happens Next?</h3>
      <p style="margin: 5px 0; color: #0c5484;">We will begin the multi-level death verification process:</p>
      <ol style="margin: 10px 0; padding-left: 20px; color: #0c5484;">
        <li><strong>Email Level Verification</strong> - We will send 3 emails to the user over 9 days (one every 3 days)</li>
        <li><strong>Phone Level Verification</strong> - If no response, we will send 2 SMS messages over 4 days (one every 2 days)</li>
        <li><strong>Key Retrieval</strong> - If no response to either, you can retrieve the encryption key from the blockchain</li>
      </ol>
    </div>

    <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #856404;"><strong>Note:</strong> If the user responds to any verification message, the claim will be immediately rejected as they have confirmed they are alive.</p>
    </div>

    <p>You will receive email notifications at each stage of the process. You can track the progress in your beneficiary dashboard.</p>

    <p style="margin-top: 30px;">Best regards,<br><strong>EternLink Team</strong></p>
  </div>

  <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="margin: 0; font-size: 12px; color: #6c757d;">© 2025 EternLink. All rights reserved.</p>
  </div>
</body>
</html>
    `;

    const text = `
EternLink Death Claim Submitted

Your death claim for user ${userEmail} has been submitted successfully.

What Happens Next?
We will begin the multi-level death verification process:
1. Email Level Verification - We will send 3 emails to the user over 9 days (one every 3 days)
2. Phone Level Verification - If no response, we will send 2 SMS messages over 4 days (one every 2 days)
3. Key Retrieval - If no response to either, you can retrieve the encryption key from the blockchain

Note: If the user responds to any verification message, the claim will be immediately rejected.

You will receive email notifications at each stage. Track progress in your dashboard.

Best regards,
EternLink Team
    `;

    return this.sendEmail({
      to: beneficiaryEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Email 2: Death verification email - sent to USER
   */
  async sendDeathVerificationEmail(userEmail: string, claimId: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const verificationLink = `https://eternlink.com/death-verification/${claimId}`;

    const subject = '⚠️ URGENT: Account Death Verification Required';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Death Verification Required</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 28px;">⚠️ EternLink Alert</h1>
    <p style="color: #f8f9fa; margin: 10px 0 0 0;">Death Verification Required</p>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #dc3545; margin-top: 0;">URGENT: Someone Has Reported You Deceased</h2>

    <p>A beneficiary linked to your EternLink account has submitted a death claim stating that you have passed away.</p>

    <div style="background: #f8d7da; padding: 20px; border-left: 4px solid #dc3545; margin: 20px 0;">
      <p style="margin: 0; font-weight: bold; color: #721c24;">If you are receiving this email, you are ALIVE.</p>
      <p style="margin: 10px 0 0 0; color: #721c24;">Please click the button below immediately to confirm you are alive and reject this claim.</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationLink}" style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">I AM ALIVE - REJECT CLAIM</a>
    </div>

    <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #856404;"><strong>What happens if you don't respond?</strong></p>
      <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
        <li>We will send 2 more emails over the next 6 days</li>
        <li>Then we will send 2 SMS messages to your phone over 4 days</li>
        <li>If you don't respond to any messages, the claim will be approved and the beneficiary can access your encrypted files</li>
      </ul>
    </div>

    <p style="margin-top: 30px; font-size: 12px; color: #666;">If the button doesn't work, copy this link: ${verificationLink}</p>
  </div>

  <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="margin: 0; font-size: 12px; color: #6c757d;">© 2025 EternLink. All rights reserved.</p>
  </div>
</body>
</html>
    `;

    const text = `
⚠️ URGENT: EternLink Death Verification Required

Someone has reported you deceased!

A beneficiary linked to your EternLink account has submitted a death claim.

If you are receiving this email, you are ALIVE.

Please visit this link immediately to confirm and reject the claim:
${verificationLink}

What happens if you don't respond?
- We will send 2 more emails over the next 6 days
- Then we will send 2 SMS messages to your phone over 4 days
- If you don't respond, the claim will be approved and the beneficiary can access your files

EternLink Team
    `;

    return this.sendEmail({
      to: userEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Email 3: Phone stage started - sent to beneficiary
   */
  async sendDeathClaimPhoneStageStarted(beneficiaryEmail: string, userEmail: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = 'EternLink Death Claim - Phone Verification Stage Started';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0;">
  <title>Phone Verification Stage</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2942 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #C0C8D4; margin: 0; font-size: 28px;">EternLink</h1>
    <p style="color: #8b96a8; margin: 10px 0 0 0;">Progress Update</p>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #1a2942; margin-top: 0;">Phone Verification Stage Started</h2>

    <p>The death claim for user <strong>${userEmail}</strong> has progressed to the phone verification stage.</p>

    <div style="background: #e7f3ff; padding: 20px; border-left: 4px solid #2196F3; margin: 20px 0;">
      <h3 style="color: #0c5484; margin-top: 0;">Email Stage Complete</h3>
      <p style="margin: 5px 0; color: #0c5484;">The user did not respond to any of the 3 email verification attempts.</p>
    </div>

    <div style="background: #d1ecf1; padding: 20px; border-left: 4px solid #0c5460; margin: 20px 0;">
      <h3 style="color: #0c5460; margin-top: 0;">Current Stage: Phone Verification</h3>
      <p style="margin: 5px 0; color: #0c5460;">We are now sending SMS messages to the user's verified phone number:</p>
      <ul style="margin: 10px 0; padding-left: 20px; color: #0c5460;">
        <li>2 SMS messages will be sent over 4 days</li>
        <li>One SMS every 2 days</li>
        <li>If the user responds, the claim will be rejected</li>
      </ul>
    </div>

    <p>You will receive another email when this stage is complete.</p>

    <p style="margin-top: 30px;">Best regards,<br><strong>EternLink Team</strong></p>
  </div>

  <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="margin: 0; font-size: 12px; color: #6c757d;">© 2025 EternLink. All rights reserved.</p>
  </div>
</body>
</html>
    `;

    const text = `
EternLink Death Claim - Phone Verification Stage Started

The death claim for user ${userEmail} has progressed to phone verification.

Email Stage Complete:
The user did not respond to any of the 3 email verification attempts.

Current Stage: Phone Verification
- 2 SMS messages will be sent over 4 days
- One SMS every 2 days
- If the user responds, the claim will be rejected

You will receive another email when this stage is complete.

Best regards,
EternLink Team
    `;

    return this.sendEmail({
      to: beneficiaryEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Email 4: Verification complete - sent to beneficiary
   */
  async sendDeathClaimVerificationComplete(beneficiaryEmail: string, userEmail: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = 'EternLink Death Claim - Verification Complete ✓';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Complete</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #28a745 0%, #218838 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 28px;">✓ EternLink</h1>
    <p style="color: #f8f9fa; margin: 10px 0 0 0;">Verification Complete</p>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #28a745; margin-top: 0;">Death Verification Complete</h2>

    <p>The death claim for user <strong>${userEmail}</strong> has been verified and approved.</p>

    <div style="background: #d4edda; padding: 20px; border-left: 4px solid #28a745; margin: 20px 0;">
      <h3 style="color: #155724; margin-top: 0;">All Verification Stages Passed</h3>
      <p style="margin: 5px 0; color: #155724;">✓ Email verification - No response from user (3 attempts)</p>
      <p style="margin: 5px 0; color: #155724;">✓ Phone verification - No response from user (2 attempts)</p>
    </div>

    <div style="background: #e7f3ff; padding: 20px; border-left: 4px solid #2196F3; margin: 20px 0;">
      <h3 style="color: #0c5484; margin-top: 0;">Next Step: Retrieve Encryption Key</h3>
      <p style="margin: 5px 0; color: #0c5484;">You can now retrieve the encryption key from the blockchain to decrypt the user's files.</p>
      <ol style="margin: 10px 0; padding-left: 20px; color: #0c5484;">
        <li>Log in to your beneficiary dashboard</li>
        <li>Navigate to this death claim</li>
        <li>Click "Retrieve Key from Blockchain"</li>
        <li>The system will fetch Share 3 from the blockchain</li>
        <li>Combine it with Share 2 (sent to you earlier) to reconstruct the decryption key</li>
      </ol>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://eternlink.com/beneficiary/dashboard" style="background: linear-gradient(135deg, #C0C8D4 0%, #8b9da8 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Go to Dashboard</a>
    </div>

    <p style="margin-top: 30px;">Best regards,<br><strong>EternLink Team</strong></p>
  </div>

  <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="margin: 0; font-size: 12px; color: #6c757d;">© 2025 EternLink. All rights reserved.</p>
  </div>
</body>
</html>
    `;

    const text = `
EternLink Death Claim - Verification Complete ✓

The death claim for user ${userEmail} has been verified and approved.

All Verification Stages Passed:
✓ Email verification - No response from user (3 attempts)
✓ Phone verification - No response from user (2 attempts)

Next Step: Retrieve Encryption Key
You can now retrieve the encryption key from the blockchain.

1. Log in to your beneficiary dashboard
2. Navigate to this death claim
3. Click "Retrieve Key from Blockchain"
4. Combine with Share 2 to reconstruct the decryption key

Dashboard: https://eternlink.com/beneficiary/dashboard

Best regards,
EternLink Team
    `;

    return this.sendEmail({
      to: beneficiaryEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Email 5: Key retrieved - sent to beneficiary
   */
  async sendDeathClaimKeyRetrieved(beneficiaryEmail: string, userEmail: string, txHash: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = 'EternLink - Encryption Key Retrieved Successfully';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Key Retrieved</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2942 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #C0C8D4; margin: 0; font-size: 28px;">EternLink</h1>
    <p style="color: #8b96a8; margin: 10px 0 0 0;">Process Complete</p>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #1a2942; margin-top: 0;">Encryption Key Retrieved Successfully</h2>

    <p>The encryption key for user <strong>${userEmail}</strong> has been retrieved from the blockchain.</p>

    <div style="background: #d4edda; padding: 20px; border-left: 4px solid #28a745; margin: 20px 0;">
      <h3 style="color: #155724; margin-top: 0;">Transaction Confirmed</h3>
      <p style="margin: 5px 0; color: #155724; font-family: monospace; word-break: break-all; font-size: 12px;">${txHash}</p>
      <p style="margin: 10px 0 0 0; color: #155724; font-size: 14px;">The key retrieval has been recorded on the blockchain.</p>
    </div>

    <div style="background: #e7f3ff; padding: 20px; border-left: 4px solid #2196F3; margin: 20px 0;">
      <h3 style="color: #0c5484; margin-top: 0;">You can now decrypt the files</h3>
      <p style="margin: 5px 0; color: #0c5484;">With Share 2 and Share 3 combined, you have the complete decryption key.</p>
      <p style="margin: 10px 0 0 0; color: #0c5484;">Use the EternLink recovery portal to decrypt the encrypted files.</p>
    </div>

    <p>This completes the death claim process for this user.</p>

    <p style="margin-top: 30px;">Best regards,<br><strong>EternLink Team</strong></p>
  </div>

  <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="margin: 0; font-size: 12px; color: #6c757d;">© 2025 EternLink. All rights reserved.</p>
  </div>
</body>
</html>
    `;

    const text = `
EternLink - Encryption Key Retrieved Successfully

The encryption key for user ${userEmail} has been retrieved from the blockchain.

Transaction Hash:
${txHash}

You can now decrypt the files with Share 2 and Share 3 combined.

Use the EternLink recovery portal to decrypt the files.

This completes the death claim process.

Best regards,
EternLink Team
    `;

    return this.sendEmail({
      to: beneficiaryEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Email 6: Claim rejected - sent to beneficiary
   */
  async sendDeathClaimRejected(beneficiaryEmail: string, reason: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = 'EternLink Death Claim - Rejected';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claim Rejected</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 28px;">EternLink</h1>
    <p style="color: #f8f9fa; margin: 10px 0 0 0;">Claim Rejected</p>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #dc3545; margin-top: 0;">Death Claim Rejected</h2>

    <p>Your death claim has been rejected.</p>

    <div style="background: #f8d7da; padding: 20px; border-left: 4px solid #dc3545; margin: 20px 0;">
      <h3 style="color: #721c24; margin-top: 0;">Reason</h3>
      <p style="margin: 5px 0; color: #721c24;">${reason}</p>
    </div>

    <p>The user has confirmed they are alive by responding to the death verification message.</p>

    <p style="margin-top: 30px;">Best regards,<br><strong>EternLink Team</strong></p>
  </div>

  <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="margin: 0; font-size: 12px; color: #6c757d;">© 2025 EternLink. All rights reserved.</p>
  </div>
</body>
</html>
    `;

    const text = `
EternLink Death Claim - Rejected

Your death claim has been rejected.

Reason: ${reason}

The user has confirmed they are alive.

Best regards,
EternLink Team
    `;

    return this.sendEmail({
      to: beneficiaryEmail,
      subject,
      html,
      text,
    });
  }
}

export const emailService = new EmailService();
