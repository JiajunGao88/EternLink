import { Router } from 'express';
import {
  createHeartbeat,
  updateHeartbeat,
  getHeartbeats,
  getHeartbeatById,
  deleteHeartbeat,
} from '../controllers/heartbeat.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest, schemas } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Validation schemas
const createHeartbeatSchema = Joi.object({
  intervalDays: schemas.intervalDays,
  encryptedFileHash: schemas.fileHash,
  shareOneEncrypted: schemas.encryptedShare,
  shareThreeEncrypted: schemas.encryptedShare,
});

// POST /api/heartbeat - Create new heartbeat
router.post('/', validateRequest(createHeartbeatSchema), createHeartbeat);

// GET /api/heartbeat - Get all user's heartbeats
router.get('/', getHeartbeats);

// GET /api/heartbeat/:heartbeatId - Get specific heartbeat
router.get('/:heartbeatId', getHeartbeatById);

// PUT /api/heartbeat/:heartbeatId - Update heartbeat (check-in)
router.put('/:heartbeatId', updateHeartbeat);

// DELETE /api/heartbeat/:heartbeatId - Delete heartbeat
router.delete('/:heartbeatId', deleteHeartbeat);

export default router;
