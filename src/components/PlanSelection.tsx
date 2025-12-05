/**
 * PlanSelection Component
 *
 * Subscription plan selection for users.
 * Two plans: Individual and Family
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface PlanSelectionProps {
  onPlanSelected: (plan: 'individual' | 'family') => void;
  onSkip?: () => void;
}

interface Plan {
  id: 'individual' | 'family';
  name: string;
  price: string;
  period: string;
  features: string[];
  recommended?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'individual',
    name: 'Individual',
    price: '$9.99',
    period: 'per month',
    features: [
      '1 User Account',
      'Up to 3 Beneficiaries',
      'Unlimited File Storage',
      'Email & Phone Notifications',
      'Voice Verification',
      'Blockchain Verification',
      '24/7 Support',
    ],
  },
  {
    id: 'family',
    name: 'Family',
    price: '$19.99',
    period: 'per month',
    recommended: true,
    features: [
      '5 User Accounts',
      'Up to 10 Beneficiaries per User',
      'Unlimited File Storage',
      'Priority Email & Phone Notifications',
      'Voice Verification',
      'Blockchain Verification',
      'Priority 24/7 Support',
      'Family Dashboard',
      'Shared Beneficiary Management',
    ],
  },
];

export const PlanSelection: React.FC<PlanSelectionProps> = ({ onPlanSelected, onSkip }) => {
  const [selectedPlan, setSelectedPlan] = useState<'individual' | 'family' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectPlan = async (planId: 'individual' | 'family') => {
    setSelectedPlan(planId);
    setIsProcessing(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    onPlanSelected(planId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#1a2942] to-[#0a1628] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block p-4 rounded-full bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] mb-6"
          >
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.040A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </motion.div>
          <h1 className="text-4xl font-bold text-white mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-300">
            Secure your digital legacy with EternLink
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                relative p-8 rounded-2xl border-2 transition-all flex flex-col
                ${selectedPlan === plan.id
                  ? 'border-[#10b981] bg-[#10b981]/10 shadow-2xl shadow-[#10b981]/30'
                  : plan.recommended
                  ? 'border-[#C0C8D4] bg-white/5 hover:shadow-xl'
                  : 'border-white/10 bg-white/5 hover:border-white/30'
                }
              `}
            >
              {/* Recommended Badge */}
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] text-white text-sm font-semibold">
                    Recommended
                  </span>
                </div>
              )}

              {/* Plan Icon */}
              <div className="flex justify-center mb-6">
                <div className="p-3 rounded-lg bg-white/5">
                  {plan.id === 'individual' ? (
                    <svg className="w-10 h-10 text-[#C0C8D4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ) : (
                    <svg className="w-10 h-10 text-[#C0C8D4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Plan Header */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-gray-400 text-sm mb-4">
                  {plan.id === 'individual' ? 'Secure your digital legacy' : 'Protect your whole family'}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400">{plan.period}</span>
                </div>
              </div>

              {/* Select Button */}
              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isProcessing && selectedPlan !== plan.id}
                className={`
                  w-full py-3 rounded-lg font-semibold transition-all mb-6
                  ${selectedPlan === plan.id
                    ? 'bg-[#10b981] hover:bg-[#059669] text-white'
                    : plan.recommended
                    ? 'bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] hover:opacity-90 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                `}
              >
                {isProcessing && selectedPlan === plan.id ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : selectedPlan === plan.id ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Selected
                  </>
                ) : (
                  `Choose ${plan.name}`
                )}
              </button>

              {/* Features List */}
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-400 mb-4">
                  {plan.id === 'individual' ? 'Everything you need:' : 'Everything in Individual, plus:'}
                </p>
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                      <svg className="w-4 h-4 text-[#10b981] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Skip Option */}
        {onSkip && (
          <div className="text-center">
            <button
              onClick={onSkip}
              disabled={isProcessing}
              className="text-gray-400 hover:text-white transition-colors underline disabled:opacity-50"
            >
              I'll choose a plan later
            </button>
            <p className="text-sm text-gray-500 mt-2">
              Your account will remain frozen until you select a plan
            </p>
          </div>
        )}

        {/* Money Back Guarantee */}
        <div className="mt-12 p-6 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-start gap-4">
            <svg className="w-8 h-8 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.040A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">30-Day Money Back Guarantee</h4>
              <p className="text-sm text-gray-300">
                Try EternLink risk-free. If you're not satisfied within the first 30 days,
                we'll refund your payment in full - no questions asked.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
