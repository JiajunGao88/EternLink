import React, { useState } from 'react';
import { motion } from 'framer-motion';

import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api`;

interface BeneficiaryRegistrationPageProps {
  onRegistrationComplete: (token: string) => void;
  onBackToHome: () => void;
}

export default function BeneficiaryRegistrationPage({
  onRegistrationComplete,
  onBackToHome
}: BeneficiaryRegistrationPageProps) {
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referCode, setReferCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [linkedUser, setLinkedUser] = useState<{ id: string; email: string } | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (referCode.length !== 12) {
      setError('Refer code must be exactly 12 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          accountType: 'beneficiary',
          referCode: referCode.toUpperCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      const linkedEmail = data.linkedUser?.email;
      if (linkedEmail) {
        setLinkedUser({ id: data.linkedUser.id ?? '', email: linkedEmail });
        setSuccess(`Registration successful! You are now linked to user: ${linkedEmail}. Please check your email for verification code.`);
      } else {
        setLinkedUser(null);
        setSuccess('Registration successful! Please check your email for verification code.');
      }
      setStep('verify');
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setSuccess('Email verified successfully! Redirecting to beneficiary dashboard...');
      setTimeout(() => {
        onRegistrationComplete(data.token);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/resend-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      setSuccess('Verification code resent! Please check your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#1a2942] to-[#0a1628] text-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* Back Button */}
        <button
          onClick={onBackToHome}
          className="mb-6 flex items-center text-[#C0C8D4] hover:text-white transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] bg-clip-text text-transparent">
            Beneficiary Registration
          </h1>
          <p className="text-[#8b96a8]">
            {step === 'register'
              ? 'Register as a beneficiary using a refer code from a user account'
              : 'Verify your email to complete registration'}
          </p>
        </div>

        {/* Registration Form */}
        {step === 'register' && (
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleRegister}
            className="bg-[#1a2942]/50 backdrop-blur-sm rounded-2xl p-8 border border-[#C0C8D4]/10"
          >
            <div className="space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-[#C0C8D4] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a1628] border border-[#C0C8D4]/20 rounded-lg text-white placeholder-[#8b96a8] focus:outline-none focus:border-[#C0C8D4] transition-colors"
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              {/* Refer Code Input */}
              <div>
                <label className="block text-sm font-medium text-[#C0C8D4] mb-2">
                  Refer Code
                </label>
                <input
                  type="text"
                  value={referCode}
                  onChange={(e) => setReferCode(e.target.value.toUpperCase())}
                  maxLength={12}
                  className="w-full px-4 py-3 bg-[#0a1628] border border-[#C0C8D4]/20 rounded-lg text-white placeholder-[#8b96a8] focus:outline-none focus:border-[#C0C8D4] transition-colors font-mono tracking-wider"
                  placeholder="XXXXXXXXXXXX"
                  required
                />
                <p className="mt-2 text-xs text-[#8b96a8]">
                  Enter the 12-character refer code provided by the user account
                </p>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-[#C0C8D4] mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a1628] border border-[#C0C8D4]/20 rounded-lg text-white placeholder-[#8b96a8] focus:outline-none focus:border-[#C0C8D4] transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>

              {/* Confirm Password Input */}
              <div>
                <label className="block text-sm font-medium text-[#C0C8D4] mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a1628] border border-[#C0C8D4]/20 rounded-lg text-white placeholder-[#8b96a8] focus:outline-none focus:border-[#C0C8D4] transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Success Message */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm"
                >
                  {success}
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] text-[#0a1628] font-semibold rounded-lg hover:shadow-lg hover:shadow-[#C0C8D4]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Registering...' : 'Register as Beneficiary'}
              </button>
            </div>
          </motion.form>
        )}

        {/* Verification Form */}
        {step === 'verify' && (
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleVerifyEmail}
            className="bg-[#1a2942]/50 backdrop-blur-sm rounded-2xl p-8 border border-[#C0C8D4]/10"
          >
            <div className="space-y-6">
              {/* Linked User Info */}
              {linkedUser && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-400">
                    <span className="font-semibold">Linked to:</span> {linkedUser.email}
                  </p>
                </div>
              )}

              {/* Verification Code Input */}
              <div>
                <label className="block text-sm font-medium text-[#C0C8D4] mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  className="w-full px-4 py-3 bg-[#0a1628] border border-[#C0C8D4]/20 rounded-lg text-white placeholder-[#8b96a8] focus:outline-none focus:border-[#C0C8D4] transition-colors text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                  required
                />
                <p className="mt-2 text-xs text-[#8b96a8] text-center">
                  Enter the 6-digit code sent to {email}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Success Message */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm"
                >
                  {success}
                </motion.div>
              )}

              {/* Buttons */}
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-6 bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] text-[#0a1628] font-semibold rounded-lg hover:shadow-lg hover:shadow-[#C0C8D4]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify Email'}
                </button>

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="w-full py-3 px-6 bg-[#0a1628] border border-[#C0C8D4]/20 text-[#C0C8D4] font-semibold rounded-lg hover:bg-[#1a2942] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Resend Code
                </button>
              </div>
            </div>
          </motion.form>
        )}

        {/* Info Box */}
        <div className="mt-6 p-4 bg-[#1a2942]/30 border border-[#C0C8D4]/10 rounded-lg">
          <h3 className="text-sm font-semibold text-[#C0C8D4] mb-2">What is a Beneficiary Account?</h3>
          <p className="text-xs text-[#8b96a8]">
            Beneficiary accounts are linked to user accounts via a refer code. As a beneficiary, you can
            submit death claims for linked users and retrieve encrypted files after the verification process.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
