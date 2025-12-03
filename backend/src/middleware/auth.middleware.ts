import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
  walletAddress?: string;
}

export interface JwtPayload {
  userId: string;
  walletAddress: string;
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.userId = decoded.userId;
    req.walletAddress = decoded.walletAddress;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function generateToken(userId: string, walletAddress: string): string {
  // @ts-ignore - jwt.sign typing issue with string expiresIn
  return jwt.sign(
    { userId, walletAddress },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}
