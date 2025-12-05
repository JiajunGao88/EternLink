import React, { useState } from 'react';
import { motion } from 'framer-motion';

const API_BASE_URL = 'http://localhost:3001/api';

interface LoginPageProps {
  onLoginSuccess: (token: string, user: any) => void;
  onBackToHome: () => void;
  onRegisterClick: () => void;
}

export default function LoginPage({ onLoginSuccess, onBackToHome, onRegisterClick }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/registration/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#1a2942] to-[#0a1628] text-white">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 bg-[#0a1628]/80 backdrop-blur-md border-b border-[#C0C8D4]/10"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={onBackToHome}
            className="px-4 py-2 border border-[#C0C8D4]/30 text-[#C0C8D4] hover:bg-[#C0C8D4]/10 hover:border-[#C0C8D4]/50 rounded-lg transition-all"
          >
            ← Back to Home
          </button>
        </div>
      </motion.div>

      {/* Content */}
      <div className="min-h-screen flex items-center justify-center px-6 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="bg-gradient-to-br from-[#1a2942]/80 to-[#0a1628]/60 backdrop-blur-xl border border-[#C0C8D4]/20 rounded-2xl p-10 shadow-2xl">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path
                    d="M24 4L8 12V22C8 31 14 39 24 44C34 39 40 31 40 22V12L24 4Z"
                    stroke="#C0C8D4"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 24H18L21 18L24 30L27 20L30 24H36"
                    stroke="#3DA288"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-2xl font-bold bg-gradient-to-r from-[#C0C8D4] to-[#3DA288] bg-clip-text text-transparent">
                  EternLink
                </span>
              </div>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[#C0C8D4] to-white bg-clip-text text-transparent">
                Welcome Back
              </h1>
              <p className="text-[#8b96a8]">Log in to your EternLink account</p>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2"
              >
                <span>⚠️</span> {error}
              </motion.div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#C0C8D4] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#0a1628]/50 border border-[#C0C8D4]/30 rounded-lg text-white placeholder-[#8b96a8] focus:border-[#3DA288] focus:outline-none focus:ring-2 focus:ring-[#3DA288]/30 transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#C0C8D4] mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#0a1628]/50 border border-[#C0C8D4]/30 rounded-lg text-white placeholder-[#8b96a8] focus:border-[#3DA288] focus:outline-none focus:ring-2 focus:ring-[#3DA288]/30 transition-all"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 bg-gradient-to-r from-[#3DA288] to-[#2d8a6f] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#3DA288]/30 transition-all transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? 'Logging in...' : 'Log In'}
              </button>
            </form>

            {/* Register Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-[#8b96a8]">
                Don't have an account?{' '}
                <button
                  onClick={onRegisterClick}
                  className="text-[#3DA288] font-semibold hover:text-[#2d8a6f] transition-colors"
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
