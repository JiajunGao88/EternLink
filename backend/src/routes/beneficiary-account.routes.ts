import { Router } from 'express';
import {
  registerBeneficiary,
  generateReferCode,
  getReferCode,
  getLinkedBeneficiaries,
  getLinkedUsers,
  revokeBeneficiaryLink,
} from '../controllers/beneficiary-account.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// Validation schemas
const registerBeneficiarySchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
  }),
  referCode: Joi.string().length(12).required().messages({
    'string.length': 'Refer code must be exactly 12 characters',
  }),
});

const revokeLinkSchema = Joi.object({
  linkId: Joi.string().required(),
});

// POST /api/beneficiary-account/register - Register new beneficiary with refer code
router.post('/register', validateRequest(registerBeneficiarySchema), registerBeneficiary);

// POST /api/beneficiary-account/generate-refer-code - Generate refer code for user (requires auth)
router.post('/generate-refer-code', authenticateToken, generateReferCode);

// GET /api/beneficiary-account/refer-code - Get user's refer code (requires auth)
router.get('/refer-code', authenticateToken, getReferCode);

// GET /api/beneficiary-account/linked-beneficiaries - Get linked beneficiaries for user (requires auth)
router.get('/linked-beneficiaries', authenticateToken, getLinkedBeneficiaries);

// GET /api/beneficiary-account/linked-users - Get linked users for beneficiary (requires auth)
router.get('/linked-users', authenticateToken, getLinkedUsers);

// POST /api/beneficiary-account/revoke-link - Revoke beneficiary link (requires auth)
router.post('/revoke-link', authenticateToken, validateRequest(revokeLinkSchema), revokeBeneficiaryLink);

export default router;
