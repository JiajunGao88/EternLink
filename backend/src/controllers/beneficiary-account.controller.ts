import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { generateToken, AuthRequest } from '../middleware/auth.middleware';
import { emailService } from '../services/email.service';
import { logger } from '../utils/logger';

const SALT_ROUNDS = 10;
const VERIFICATION_CODE_EXPIRY_MINUTES = 15;
const REFER_CODE_LENGTH = 12;

/**
 * Generate a random 6-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a unique refer code for user accounts
 */
async function generateUniqueReferCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // Generate alphanumeric code (uppercase)
    const code = crypto.randomBytes(REFER_CODE_LENGTH / 2)
      .toString('hex')
      .toUpperCase()
      .substring(0, REFER_CODE_LENGTH);

    // Check if code already exists
    const existing = await prisma.user.findUnique({
      where: { referCode: code },
    });

    if (!existing) {
      return code;
    }

    attempts++;
  }

  throw new Error('Failed to generate unique refer code');
}

/**
 * Register a new beneficiary account
 * Requires: email, password, referCode (from user account)
 */
export async function registerBeneficiary(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, referCode } = req.body;

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingEmail) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    // Validate refer code and find the user
    const linkedUser = await prisma.user.findUnique({
      where: { referCode: referCode.toUpperCase() },
    });

    if (!linkedUser) {
      res.status(400).json({ error: 'Invalid refer code' });
      return;
    }

    // Check if user account type is valid
    if (linkedUser.accountType !== 'user') {
      res.status(400).json({ error: 'Invalid refer code - must be from a user account' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create beneficiary account
    const beneficiary = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        accountType: 'beneficiary',
        emailVerified: false,
      },
    });

    // Create beneficiary link
    await prisma.beneficiaryLink.create({
      data: {
        userId: linkedUser.id,
        beneficiaryId: beneficiary.id,
        status: 'active',
      },
    });

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        userId: beneficiary.id,
        email: beneficiary.email,
        code,
        type: 'email_verification',
        expiresAt,
      },
    });

    // Send verification email
    await emailService.sendVerificationCode(beneficiary.email, code);

    logger.info('Beneficiary registered:', {
      beneficiaryId: beneficiary.id,
      email: beneficiary.email,
      linkedUserId: linkedUser.id,
    });

    res.status(201).json({
      message: 'Beneficiary registration successful. Please check your email for verification code.',
      beneficiaryId: beneficiary.id,
      email: beneficiary.email,
      linkedUser: {
        id: linkedUser.id,
        email: linkedUser.email,
      },
    });
  } catch (error) {
    logger.error('Error during beneficiary registration:', error);
    res.status(500).json({ error: 'Failed to register beneficiary' });
  }
}

/**
 * Generate refer code for user account
 * Only user accounts can have refer codes
 */
export async function generateReferCode(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.accountType !== 'user') {
      res.status(400).json({ error: 'Only user accounts can generate refer codes' });
      return;
    }

    // Check if already has refer code
    if (user.referCode) {
      res.json({
        message: 'Refer code already exists',
        referCode: user.referCode,
      });
      return;
    }

    // Generate unique refer code
    const referCode = await generateUniqueReferCode();

    await prisma.user.update({
      where: { id: userId },
      data: { referCode },
    });

    logger.info('Refer code generated:', { userId, referCode });

    res.json({
      message: 'Refer code generated successfully',
      referCode,
    });
  } catch (error) {
    logger.error('Error generating refer code:', error);
    res.status(500).json({ error: 'Failed to generate refer code' });
  }
}

/**
 * Get refer code for user account
 */
export async function getReferCode(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        accountType: true,
        referCode: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.accountType !== 'user') {
      res.status(400).json({ error: 'Only user accounts can have refer codes' });
      return;
    }

    res.json({
      referCode: user.referCode,
      hasReferCode: !!user.referCode,
    });
  } catch (error) {
    logger.error('Error fetching refer code:', error);
    res.status(500).json({ error: 'Failed to fetch refer code' });
  }
}

/**
 * Get linked beneficiaries for user account
 */
export async function getLinkedBeneficiaries(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.accountType !== 'user') {
      res.status(400).json({ error: 'Only user accounts can view linked beneficiaries' });
      return;
    }

    const links = await prisma.beneficiaryLink.findMany({
      where: {
        userId,
        status: 'active',
      },
      include: {
        beneficiary: {
          select: {
            id: true,
            email: true,
            emailVerified: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      beneficiaries: links.map(link => ({
        linkId: link.id,
        beneficiary: link.beneficiary,
        linkedAt: link.createdAt,
      })),
      count: links.length,
    });
  } catch (error) {
    logger.error('Error fetching linked beneficiaries:', error);
    res.status(500).json({ error: 'Failed to fetch linked beneficiaries' });
  }
}

/**
 * Get linked users for beneficiary account
 */
export async function getLinkedUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const beneficiaryId = req.userId!;

    const beneficiary = await prisma.user.findUnique({
      where: { id: beneficiaryId },
    });

    if (!beneficiary) {
      res.status(404).json({ error: 'Beneficiary not found' });
      return;
    }

    if (beneficiary.accountType !== 'beneficiary') {
      res.status(400).json({ error: 'Only beneficiary accounts can view linked users' });
      return;
    }

    const links = await prisma.beneficiaryLink.findMany({
      where: {
        beneficiaryId,
        status: 'active',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      users: links.map(link => ({
        linkId: link.id,
        user: link.user,
        linkedAt: link.createdAt,
      })),
      count: links.length,
    });
  } catch (error) {
    logger.error('Error fetching linked users:', error);
    res.status(500).json({ error: 'Failed to fetch linked users' });
  }
}

/**
 * Revoke beneficiary link (user can remove beneficiary)
 */
export async function revokeBeneficiaryLink(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { linkId } = req.body;

    const link = await prisma.beneficiaryLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      res.status(404).json({ error: 'Beneficiary link not found' });
      return;
    }

    if (link.userId !== userId) {
      res.status(403).json({ error: 'Not authorized to revoke this link' });
      return;
    }

    await prisma.beneficiaryLink.update({
      where: { id: linkId },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
      },
    });

    logger.info('Beneficiary link revoked:', { userId, linkId, beneficiaryId: link.beneficiaryId });

    res.json({
      message: 'Beneficiary link revoked successfully',
    });
  } catch (error) {
    logger.error('Error revoking beneficiary link:', error);
    res.status(500).json({ error: 'Failed to revoke beneficiary link' });
  }
}
