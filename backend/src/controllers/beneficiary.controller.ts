import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export async function addBeneficiary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const {
      heartbeatId,
      name,
      email,
      relationship,
      shareTwoEncrypted,
    } = req.body;

    // Verify heartbeat ownership
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
      res.status(400).json({ error: 'Cannot add beneficiary after recovery is triggered' });
      return;
    }

    const beneficiary = await prisma.beneficiary.create({
      data: {
        heartbeatId,
        name,
        email,
        relationship,
        shareTwoEncrypted,
      },
    });

    logger.info('Beneficiary added:', { beneficiaryId: beneficiary.id, heartbeatId });

    res.status(201).json({
      id: beneficiary.id,
      name: beneficiary.name,
      email: beneficiary.email,
      relationship: beneficiary.relationship,
      createdAt: beneficiary.createdAt,
    });
  } catch (error) {
    logger.error('Error adding beneficiary:', error);
    res.status(500).json({ error: 'Failed to add beneficiary' });
  }
}

export async function getBeneficiaries(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { heartbeatId } = req.params;

    // Verify heartbeat ownership
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
      beneficiaries: heartbeat.beneficiaries,
    });
  } catch (error) {
    logger.error('Error fetching beneficiaries:', error);
    res.status(500).json({ error: 'Failed to fetch beneficiaries' });
  }
}

export async function updateBeneficiary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { beneficiaryId } = req.params;
    const { name, email, relationship } = req.body;

    // Verify ownership through heartbeat
    const beneficiary = await prisma.beneficiary.findFirst({
      where: { id: beneficiaryId },
      include: {
        heartbeat: {
          select: {
            userId: true,
            recoveryTriggered: true,
          },
        },
      },
    });

    if (!beneficiary || beneficiary.heartbeat.userId !== userId) {
      res.status(404).json({ error: 'Beneficiary not found' });
      return;
    }

    if (beneficiary.heartbeat.recoveryTriggered) {
      res.status(400).json({ error: 'Cannot update beneficiary after recovery is triggered' });
      return;
    }

    const updatedBeneficiary = await prisma.beneficiary.update({
      where: { id: beneficiaryId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(relationship !== undefined && { relationship }),
      },
    });

    logger.info('Beneficiary updated:', { beneficiaryId });

    res.json({
      id: updatedBeneficiary.id,
      name: updatedBeneficiary.name,
      email: updatedBeneficiary.email,
      relationship: updatedBeneficiary.relationship,
    });
  } catch (error) {
    logger.error('Error updating beneficiary:', error);
    res.status(500).json({ error: 'Failed to update beneficiary' });
  }
}

export async function deleteBeneficiary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { beneficiaryId } = req.params;

    // Verify ownership through heartbeat
    const beneficiary = await prisma.beneficiary.findFirst({
      where: { id: beneficiaryId },
      include: {
        heartbeat: {
          select: {
            userId: true,
            recoveryTriggered: true,
          },
        },
      },
    });

    if (!beneficiary || beneficiary.heartbeat.userId !== userId) {
      res.status(404).json({ error: 'Beneficiary not found' });
      return;
    }

    if (beneficiary.heartbeat.recoveryTriggered) {
      res.status(400).json({ error: 'Cannot delete beneficiary after recovery is triggered' });
      return;
    }

    await prisma.beneficiary.delete({
      where: { id: beneficiaryId },
    });

    logger.info('Beneficiary deleted:', { beneficiaryId });

    res.json({ message: 'Beneficiary deleted successfully' });
  } catch (error) {
    logger.error('Error deleting beneficiary:', error);
    res.status(500).json({ error: 'Failed to delete beneficiary' });
  }
}
