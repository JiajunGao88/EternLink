import { Router } from 'express';
import {
  enable2FA,
  verify2FA,
  disable2FA,
  verify2FALogin,
  regenerateBackupCodes,
  get2FAStatus,
} from '../controllers/twofa.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// Validation schemas
const verify2FASchema = Joi.object({
  token: Joi.string().length(6).required(),
});

const disable2FASchema = Joi.object({
  password: Joi.string().required(),
  token: Joi.string().length(6).required(),
});

const verify2FALoginSchema = Joi.object({
  userId: Joi.string().required(),
  token: Joi.string().length(6),
  backupCode: Joi.string().length(8),
}).or('token', 'backupCode'); // At least one must be provided

const regenerateBackupCodesSchema = Joi.object({
  password: Joi.string().required(),
  token: Joi.string().length(6).required(),
});

// All routes require authentication except verify2FALogin (used during login)

// GET /api/2fa/status - Get 2FA status
router.get('/status', authenticateToken, get2FAStatus);

// POST /api/2fa/enable - Enable 2FA and generate QR code
router.post('/enable', authenticateToken, enable2FA);

// POST /api/2fa/verify - Verify and activate 2FA
router.post('/verify', authenticateToken, validateRequest(verify2FASchema), verify2FA);

// POST /api/2fa/disable - Disable 2FA
router.post('/disable', authenticateToken, validateRequest(disable2FASchema), disable2FA);

// POST /api/2fa/verify-login - Verify 2FA token during login (no auth required)
router.post('/verify-login', validateRequest(verify2FALoginSchema), verify2FALogin);

// POST /api/2fa/regenerate-backup-codes - Regenerate backup codes
router.post('/regenerate-backup-codes', authenticateToken, validateRequest(regenerateBackupCodesSchema), regenerateBackupCodes);

export default router;
