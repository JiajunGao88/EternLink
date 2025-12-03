import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // SIWE
  siweDomain: process.env.SIWE_DOMAIN || 'localhost',
  siweUri: process.env.SIWE_URI || 'http://localhost:3001',

  // Email
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
  },
  emailFrom: process.env.EMAIL_FROM || 'noreply@eternlink.com',

  // Heartbeat
  heartbeatCheckCron: process.env.HEARTBEAT_CHECK_CRON || '0 0 * * *',
  heartbeatGracePeriodDays: parseInt(process.env.HEARTBEAT_GRACE_PERIOD_DAYS || '7', 10),

  // Blockchain
  blockchainRpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'https://sepolia.base.org',
  contractAddress: process.env.CONTRACT_ADDRESS || '',

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // SMS (Twilio)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },

  // Voice Recognition (Azure)
  azure: {
    speechKey: process.env.AZURE_SPEECH_KEY || '',
    speechRegion: process.env.AZURE_SPEECH_REGION || 'eastus',
  },

  // 2FA
  enable2FA: process.env.ENABLE_2FA === 'true',
  twoFAIssuer: process.env['2FA_ISSUER'] || 'EternLink',
};

// Validate critical environment variables
export function validateConfig(): void {
  const requiredVars = ['DATABASE_URL', 'JWT_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please copy .env.example to .env and fill in the required values.'
    );
  }

  if (config.nodeEnv === 'production' && config.jwtSecret === 'dev-secret-key') {
    throw new Error('JWT_SECRET must be changed in production environment');
  }
}
