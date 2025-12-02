import { Request, Response } from 'express';
import { SiweMessage } from 'siwe';
import { prisma } from '../config/database';
import { generateToken } from '../middleware/auth.middleware';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

// Store nonces temporarily (in production, use Redis)
const nonces = new Map<string, { nonce: string; timestamp: number }>();

// Clean up expired nonces every 5 minutes
setInterval(() => {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  for (const [address, data] of nonces.entries()) {
    if (now - data.timestamp > fiveMinutes) {
      nonces.delete(address);
    }
  }
}, 5 * 60 * 1000);

export async function getNonce(req: Request, res: Response): Promise<void> {
  try {
    const { address } = req.body;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      res.status(400).json({ error: 'Invalid Ethereum address' });
      return;
    }

    // Generate random nonce
    const nonce = Math.random().toString(36).substring(2, 15) +
                  Math.random().toString(36).substring(2, 15);

    nonces.set(address.toLowerCase(), { nonce, timestamp: Date.now() });

    res.json({ nonce });
  } catch (error) {
    logger.error('Error generating nonce:', error);
    res.status(500).json({ error: 'Failed to generate nonce' });
  }
}

export async function verify(req: Request, res: Response): Promise<void> {
  try {
    const { message, signature } = req.body;

    if (!message || !signature) {
      res.status(400).json({ error: 'Message and signature required' });
      return;
    }

    // Parse SIWE message
    const siweMessage = new SiweMessage(message);

    // Verify the signature
    const fields = await siweMessage.verify({
      signature,
      domain: config.siweDomain,
    });

    if (!fields.success) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const walletAddress = siweMessage.address.toLowerCase();

    // Verify nonce
    const storedNonce = nonces.get(walletAddress);
    if (!storedNonce || storedNonce.nonce !== siweMessage.nonce) {
      res.status(401).json({ error: 'Invalid or expired nonce' });
      return;
    }

    // Remove used nonce
    nonces.delete(walletAddress);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress },
      });
      logger.info('New user created:', { userId: user.id, walletAddress });
    } else {
      logger.info('User logged in:', { userId: user.id, walletAddress });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.walletAddress);

    res.json({
      token,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error verifying signature:', error);
    res.status(500).json({ error: 'Failed to verify signature' });
  }
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        heartbeats: {
          include: {
            beneficiaries: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
      heartbeats: user.heartbeats.map(hb => ({
        id: hb.id,
        lastCheckIn: hb.lastCheckIn,
        intervalDays: hb.intervalDays,
        encryptedFileHash: hb.encryptedFileHash,
        recoveryTriggered: hb.recoveryTriggered,
        beneficiaryCount: hb.beneficiaries.length,
        createdAt: hb.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}
