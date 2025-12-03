import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Get all users (with pagination and filtering)
 * GET /api/users?page=1&limit=10&accountType=user&search=email
 */
export async function getAllUsers(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '10', accountType, search } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (accountType) {
      where.accountType = accountType;
    }

    if (search) {
      where.email = {
        contains: search as string,
        mode: 'insensitive',
      };
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users
    const users = await prisma.user.findMany({
      where,
      skip,
      take: limitNum,
      select: {
        id: true,
        email: true,
        accountType: true,
        emailVerified: true,
        phoneNumber: true,
        phoneVerified: true,
        accountFrozen: true,
        freezeReason: true,
        lastLoginAt: true,
        referCode: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        // Don't expose sensitive fields
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error getting all users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
}

/**
 * Get single user by ID
 * GET /api/users/:id
 */
export async function getUserById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        walletAddress: true,
        accountType: true,
        emailVerified: true,
        phoneNumber: true,
        phoneVerified: true,
        accountFrozen: true,
        freezeReason: true,
        lastLoginAt: true,
        emailNotificationDays: true,
        phoneNotificationDays: true,
        freezeDays: true,
        twoFactorEnabled: true,
        referCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get beneficiary links if user account
    let beneficiaries: any[] = [];
    if (user.accountType === 'user') {
      const links = await prisma.beneficiaryLink.findMany({
        where: { userId: id, status: 'active' },
        include: {
          beneficiary: {
            select: {
              id: true,
              email: true,
              createdAt: true,
            },
          },
        },
      });
      beneficiaries = links.map(link => link.beneficiary);
    }

    // Get linked users if beneficiary account
    let linkedUsers: any[] = [];
    if (user.accountType === 'beneficiary') {
      const links = await prisma.beneficiaryLink.findMany({
        where: { beneficiaryId: id, status: 'active' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              referCode: true,
              createdAt: true,
            },
          },
        },
      });
      linkedUsers = links.map(link => link.user);
    }

    res.json({
      user,
      beneficiaries,
      linkedUsers,
    });
  } catch (error) {
    logger.error('Error getting user by ID:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
}

/**
 * Update user information
 * PUT /api/users/:id
 */
export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const {
      email,
      phoneNumber,
      emailNotificationDays,
      phoneNotificationDays,
      freezeDays,
      password,
    } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Build update data
    const updateData: any = {};

    if (email !== undefined) {
      // Check if email is already taken by another user
      const emailExists = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          id: { not: id },
        },
      });

      if (emailExists) {
        res.status(400).json({ error: 'Email already taken' });
        return;
      }

      updateData.email = email.toLowerCase();
      updateData.emailVerified = false; // Reset verification status
    }

    if (phoneNumber !== undefined) {
      updateData.phoneNumber = phoneNumber;
      if (phoneNumber) {
        updateData.phoneVerified = false; // Reset verification status
      }
    }

    if (emailNotificationDays !== undefined) {
      updateData.emailNotificationDays = emailNotificationDays;
    }

    if (phoneNotificationDays !== undefined) {
      updateData.phoneNotificationDays = phoneNotificationDays;
    }

    if (freezeDays !== undefined) {
      updateData.freezeDays = freezeDays;
    }

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        accountType: true,
        emailVerified: true,
        phoneNumber: true,
        phoneVerified: true,
        emailNotificationDays: true,
        phoneNotificationDays: true,
        freezeDays: true,
        updatedAt: true,
      },
    });

    logger.info('User updated:', { userId: id, fields: Object.keys(updateData) });

    res.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

/**
 * Delete user account
 * DELETE /api/users/:id
 */
export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Delete related data in transaction
    await prisma.$transaction(async (tx) => {
      // Delete verification codes
      await tx.verificationCode.deleteMany({
        where: { userId: id },
      });

      // Delete heartbeats
      await tx.heartbeat.deleteMany({
        where: { userId: id },
      });

      // Delete login history
      await tx.loginHistory.deleteMany({
        where: { userId: id },
      });

      // Delete beneficiary links where user is the owner
      await tx.beneficiaryLink.deleteMany({
        where: {
          OR: [
            { userId: id },
            { beneficiaryId: id },
          ],
        },
      });

      // Delete death claims
      await tx.deathClaim.deleteMany({
        where: {
          OR: [
            { userId: id },
            { beneficiaryId: id },
          ],
        },
      });

      // Finally delete the user
      await tx.user.delete({
        where: { id },
      });
    });

    logger.info('User deleted:', { userId: id, email: user.email });

    res.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

/**
 * Get current user's own information
 * GET /api/users/me
 */
export async function getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        walletAddress: true,
        accountType: true,
        emailVerified: true,
        phoneNumber: true,
        phoneVerified: true,
        accountFrozen: true,
        freezeReason: true,
        lastLoginAt: true,
        emailNotificationDays: true,
        phoneNotificationDays: true,
        freezeDays: true,
        twoFactorEnabled: true,
        referCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    logger.error('Error getting current user:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
}

/**
 * Update current user's own information
 * PUT /api/users/me
 */
export async function updateCurrentUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      email,
      phoneNumber,
      emailNotificationDays,
      phoneNotificationDays,
      freezeDays,
      password,
    } = req.body;

    // Build update data
    const updateData: any = {};

    if (email !== undefined) {
      // Check if email is already taken
      const emailExists = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          id: { not: userId },
        },
      });

      if (emailExists) {
        res.status(400).json({ error: 'Email already taken' });
        return;
      }

      updateData.email = email.toLowerCase();
      updateData.emailVerified = false;
    }

    if (phoneNumber !== undefined) {
      updateData.phoneNumber = phoneNumber;
      if (phoneNumber) {
        updateData.phoneVerified = false;
      }
    }

    if (emailNotificationDays !== undefined) {
      updateData.emailNotificationDays = emailNotificationDays;
    }

    if (phoneNotificationDays !== undefined) {
      updateData.phoneNotificationDays = phoneNotificationDays;
    }

    if (freezeDays !== undefined) {
      updateData.freezeDays = freezeDays;
    }

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        accountType: true,
        emailVerified: true,
        phoneNumber: true,
        phoneVerified: true,
        emailNotificationDays: true,
        phoneNotificationDays: true,
        freezeDays: true,
        referCode: true,
        updatedAt: true,
      },
    });

    logger.info('Current user updated:', { userId, fields: Object.keys(updateData) });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    logger.error('Error updating current user:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}
