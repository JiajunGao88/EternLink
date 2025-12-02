import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';

export function validateRequest(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      logger.warn('Validation error:', { errors: errorMessages, body: req.body });
      res.status(400).json({
        error: 'Validation failed',
        details: errorMessages,
      });
      return;
    }

    next();
  };
}

// Common validation schemas
export const schemas = {
  // Wallet address validation
  walletAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid Ethereum wallet address format',
    }),

  // Email validation
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Invalid email address format',
    }),

  // Encrypted share validation (base64 or hex string)
  encryptedShare: Joi.string()
    .min(10)
    .required()
    .messages({
      'string.min': 'Encrypted share must be at least 10 characters',
    }),

  // File hash validation (0x + 64 hex characters for SHA-256)
  fileHash: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{64}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid file hash format (expected 0x + 64 hex chars)',
    }),

  // Heartbeat interval validation
  intervalDays: Joi.number()
    .valid(30, 60, 90, 180)
    .required()
    .messages({
      'any.only': 'Interval must be 30, 60, 90, or 180 days',
    }),
};
