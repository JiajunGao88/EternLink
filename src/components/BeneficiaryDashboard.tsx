import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = 'http://localhost:3001/api';

interface LinkedUser {
  linkId: string;
  user: {
    id: string;
    email: string;
    lastLoginAt: string | null;
    createdAt: string;
  };
  linkedAt: string;
}

interface DeathClaim {
  id: string;
  user: {
    id: string;
    email: string;
  };
  status: string;
  currentStage: string;
  createdAt: string;
  verifiedAt: string | null;
  keyRetrievedAt: string | null;
}

interface DeathClaimDetails {
  claim: {
    id: string;
    status: string;
    currentStage: string;
    emailVerificationCount: number;
    phoneVerificationCount: number;
    verifiedAt: string | null;
    keyRetrievedAt: string | null;
    keyRetrievalTxHash: string | null;
    createdAt: string;
    updatedAt: string;
  };
  user: {
    id: string;
    email: string;
  };
  timeline: Array<{
    id: string;
    eventType: string;
    verificationLevel: string;
    details: string | null;
    createdAt: string;
  }>;
  notifications: Array<{
    id: string;
    notificationType: string;
    sentAt: string;
    emailStatus: string;
  }>;
}

interface BeneficiaryDashboardProps {
  onLogout: () => void;
}

export default function BeneficiaryDashboard({ onLogout }: BeneficiaryDashboardProps) {
  const [linkedUsers, setLinkedUsers] = useState<LinkedUser[]>([]);
  const [deathClaims, setDeathClaims] = useState<DeathClaim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<DeathClaimDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'claims'>('users');
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedUserForClaim, setSelectedUserForClaim] = useState<LinkedUser | null>(null);
  const [showClaimDetails, setShowClaimDetails] = useState(false);

  useEffect(() => {
    fetchLinkedUsers();
    fetchDeathClaims();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchLinkedUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/beneficiary/account/linked-users`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch linked users');
      }

      setLinkedUsers(data.users);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch linked users');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeathClaims = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/beneficiary/death-claim`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch death claims');
      }

      setDeathClaims(data.claims);
    } catch (err: any) {
      console.error('Error fetching death claims:', err);
    }
  };

  const handleSubmitDeathClaim = async () => {
    if (!selectedUserForClaim) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/beneficiary/death-claim/submit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ linkId: selectedUserForClaim.linkId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit death claim');
      }

      setSuccess(`Death claim submitted successfully for ${selectedUserForClaim.user.email}. Verification process has started.`);
      setShowClaimModal(false);
      setSelectedUserForClaim(null);

      // Refresh claims list
      await fetchDeathClaims();
      setActiveTab('claims');
    } catch (err: any) {
      setError(err.message || 'Failed to submit death claim');
    } finally {
      setLoading(false);
    }
  };

  const handleViewClaimDetails = async (claimId: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/beneficiary/death-claim/${claimId}`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch claim details');
      }

      setSelectedClaim(data);
      setShowClaimDetails(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch claim details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'email_verification':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'phone_verification':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'approved':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'email_level':
        return '📧';
      case 'phone_level':
        return '📱';
      case 'key_retrieval':
        return '🔑';
      case 'completed':
        return '✅';
      default:
        return '⏳';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getDaysSinceLastLogin = (lastLoginAt: string | null) => {
    if (!lastLoginAt) return 'Never logged in';
    const days = Math.floor((Date.now() - new Date(lastLoginAt).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#1a2942] to-[#0a1628] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] bg-clip-text text-transparent">
              Beneficiary Dashboard
            </h1>
            <p className="text-[#8b96a8] mt-2">Manage linked users and death claims</p>
          </div>
          <button
            onClick={onLogout}
            className="px-6 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Alert Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400"
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] text-[#0a1628]'
                : 'bg-[#1a2942]/50 text-[#C0C8D4] border border-[#C0C8D4]/20'
            }`}
          >
            Linked Users ({linkedUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'claims'
                ? 'bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] text-[#0a1628]'
                : 'bg-[#1a2942]/50 text-[#C0C8D4] border border-[#C0C8D4]/20'
            }`}
          >
            Death Claims ({deathClaims.length})
          </button>
        </div>

        {/* Content */}
        {loading && !selectedClaim ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C0C8D4] mx-auto"></div>
            <p className="text-[#8b96a8] mt-4">Loading...</p>
          </div>
        ) : (
          <>
            {/* Linked Users Tab */}
            {activeTab === 'users' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {linkedUsers.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-[#8b96a8] text-lg">No linked users yet</p>
                    <p className="text-[#8b96a8] text-sm mt-2">You need a refer code from a user to register</p>
                  </div>
                ) : (
                  linkedUsers.map((link) => (
                    <motion.div
                      key={link.linkId}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-[#1a2942]/50 backdrop-blur-sm rounded-xl p-6 border border-[#C0C8D4]/10 hover:border-[#C0C8D4]/30 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-[#C0C8D4]">{link.user.email}</h3>
                          <p className="text-sm text-[#8b96a8] mt-1">
                            Last login: {getDaysSinceLastLogin(link.user.lastLoginAt)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <p className="text-xs text-[#8b96a8]">
                          Linked since: {formatDate(link.linkedAt)}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedUserForClaim(link);
                          setShowClaimModal(true);
                        }}
                        className="w-full py-2 px-4 bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] text-[#0a1628] font-semibold rounded-lg hover:shadow-lg hover:shadow-[#C0C8D4]/20 transition-all"
                      >
                        Submit Death Claim
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* Death Claims Tab */}
            {activeTab === 'claims' && (
              <div className="space-y-4">
                {deathClaims.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-[#8b96a8] text-lg">No death claims yet</p>
                    <p className="text-[#8b96a8] text-sm mt-2">Submit a claim from the Linked Users tab</p>
                  </div>
                ) : (
                  deathClaims.map((claim) => (
                    <motion.div
                      key={claim.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#1a2942]/50 backdrop-blur-sm rounded-xl p-6 border border-[#C0C8D4]/10"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-xl font-semibold text-[#C0C8D4]">{claim.user.email}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(claim.status)}`}>
                              {claim.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-[#8b96a8]">
                            <span className="flex items-center gap-2">
                              <span className="text-2xl">{getStageIcon(claim.currentStage)}</span>
                              {claim.currentStage.replace('_', ' ').toUpperCase()}
                            </span>
                            <span>•</span>
                            <span>Submitted: {formatDate(claim.createdAt)}</span>
                          </div>

                          {claim.verifiedAt && (
                            <p className="text-sm text-green-400 mt-2">
                              ✓ Verified: {formatDate(claim.verifiedAt)}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleViewClaimDetails(claim.id)}
                          className="px-4 py-2 bg-[#C0C8D4]/10 border border-[#C0C8D4]/20 text-[#C0C8D4] rounded-lg hover:bg-[#C0C8D4]/20 transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Submit Claim Confirmation Modal */}
      <AnimatePresence>
        {showClaimModal && selectedUserForClaim && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowClaimModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a2942] rounded-2xl p-8 max-w-md w-full border border-[#C0C8D4]/20"
            >
              <h2 className="text-2xl font-bold text-[#C0C8D4] mb-4">Submit Death Claim?</h2>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                <p className="text-yellow-400 text-sm">
                  <strong>Warning:</strong> This will initiate a multi-level death verification process for:
                </p>
                <p className="text-yellow-300 font-semibold mt-2">{selectedUserForClaim.user.email}</p>
              </div>

              <div className="space-y-3 mb-6 text-sm text-[#8b96a8]">
                <p><strong className="text-[#C0C8D4]">Verification Process:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>3 emails will be sent over 9 days (every 3 days)</li>
                  <li>Then 2 SMS over 4 days (every 2 days)</li>
                  <li>If no response, you can retrieve the encryption key</li>
                  <li>If user responds, claim will be rejected</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowClaimModal(false)}
                  className="flex-1 py-3 px-6 bg-[#0a1628] border border-[#C0C8D4]/20 text-[#C0C8D4] font-semibold rounded-lg hover:bg-[#1a2942] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitDeathClaim}
                  disabled={loading}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] text-[#0a1628] font-semibold rounded-lg hover:shadow-lg hover:shadow-[#C0C8D4]/20 transition-all disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Confirm Submit'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Claim Details Modal */}
      <AnimatePresence>
        {showClaimDetails && selectedClaim && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
            onClick={() => setShowClaimDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a2942] rounded-2xl p-8 max-w-3xl w-full border border-[#C0C8D4]/20 my-8"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#C0C8D4] mb-2">Death Claim Details</h2>
                  <p className="text-[#8b96a8]">{selectedClaim.user.email}</p>
                </div>
                <button
                  onClick={() => setShowClaimDetails(false)}
                  className="text-[#8b96a8] hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Status Overview */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#0a1628] rounded-lg p-4 border border-[#C0C8D4]/10">
                  <p className="text-xs text-[#8b96a8] mb-1">Status</p>
                  <p className="text-lg font-semibold text-[#C0C8D4]">
                    {selectedClaim.claim.status.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
                <div className="bg-[#0a1628] rounded-lg p-4 border border-[#C0C8D4]/10">
                  <p className="text-xs text-[#8b96a8] mb-1">Current Stage</p>
                  <p className="text-lg font-semibold text-[#C0C8D4] flex items-center gap-2">
                    {getStageIcon(selectedClaim.claim.currentStage)}
                    {selectedClaim.claim.currentStage.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
                <div className="bg-[#0a1628] rounded-lg p-4 border border-[#C0C8D4]/10">
                  <p className="text-xs text-[#8b96a8] mb-1">Email Verifications</p>
                  <p className="text-lg font-semibold text-[#C0C8D4]">
                    {selectedClaim.claim.emailVerificationCount} / 3
                  </p>
                </div>
                <div className="bg-[#0a1628] rounded-lg p-4 border border-[#C0C8D4]/10">
                  <p className="text-xs text-[#8b96a8] mb-1">Phone Verifications</p>
                  <p className="text-lg font-semibold text-[#C0C8D4]">
                    {selectedClaim.claim.phoneVerificationCount} / 2
                  </p>
                </div>
              </div>

              {/* Key Retrieval Info */}
              {selectedClaim.claim.keyRetrievalTxHash && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
                  <p className="text-green-400 font-semibold mb-2">✓ Key Retrieved</p>
                  <p className="text-xs text-green-300 break-all font-mono">
                    TX: {selectedClaim.claim.keyRetrievalTxHash}
                  </p>
                </div>
              )}

              {/* Timeline */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#C0C8D4] mb-4">Verification Timeline</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedClaim.timeline.length === 0 ? (
                    <p className="text-[#8b96a8] text-sm">No events yet</p>
                  ) : (
                    selectedClaim.timeline.map((event) => (
                      <div key={event.id} className="bg-[#0a1628] rounded-lg p-4 border border-[#C0C8D4]/10">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-semibold text-[#C0C8D4]">
                            {event.eventType.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-xs text-[#8b96a8]">{formatDate(event.createdAt)}</span>
                        </div>
                        <p className="text-xs text-[#8b96a8]">
                          Level: {event.verificationLevel}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Progress Notifications */}
              <div>
                <h3 className="text-lg font-semibold text-[#C0C8D4] mb-4">Progress Notifications</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedClaim.notifications.length === 0 ? (
                    <p className="text-[#8b96a8] text-sm">No notifications yet</p>
                  ) : (
                    selectedClaim.notifications.map((notification) => (
                      <div key={notification.id} className="flex justify-between items-center bg-[#0a1628] rounded-lg p-3 border border-[#C0C8D4]/10">
                        <span className="text-sm text-[#C0C8D4]">
                          {notification.notificationType.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            notification.emailStatus === 'sent'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {notification.emailStatus}
                          </span>
                          <span className="text-xs text-[#8b96a8]">{formatDate(notification.sentAt)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
