import { Router } from 'express';
import {
  updateAccountSettings,
  sendPhoneVerificationCode,
  verifyPhone,
  uploadVoiceSignature,
  verifyVoiceSignature,
  getAccountStatus,
  completeOnboarding,
} from '../controllers/account.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Validation schemas
const updateSettingsSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().allow(null, ''),
  emailNotificationDays: Joi.number().min(1).max(365).optional(),
  phoneNotificationDays: Joi.number().min(1).max(365).optional(),
  freezeDays: Joi.number().min(1).max(365).optional(),
}).min(1);

const phoneVerificationSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
});

const verifyPhoneCodeSchema = Joi.object({
  code: Joi.string().length(6).required(),
});

const voiceUploadSchema = Joi.object({
  voiceData: Joi.string().required(),
});

const completeOnboardingSchema = Joi.object({
  notificationConfig: Joi.object({
    emailNotificationDays: Joi.number().min(1).max(365).optional(),
    phoneNotificationDays: Joi.number().min(1).max(365).optional(),
    accountFreezeDays: Joi.number().min(1).max(365).optional(),
  }).optional(),
});

// GET /api/account/status - Get account status
router.get('/status', getAccountStatus);

// PUT /api/account/settings - Update account settings
router.put('/settings', validateRequest(updateSettingsSchema), updateAccountSettings);

// POST /api/account/phone/send-code - Send phone verification code
router.post('/phone/send-code', validateRequest(phoneVerificationSchema), sendPhoneVerificationCode);

// POST /api/account/phone/verify - Verify phone with code
router.post('/phone/verify', validateRequest(verifyPhoneCodeSchema), verifyPhone);

// POST /api/account/voice/upload - Upload voice signature
router.post('/voice/upload', validateRequest(voiceUploadSchema), uploadVoiceSignature);

// POST /api/account/voice/verify - Verify voice to unlock account
router.post('/voice/verify', validateRequest(voiceUploadSchema), verifyVoiceSignature);

// POST /api/account/complete-onboarding - Complete onboarding wizard and save settings
router.post('/complete-onboarding', validateRequest(completeOnboardingSchema), completeOnboarding);

export default router;
