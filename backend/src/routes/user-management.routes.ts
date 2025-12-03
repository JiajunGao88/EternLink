import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getCurrentUser,
  updateCurrentUser,
} from '../controllers/user-management.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// Validation schemas
const updateUserSchema = Joi.object({
  email: Joi.string().email().optional(),
  phoneNumber: Joi.string().optional().allow(null, ''),
  emailNotificationDays: Joi.number().integer().min(1).optional(),
  phoneNotificationDays: Joi.number().integer().min(1).optional(),
  freezeDays: Joi.number().integer().min(1).optional(),
  password: Joi.string().min(8).optional().messages({
    'string.min': 'Password must be at least 8 characters long',
  }),
});

// GET /api/users/me - Get current user's own information (must be before /:id route)
router.get('/me', authenticateToken, getCurrentUser);

// PUT /api/users/me - Update current user's own information
router.put('/me', authenticateToken, validateRequest(updateUserSchema), updateCurrentUser);

// GET /api/users?page=1&limit=10&accountType=user&search=email - Get all users with pagination
router.get('/', authenticateToken, getAllUsers);

// GET /api/users/:id - Get single user by ID
router.get('/:id', authenticateToken, getUserById);

// PUT /api/users/:id - Update user information
router.put('/:id', authenticateToken, validateRequest(updateUserSchema), updateUser);

// DELETE /api/users/:id - Delete user account
router.delete('/:id', authenticateToken, deleteUser);

export default router;
