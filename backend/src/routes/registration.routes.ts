import { Router } from 'express';
import {
  register,
  verifyEmail,
  resendVerificationCode,
  login,
} from '../controllers/registration.controller';
import { validateRequest } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
  }),
});

const verifyEmailSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().length(6).required(),
});

const resendCodeSchema = Joi.object({
  email: Joi.string().email().required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// POST /api/registration/register - Register new user
router.post('/register', validateRequest(registerSchema), register);

// POST /api/registration/verify-email - Verify email with code
router.post('/verify-email', validateRequest(verifyEmailSchema), verifyEmail);

// POST /api/registration/resend-code - Resend verification code
router.post('/resend-code', validateRequest(resendCodeSchema), resendVerificationCode);

// POST /api/registration/login - Login with email/password
router.post('/login', validateRequest(loginSchema), login);

export default router;
