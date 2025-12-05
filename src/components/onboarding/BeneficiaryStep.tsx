/**
 * BeneficiaryStep Component
 *
 * Add beneficiaries and generate refer codes for them to register.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../../config';

const API_URL = `${API_BASE_URL}/api`;

interface Beneficiary {
  name: string;
  email: string;
  relationship: string;
  referCode?: string;
}

interface BeneficiaryStepProps {
  onComplete?: (beneficiaries: Beneficiary[]) => void;
  onChange?: (beneficiaries: Beneficiary[]) => void;
}

export const BeneficiaryStep: React.FC<BeneficiaryStepProps> = ({ onChange }) => {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    relationship: 'family',
  });
  const [error, setError] = useState<string | null>(null);

  const sendInvitationEmail = async (beneficiary: Beneficiary, referCode: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const inviterEmail = localStorage.getItem('userEmail') || 'your inviter';
      const inviterName = localStorage.getItem('userName') || 'EternLink User';

      // Base URL for registration
      const registrationUrl = `${window.location.origin}/beneficiary-register?code=${referCode}`;

      const response = await fetch(`${API_URL}/beneficiary/send-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          beneficiaryEmail: beneficiary.email,
          beneficiaryName: beneficiary.name,
          inviterName: inviterName,
          inviterEmail: inviterEmail,
          referCode: referCode,
          registrationUrl: registrationUrl,
          relationship: beneficiary.relationship,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.warn('Failed to send invitation email:', data.error);
        // Don't throw error - email is optional
      }
    } catch (err) {
      console.warn('Failed to send invitation email:', err);
      // Don't throw error - email is optional
    }
  };

  const generateReferCode = async (beneficiary: Beneficiary) => {
    setIsGenerating(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/beneficiary/generate-refer-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          beneficiaryEmail: beneficiary.email,
          beneficiaryName: beneficiary.name,
          relationship: beneficiary.relationship,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate refer code');
      }

      // Send invitation email with the generated refer code
      await sendInvitationEmail(beneficiary, data.referCode);

      return data.referCode;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate refer code');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddBeneficiary = async () => {
    if (!formData.name || !formData.email) {
      setError('Please fill in all fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    const referCode = await generateReferCode(formData as Beneficiary);
    if (!referCode) return;

    const newBeneficiary: Beneficiary = {
      ...formData,
      referCode,
    };

    const updatedBeneficiaries = [...beneficiaries, newBeneficiary];
    setBeneficiaries(updatedBeneficiaries);
    setFormData({ name: '', email: '', relationship: 'family' });
    setShowAddForm(false);
    setError(null);

    // Notify parent of change
    if (onChange) {
      onChange(updatedBeneficiaries);
    }
  };

  const handleRemoveBeneficiary = (index: number) => {
    const updatedBeneficiaries = beneficiaries.filter((_, i) => i !== index);
    setBeneficiaries(updatedBeneficiaries);

    // Notify parent of change
    if (onChange) {
      onChange(updatedBeneficiaries);
    }
  };


  const copyReferCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const getRelationshipIcon = (relationship: string) => {
    switch (relationship) {
      case 'family':
        return '👨‍👩‍👧‍👦';
      case 'friend':
        return '🤝';
      case 'partner':
        return '💼';
      default:
        return '👤';
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-block p-3 rounded-full bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] mb-4">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Add Beneficiaries
        </h2>
        <p className="text-gray-300">
          Who should receive access to your encrypted assets?
        </p>
      </div>

      {/* Beneficiaries List */}
      <div className="mb-6 space-y-4">
        <AnimatePresence>
          {beneficiaries.map((beneficiary, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getRelationshipIcon(beneficiary.relationship)}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{beneficiary.name}</h3>
                      <p className="text-sm text-gray-400">{beneficiary.email}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Refer Code:</span>
                    <code className="px-3 py-1 rounded bg-white/10 text-[#C0C8D4] font-mono text-sm">
                      {beneficiary.referCode}
                    </code>
                    <button
                      onClick={() => copyReferCode(beneficiary.referCode!)}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                      title="Copy refer code"
                    >
                      <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Share this code with {beneficiary.name} to let them register as your beneficiary
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveBeneficiary(index)}
                  className="ml-4 p-2 rounded-lg hover:bg-[#ef4444]/20 transition-colors text-gray-400 hover:text-[#ef4444]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {beneficiaries.length === 0 && (
          <div className="p-12 rounded-lg bg-white/5 backdrop-blur-sm border border-dashed border-white/20 text-center">
            <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-400">No beneficiaries added yet</p>
            <p className="text-sm text-gray-500 mt-1">Click "Add Beneficiary" to get started</p>
          </div>
        )}
      </div>

      {/* Add Beneficiary Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-6 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Add New Beneficiary</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C0C8D4] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C0C8D4] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Relationship</label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#C0C8D4] focus:border-transparent"
                >
                  <option value="family" className="bg-[#1a2942]">👨‍👩‍👧‍👦 Family Member</option>
                  <option value="friend" className="bg-[#1a2942]">🤝 Friend</option>
                  <option value="partner" className="bg-[#1a2942]">💼 Business Partner</option>
                  <option value="other" className="bg-[#1a2942]">👤 Other</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleAddBeneficiary}
                  disabled={isGenerating}
                  className="flex-1 px-6 py-2 rounded-lg bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] hover:opacity-90 transition-opacity text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Generating...' : 'Add Beneficiary'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ name: '', email: '', relationship: 'family' });
                    setError(null);
                  }}
                  className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30"
        >
          <p className="text-[#ef4444] text-sm">{error}</p>
        </motion.div>
      )}

      {/* Add Button */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full px-6 py-3 rounded-lg border-2 border-dashed border-white/20 hover:border-[#C0C8D4] transition-colors text-gray-300 hover:text-white flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Beneficiary
        </button>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-gray-300">
            <p className="font-semibold text-blue-400 mb-1">How beneficiary access works</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Each beneficiary gets a unique refer code to register</li>
              <li>They'll be linked to your account after registration</li>
              <li>If you miss check-ins, they can submit a death claim</li>
              <li>After verification, they receive encryption key shares</li>
              <li>You can add or remove beneficiaries anytime</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
};
