import { Router } from 'express';
import {
  submitDeathClaim,
  getDeathClaimStatus,
  getMyDeathClaims,
  respondToDeathVerification,
  markKeyRetrieved,
} from '../controllers/death-claim.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// Validation schemas
const submitDeathClaimSchema = Joi.object({
  linkId: Joi.string().required().messages({
    'string.empty': 'Link ID is required',
  }),
});

const respondToVerificationSchema = Joi.object({
  claimId: Joi.string().required().messages({
    'string.empty': 'Claim ID is required',
  }),
});

const markKeyRetrievedSchema = Joi.object({
  claimId: Joi.string().required().messages({
    'string.empty': 'Claim ID is required',
  }),
  txHash: Joi.string().length(66).required().messages({
    'string.length': 'Transaction hash must be 66 characters (0x + 64 hex chars)',
    'string.empty': 'Transaction hash is required',
  }),
});

// POST /api/death-claim/submit - Submit death claim (beneficiary only)
router.post('/submit', authenticate, validateRequest(submitDeathClaimSchema), submitDeathClaim);

// GET /api/death-claim/:claimId - Get death claim status (beneficiary only)
router.get('/:claimId', authenticate, getDeathClaimStatus);

// GET /api/death-claim - Get all my death claims (beneficiary only)
router.get('/', authenticate, getMyDeathClaims);

// POST /api/death-claim/respond - User responds to death verification (user only)
router.post('/respond', authenticate, validateRequest(respondToVerificationSchema), respondToDeathVerification);

// POST /api/death-claim/mark-key-retrieved - Mark key as retrieved from blockchain (beneficiary only)
router.post('/mark-key-retrieved', authenticate, validateRequest(markKeyRetrievedSchema), markKeyRetrieved);

export default router;
