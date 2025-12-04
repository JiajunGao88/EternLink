/**
 * WelcomeStep Component
 *
 * First step of the onboarding wizard.
 * Introduces users to EternLink and explains what to expect.
 */

import React from 'react';
import { motion } from 'framer-motion';

interface WelcomeStepProps {
  userName?: string;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ userName }) => {
  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-block p-4 rounded-full bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] mb-6">
          <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to EternLink{userName ? `, ${userName}` : ''}! 🎉
        </h1>
        <p className="text-xl text-gray-300">
          Let's set up your account to secure your digital assets for the future
        </p>
      </motion.div>

      <div className="space-y-6">
        {/* What is EternLink */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10"
        >
          <h2 className="text-xl font-semibold text-[#C0C8D4] mb-3">
            🔐 What is EternLink?
          </h2>
          <p className="text-gray-300 leading-relaxed">
            EternLink is a Dead Man's Switch for your cryptocurrency assets. We use advanced cryptography
            to ensure that your crypto seeds and private keys are safely passed to your beneficiaries if
            something happens to you.
          </p>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10"
        >
          <h2 className="text-xl font-semibold text-[#C0C8D4] mb-3">
            ⚙️ How It Works
          </h2>
          <div className="space-y-3 text-gray-300">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#10b981] flex items-center justify-center text-white text-sm font-bold">1</span>
              <p><strong>Regular Check-ins:</strong> You'll check in periodically to confirm you're active</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#10b981] flex items-center justify-center text-white text-sm font-bold">2</span>
              <p><strong>Shamir's Secret Sharing:</strong> Your encryption keys are split into 3 shares - no single share can access your data</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#10b981] flex items-center justify-center text-white text-sm font-bold">3</span>
              <p><strong>Multi-Level Notifications:</strong> If you miss check-ins, we send escalating alerts via email and phone</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#10b981] flex items-center justify-center text-white text-sm font-bold">4</span>
              <p><strong>Beneficiary Access:</strong> After verification, your beneficiaries can retrieve the keys to access your assets</p>
            </div>
          </div>
        </motion.div>

        {/* What we'll set up */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10"
        >
          <h2 className="text-xl font-semibold text-[#C0C8D4] mb-3">
            📋 What We'll Set Up (5 minutes)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Phone verification</span>
            </div>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Voice signature recording</span>
            </div>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Notification preferences</span>
            </div>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Beneficiary setup</span>
            </div>
          </div>
        </motion.div>

        {/* Security guarantee */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-6 rounded-lg bg-gradient-to-r from-[#10b981]/10 to-[#059669]/10 border border-[#10b981]/30"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-2 rounded-lg bg-[#10b981]/20">
              <svg className="w-6 h-6 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[#10b981] mb-2">Zero-Knowledge Security</h3>
              <p className="text-sm text-gray-300">
                We never see your encryption passwords or private keys. Everything is encrypted on your device
                before it reaches our servers. Your data is yours alone.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
