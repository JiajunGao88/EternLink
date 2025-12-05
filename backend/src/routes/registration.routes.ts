import { Router } from 'express';
import {
  register,
  verifyEmail,
  resendVerificationCode,
  login,
  requestPasswordReset,
  verifyPasswordResetCode,
  resetPassword,
  complete2FALogin,
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
  accountType: Joi.string().valid('user', 'beneficiary').optional().default('user'),
  referCode: Joi.string().length(12).optional().when('accountType', {
    is: 'beneficiary',
    then: Joi.required(),
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

const passwordResetRequestSchema = Joi.object({
  email: Joi.string().email().required(),
});

const passwordResetVerifySchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().length(6).required(),
});

const passwordResetSchema = Joi.object({
  resetToken: Joi.string().required(),
  newPassword: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
  }),
});

const complete2FALoginSchema = Joi.object({
  userId: Joi.string().required(),
});

// POST /api/registration/register - Register new user
router.post('/register', validateRequest(registerSchema), register);

// POST /api/registration/verify-email - Verify email with code
router.post('/verify-email', validateRequest(verifyEmailSchema), verifyEmail);

// POST /api/registration/resend-code - Resend verification code
router.post('/resend-code', validateRequest(resendCodeSchema), resendVerificationCode);

// POST /api/registration/login - Login with email/password
router.post('/login', validateRequest(loginSchema), login);

// POST /api/registration/complete-2fa-login - Complete login after 2FA verification
router.post('/complete-2fa-login', validateRequest(complete2FALoginSchema), complete2FALogin);

// POST /api/registration/password-reset/request - Request password reset
router.post('/password-reset/request', validateRequest(passwordResetRequestSchema), requestPasswordReset);

// POST /api/registration/password-reset/verify - Verify password reset code
router.post('/password-reset/verify', validateRequest(passwordResetVerifySchema), verifyPasswordResetCode);

// POST /api/registration/password-reset/reset - Reset password
router.post('/password-reset/reset', validateRequest(passwordResetSchema), resetPassword);

export default router;
