import { Router } from 'express';
import { getNonce, verify, getProfile } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// Validation schemas
const getNonceSchema = Joi.object({
  address: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid Ethereum address format',
    }),
});

const verifySchema = Joi.object({
  message: Joi.string().required(),
  signature: Joi.string().required(),
});

// POST /api/auth/nonce - Get nonce for SIWE
router.post('/nonce', validateRequest(getNonceSchema), getNonce);

// POST /api/auth/verify - Verify SIWE signature and get JWT
router.post('/verify', validateRequest(verifySchema), verify);

// GET /api/auth/profile - Get current user profile (protected)
router.get('/profile', authenticateToken, getProfile);

export default router;
