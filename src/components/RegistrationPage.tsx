import { useState } from 'react';
import { motion } from 'framer-motion';

import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api`;

interface RegistrationPageProps {
  onRegistrationComplete: (token: string, accountType: 'user' | 'beneficiary', user?: { email: string; name?: string }) => void;
  onBackToHome: () => void;
  onLoginClick: () => void;
}

export default function RegistrationPage({
  onRegistrationComplete,
  onBackToHome,
  onLoginClick
}: RegistrationPageProps) {
  const [step, setStep] = useState<'selectType' | 'register' | 'verify'>('selectType');
  const [accountType, setAccountType] = useState<'user' | 'beneficiary' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referCode, setReferCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [linkedUser, setLinkedUser] = useState<{ id: string; email: string } | null>(null);

  const handleSelectAccountType = (type: 'user' | 'beneficiary') => {
    setAccountType(type);
    setStep('register');
  };

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

    if (accountType === 'beneficiary' && referCode.length !== 12) {
      setError('Refer code must be exactly 12 characters');
      return;
    }

    setLoading(true);

    try {
      const endpoint = `${API_URL}/auth/register`;

      const body = accountType === 'user'
        ? { email, password }
        : { email, password, referCode: referCode.toUpperCase() };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      if (accountType === 'beneficiary') {
        setLinkedUser(data.linkedUser);
        setSuccess(`Registration successful! You are now linked to user: ${data.linkedUser.email}. Please check your email for verification code.`);
      } else {
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

      setSuccess('Email verified successfully! Redirecting...');
      setTimeout(() => {
        onRegistrationComplete(data.token, accountType!, { email });
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
        <button
          onClick={onBackToHome}
          className="mb-6 flex items-center text-[#C0C8D4] hover:text-white transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </button>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] bg-clip-text text-transparent">
            {step === 'selectType' ? 'Create Account' : step === 'register' ? 'Register' : 'Verify Email'}
          </h1>
          <p className="text-[#8b96a8]">
            {step === 'selectType' && 'Choose your account type to get started'}
            {step === 'register' && accountType === 'user' && 'Create your user account'}
            {step === 'register' && accountType === 'beneficiary' && 'Register as a beneficiary using a refer code'}
            {step === 'verify' && 'Verify your email to complete registration'}
          </p>
        </div>

        {step === 'selectType' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <button
              onClick={() => handleSelectAccountType('user')}
              className="w-full p-6 bg-[#1a2942]/50 backdrop-blur-sm rounded-2xl border border-[#C0C8D4]/10 hover:border-[#3DA288]/50 hover:bg-[#1a2942]/80 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#3DA288]/10 rounded-lg flex items-center justify-center group-hover:bg-[#3DA288]/20 transition-colors">
                  <svg className="w-6 h-6 text-[#3DA288]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-xl font-semibold text-[#C0C8D4] mb-2">User Account</h3>
                  <p className="text-sm text-[#8b96a8]">
                    Create a standard user account to manage your encrypted files and set up Dead Man's Switch protection
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleSelectAccountType('beneficiary')}
              className="w-full p-6 bg-[#1a2942]/50 backdrop-blur-sm rounded-2xl border border-[#C0C8D4]/10 hover:border-[#C0C8D4]/50 hover:bg-[#1a2942]/80 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#C0C8D4]/10 rounded-lg flex items-center justify-center group-hover:bg-[#C0C8D4]/20 transition-colors">
                  <svg className="w-6 h-6 text-[#C0C8D4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-xl font-semibold text-[#C0C8D4] mb-2">Beneficiary Account</h3>
                  <p className="text-sm text-[#8b96a8]">
                    Register as a beneficiary with a refer code to receive access to encrypted files after verification
                  </p>
                </div>
              </div>
            </button>

            <div className="mt-6 text-center">
              <p className="text-[#8b96a8]">
                Already have an account?{' '}
                <button onClick={onLoginClick} className="text-[#3DA288] hover:text-[#C0C8D4] font-semibold transition-colors">
                  Log in
                </button>
              </p>
            </div>
          </motion.div>
        )}

        {step === 'register' && (
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleRegister}
            className="bg-[#1a2942]/50 backdrop-blur-sm rounded-2xl p-8 border border-[#C0C8D4]/10"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  accountType === 'user'
                    ? 'bg-[#3DA288]/10 text-[#3DA288] border border-[#3DA288]/30'
                    : 'bg-[#C0C8D4]/10 text-[#C0C8D4] border border-[#C0C8D4]/30'
                }`}>
                  {accountType === 'user' ? '👤 User Account' : '👥 Beneficiary Account'}
                </span>
                <button
                  type="button"
                  onClick={() => setStep('selectType')}
                  className="text-sm text-[#8b96a8] hover:text-[#C0C8D4] transition-colors"
                >
                  Change
                </button>
              </div>

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

              {accountType === 'beneficiary' && (
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
              )}

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

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm"
                >
                  {success}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] text-[#0a1628] font-semibold rounded-lg hover:shadow-lg hover:shadow-[#C0C8D4]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Registering...' : 'Create Account'}
              </button>

              <div className="text-center">
                <p className="text-sm text-[#8b96a8]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={onLoginClick}
                    className="text-[#3DA288] hover:text-[#C0C8D4] font-semibold transition-colors"
                  >
                    Log in
                  </button>
                </p>
              </div>
            </div>
          </motion.form>
        )}

        {step === 'verify' && (
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleVerifyEmail}
            className="bg-[#1a2942]/50 backdrop-blur-sm rounded-2xl p-8 border border-[#C0C8D4]/10"
          >
            <div className="space-y-6">
              {linkedUser && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-400">
                    <span className="font-semibold">Linked to:</span> {linkedUser.email}
                  </p>
                </div>
              )}

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

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm"
                >
                  {success}
                </motion.div>
              )}

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

        {step === 'selectType' && (
          <div className="mt-6 p-4 bg-[#1a2942]/30 border border-[#C0C8D4]/10 rounded-lg">
            <h3 className="text-sm font-semibold text-[#C0C8D4] mb-2">Which account type should I choose?</h3>
            <ul className="text-xs text-[#8b96a8] space-y-1">
              <li><strong>User:</strong> If you want to protect your own crypto assets and files</li>
              <li><strong>Beneficiary:</strong> If someone gave you a refer code to access their files</li>
            </ul>
          </div>
        )}
      </motion.div>
    </div>
  );
}
