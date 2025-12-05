/**
 * Authentication utilities for Workers
 */

import * as jose from 'jose';
import { hash, compare } from 'bcryptjs';

const SALT_ROUNDS = 10;

// JWT functions using jose (works in Workers)
export async function generateToken(
  userId: string,
  email: string,
  accountType: string,
  secret: string,
  expiresIn: string = '7d'
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  
  const token = await new jose.SignJWT({
    sub: userId,
    email,
    accountType,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
  
  return token;
}

export async function verifyToken(
  token: string,
  secret: string
): Promise<{ sub: string; email: string; accountType: string } | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey);
    
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      accountType: payload.accountType as string,
    };
  } catch {
    return null;
  }
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash);
}

// Generate verification code (6 digits)
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate refer code (12 chars)
export function generateReferCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate nonce for SIWE
export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

