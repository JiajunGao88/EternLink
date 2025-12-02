import { Router } from 'express';
import {
  addBeneficiary,
  getBeneficiaries,
  updateBeneficiary,
  deleteBeneficiary,
} from '../controllers/beneficiary.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest, schemas } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Validation schemas
const addBeneficiarySchema = Joi.object({
  heartbeatId: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(255).required(),
  email: schemas.email,
  relationship: Joi.string().max(100).optional().allow(null, ''),
  shareTwoEncrypted: schemas.encryptedShare,
});

const updateBeneficiarySchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  email: schemas.email.optional(),
  relationship: Joi.string().max(100).optional().allow(null, ''),
}).min(1);

// POST /api/beneficiary - Add new beneficiary
router.post('/', validateRequest(addBeneficiarySchema), addBeneficiary);

// GET /api/beneficiary/:heartbeatId - Get all beneficiaries for a heartbeat
router.get('/:heartbeatId', getBeneficiaries);

// PUT /api/beneficiary/:beneficiaryId - Update beneficiary
router.put('/:beneficiaryId', validateRequest(updateBeneficiarySchema), updateBeneficiary);

// DELETE /api/beneficiary/:beneficiaryId - Delete beneficiary
router.delete('/:beneficiaryId', deleteBeneficiary);

export default router;
