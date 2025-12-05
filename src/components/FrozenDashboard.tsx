/**
 * FrozenDashboard Component
 *
 * Displayed when user account is frozen (no plan purchased)
 * Shows plan selection and account limitations
 */

import React from 'react';
import { motion } from 'framer-motion';

interface FrozenDashboardProps {
  onSelectPlan: () => void;
  onLogout: () => void;
}

export const FrozenDashboard: React.FC<FrozenDashboardProps> = ({ onSelectPlan, onLogout }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#1a2942] to-[#0a1628]">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
              <path
                d="M24 4L8 12V22C8 31 14 39 24 44C34 39 40 31 40 22V12L24 4Z"
                stroke="#C0C8D4"
                strokeWidth="2.5"
                fill="none"
              />
            </svg>
            <span className="text-2xl font-bold bg-gradient-to-r from-[#C0C8D4] to-[#3DA288] bg-clip-text text-transparent">
              EternLink
            </span>
          </div>
          <button
            onClick={onLogout}
            className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          {/* Frozen Icon */}
          <div className="inline-block p-6 rounded-full bg-[#ef4444]/20 mb-6">
            <svg className="w-20 h-20 text-[#ef4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4">
            Account Frozen
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Your account is currently in a frozen state
          </p>
          <p className="text-gray-400">
            To unlock full access and protect your digital assets, please choose a subscription plan
          </p>
        </motion.div>

        {/* Limitations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12 p-8 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10"
        >
          <h3 className="text-xl font-semibold text-white mb-4">
            What's Limited in Frozen State?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-[#ef4444] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <p className="text-white font-medium">No File Encryption</p>
                <p className="text-sm text-gray-400">Cannot upload and encrypt files</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-[#ef4444] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <p className="text-white font-medium">No Beneficiary Management</p>
                <p className="text-sm text-gray-400">Cannot add or manage beneficiaries</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-[#ef4444] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <p className="text-white font-medium">No Heartbeat Monitoring</p>
                <p className="text-sm text-gray-400">No automated check-in system</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-[#ef4444] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <p className="text-white font-medium">No Notifications</p>
                <p className="text-sm text-gray-400">Email and phone alerts disabled</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* What You Get */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12 p-8 rounded-lg bg-gradient-to-br from-[#10b981]/10 to-[#059669]/10 border border-[#10b981]/30"
        >
          <h3 className="text-xl font-semibold text-[#10b981] mb-4">
            Unlock Full Protection with a Plan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-[#10b981] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-white font-medium">Military-Grade Encryption</p>
                <p className="text-sm text-gray-300">AES-256-GCM with Shamir's Secret Sharing</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-[#10b981] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-white font-medium">Automated Monitoring</p>
                <p className="text-sm text-gray-300">Smart heartbeat system with notifications</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-[#10b981] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-white font-medium">Blockchain Verification</p>
                <p className="text-sm text-gray-300">On-chain proof of file integrity</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-[#10b981] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-white font-medium">24/7 Support</p>
                <p className="text-sm text-gray-300">Always here when you need us</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <button
            onClick={onSelectPlan}
            className="px-12 py-4 rounded-lg bg-gradient-to-r from-[#10b981] to-[#059669] hover:opacity-90 transition-opacity text-white text-lg font-semibold shadow-lg shadow-[#10b981]/30 flex items-center justify-center gap-3 mx-auto"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            Choose a Plan & Unlock Account
          </button>
          <p className="text-sm text-gray-400 mt-4">
            Starting from $9.99/month • Cancel anytime
          </p>
        </motion.div>
      </div>
    </div>
  );
};
