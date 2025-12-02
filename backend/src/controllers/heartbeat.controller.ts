import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export async function createHeartbeat(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const {
      intervalDays,
      encryptedFileHash,
      shareOneEncrypted,
      shareThreeEncrypted,
    } = req.body;

    const heartbeat = await prisma.heartbeat.create({
      data: {
        userId,
        lastCheckIn: new Date(),
        intervalDays,
        encryptedFileHash,
        shareOneEncrypted,
        shareThreeEncrypted,
        recoveryTriggered: false,
      },
    });

    logger.info('Heartbeat created:', { heartbeatId: heartbeat.id, userId });

    res.status(201).json({
      id: heartbeat.id,
      lastCheckIn: heartbeat.lastCheckIn,
      intervalDays: heartbeat.intervalDays,
      encryptedFileHash: heartbeat.encryptedFileHash,
      recoveryTriggered: heartbeat.recoveryTriggered,
    });
  } catch (error) {
    logger.error('Error creating heartbeat:', error);
    res.status(500).json({ error: 'Failed to create heartbeat' });
  }
}

export async function updateHeartbeat(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { heartbeatId } = req.params;

    // Verify ownership
    const heartbeat = await prisma.heartbeat.findFirst({
      where: {
        id: heartbeatId,
        userId,
      },
    });

    if (!heartbeat) {
      res.status(404).json({ error: 'Heartbeat not found' });
      return;
    }

    if (heartbeat.recoveryTriggered) {
      res.status(400).json({ error: 'Cannot update heartbeat after recovery is triggered' });
      return;
    }

    const updatedHeartbeat = await prisma.heartbeat.update({
      where: { id: heartbeatId },
      data: { lastCheckIn: new Date() },
    });

    logger.info('Heartbeat updated:', { heartbeatId, userId });

    res.json({
      id: updatedHeartbeat.id,
      lastCheckIn: updatedHeartbeat.lastCheckIn,
      intervalDays: updatedHeartbeat.intervalDays,
      recoveryTriggered: updatedHeartbeat.recoveryTriggered,
    });
  } catch (error) {
    logger.error('Error updating heartbeat:', error);
    res.status(500).json({ error: 'Failed to update heartbeat' });
  }
}

export async function getHeartbeats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const heartbeats = await prisma.heartbeat.findMany({
      where: { userId },
      include: {
        beneficiaries: {
          select: {
            id: true,
            name: true,
            email: true,
            relationship: true,
            notifiedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      heartbeats: heartbeats.map(hb => ({
        id: hb.id,
        lastCheckIn: hb.lastCheckIn,
        intervalDays: hb.intervalDays,
        encryptedFileHash: hb.encryptedFileHash,
        recoveryTriggered: hb.recoveryTriggered,
        beneficiaries: hb.beneficiaries,
        createdAt: hb.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Error fetching heartbeats:', error);
    res.status(500).json({ error: 'Failed to fetch heartbeats' });
  }
}

export async function getHeartbeatById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { heartbeatId } = req.params;

    const heartbeat = await prisma.heartbeat.findFirst({
      where: {
        id: heartbeatId,
        userId,
      },
      include: {
        beneficiaries: {
          select: {
            id: true,
            name: true,
            email: true,
            relationship: true,
            notifiedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!heartbeat) {
      res.status(404).json({ error: 'Heartbeat not found' });
      return;
    }

    res.json({
      id: heartbeat.id,
      lastCheckIn: heartbeat.lastCheckIn,
      intervalDays: heartbeat.intervalDays,
      encryptedFileHash: heartbeat.encryptedFileHash,
      shareOneEncrypted: heartbeat.shareOneEncrypted,
      shareThreeEncrypted: heartbeat.shareThreeEncrypted,
      recoveryTriggered: heartbeat.recoveryTriggered,
      beneficiaries: heartbeat.beneficiaries,
      createdAt: heartbeat.createdAt,
    });
  } catch (error) {
    logger.error('Error fetching heartbeat:', error);
    res.status(500).json({ error: 'Failed to fetch heartbeat' });
  }
}

export async function deleteHeartbeat(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { heartbeatId } = req.params;

    // Verify ownership
    const heartbeat = await prisma.heartbeat.findFirst({
      where: {
        id: heartbeatId,
        userId,
      },
    });

    if (!heartbeat) {
      res.status(404).json({ error: 'Heartbeat not found' });
      return;
    }

    await prisma.heartbeat.delete({
      where: { id: heartbeatId },
    });

    logger.info('Heartbeat deleted:', { heartbeatId, userId });

    res.json({ message: 'Heartbeat deleted successfully' });
  } catch (error) {
    logger.error('Error deleting heartbeat:', error);
    res.status(500).json({ error: 'Failed to delete heartbeat' });
  }
}
