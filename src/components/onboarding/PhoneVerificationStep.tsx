/**
 * PhoneVerificationStep Component
 *
 * Add and verify phone number for SMS notifications.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../../config';

const API_URL = `${API_BASE_URL}/api`;

interface PhoneVerificationStepProps {
  onVerified: (phoneNumber: string) => void;
  initialPhone?: string;
}

export const PhoneVerificationStep: React.FC<PhoneVerificationStepProps> = ({
  onVerified,
  initialPhone,
}) => {
  const [phoneNumber, setPhoneNumber] = useState(initialPhone || '');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      return !match[2]
        ? match[1]
        : `(${match[1]}) ${match[2]}${match[3] ? `-${match[3]}` : ''}`;
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setError(null);
  };

  const handleSendCode = async () => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/user/2fa/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ phoneNumber: `+1${cleaned}` }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setIsCodeSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const cleaned = phoneNumber.replace(/\D/g, '');
      const response = await fetch(`${API_URL}/user/2fa/verify-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phoneNumber: `+1${cleaned}`,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }

      setSuccess(true);
      onVerified(`+1${cleaned}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = () => {
    setVerificationCode('');
    setError(null);
    handleSendCode();
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="inline-block p-4 rounded-full bg-[#10b981]/20 mb-6"
        >
          <svg className="w-20 h-20 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
        <h2 className="text-3xl font-bold text-white mb-4">Phone Verified!</h2>
        <p className="text-gray-300 mb-2">
          Your phone number <span className="text-[#C0C8D4] font-semibold">{phoneNumber}</span> has been verified.
        </p>
        <p className="text-gray-400 text-sm">
          You'll receive SMS alerts when you miss check-ins.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-block p-3 rounded-full bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] mb-4">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Verify Your Phone Number
        </h2>
        <p className="text-gray-300">
          We'll send SMS notifications if you miss check-ins
        </p>
      </div>

      <div className="p-8 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
        {!isCodeSent ? (
          <>
            {/* Phone Number Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2">
                Phone Number (US)
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C0C8D4] focus:border-transparent"
                maxLength={14}
              />
              <p className="mt-2 text-xs text-gray-400">
                Standard SMS rates may apply
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30"
              >
                <p className="text-[#ef4444] text-sm">{error}</p>
              </motion.div>
            )}

            <button
              onClick={handleSendCode}
              disabled={isSending || phoneNumber.replace(/\D/g, '').length !== 10}
              className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] hover:opacity-90 transition-opacity text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending Code...
                </>
              ) : (
                'Send Verification Code'
              )}
            </button>
          </>
        ) : (
          <>
            {/* Verification Code Input */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm text-gray-300">
                  Code sent to <span className="text-[#C0C8D4] font-semibold">{phoneNumber}</span>
                </p>
              </div>

              <label className="block text-sm font-medium text-white mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value.replace(/\D/g, ''));
                  setError(null);
                }}
                placeholder="Enter 6-digit code"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-center text-2xl tracking-widest placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C0C8D4] focus:border-transparent"
                maxLength={6}
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-400">
                Code expires in 10 minutes
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30"
              >
                <p className="text-[#ef4444] text-sm">{error}</p>
              </motion.div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleVerifyCode}
                disabled={isVerifying || verificationCode.length !== 6}
                className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] hover:opacity-90 transition-opacity text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </button>

              <button
                onClick={handleResendCode}
                disabled={isSending}
                className="w-full px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-300 text-sm"
              >
                Resend Code
              </button>

              <button
                onClick={() => setIsCodeSent(false)}
                className="w-full px-6 py-2 text-gray-400 hover:text-white transition-colors text-sm"
              >
                Change Phone Number
              </button>
            </div>
          </>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-gray-300">
            <p className="font-semibold text-blue-400 mb-1">Why do we need your phone?</p>
            <p>
              Your phone is used for escalated notifications if you miss email alerts. It's also required
              to unlock your account if it gets frozen due to extended inactivity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
