/**
 * Type definitions for EternLink Workers API
 */

import type { Database } from './db';

// Cloudflare Worker environment bindings
export interface Env {
  // D1 Database
  DB: D1Database;
  
  // R2 Storage (for encrypted files)
  FILES: R2Bucket;
  
  // KV Namespace (for sessions/cache)
  KV: KVNamespace;
  
  // Environment variables
  ENVIRONMENT: string;
  FRONTEND_URL: string;
  JWT_EXPIRES_IN: string;
  
  // Secrets (set via wrangler secret)
  JWT_SECRET: string;
  COMPANY_WALLET_PRIVATE_KEY: string;
}

// Extended context with database
export interface AppContext {
  env: Env;
  db: Database;
}

// Auth types
export interface JWTPayload {
  sub: string; // user id
  email: string;
  accountType: 'user' | 'beneficiary';
  iat: number;
  exp: number;
}

export interface AuthUser {
  id: string;
  email: string;
  accountType: 'user' | 'beneficiary';
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Registration types
export interface RegisterRequest {
  email: string;
  password: string;
  accountType: 'user' | 'beneficiary';
  referCode?: string; // For beneficiary linking
}

export interface LoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

// File upload types
export interface FileUploadMetadata {
  fileHash: string;
  originalName: string;
  encryptedSize: number;
  mimeType?: string;
}

