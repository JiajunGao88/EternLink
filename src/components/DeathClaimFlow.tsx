/**
 * DeathClaimFlow Component
 *
 * Enhanced UI for death claim verification flow with visual timeline,
 * progress tracking, and detailed verification stages.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Timeline, TimelineEvent } from './shared/Timeline';
import { Modal } from './shared/Modal';

import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api`;

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

interface DeathClaimFlowProps {
  claimId: string;
  onClose: () => void;
  onKeyRetrievalComplete?: () => void;
}

export const DeathClaimFlow: React.FC<DeathClaimFlowProps> = ({
  claimId,
  onClose,
  onKeyRetrievalComplete,
}) => {
  const [claimDetails, setClaimDetails] = useState<DeathClaimDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchClaimDetails();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchClaimDetails, 30000);
    return () => clearInterval(interval);
  }, [claimId]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchClaimDetails = async () => {
    if (!isRefreshing) setIsRefreshing(true);
    try {
      const response = await fetch(`${API_URL}/beneficiary/death-claim/${claimId}`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch claim details');
      }

      setClaimDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch claim details');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const buildTimelineEvents = (): TimelineEvent[] => {
    if (!claimDetails) return [];

    const events: TimelineEvent[] = [];
    const { claim, timeline } = claimDetails;

    // Claim Submitted
    events.push({
      id: 'submitted',
      title: 'Death Claim Submitted',
      description: `Claim initiated for ${claimDetails.user.email}`,
      timestamp: claim.createdAt,
      status: 'completed',
      metadata: {
        'Claim ID': claim.id.substring(0, 8),
      },
    });

    // Email Verification Stage
    const emailEvents = timeline.filter(e => e.verificationLevel === 'email_level');
    if (claim.status !== 'rejected') {
      events.push({
        id: 'email_verification',
        title: 'Email Verification',
        description: `${claim.emailVerificationCount}/3 verification emails sent`,
        timestamp: emailEvents.length > 0 ? emailEvents[emailEvents.length - 1].createdAt : claim.createdAt,
        status: claim.currentStage === 'email_level'
          ? 'current'
          : claim.emailVerificationCount >= 3
          ? 'completed'
          : 'pending',
        metadata: {
          'Emails Sent': claim.emailVerificationCount,
          'Target': 3,
        },
      });
    }

    // Phone Verification Stage
    const phoneEvents = timeline.filter(e => e.verificationLevel === 'phone_level');
    if (claim.status !== 'rejected' && claim.emailVerificationCount >= 3) {
      events.push({
        id: 'phone_verification',
        title: 'Phone Verification',
        description: `${claim.phoneVerificationCount}/2 SMS verifications sent`,
        timestamp: phoneEvents.length > 0 ? phoneEvents[phoneEvents.length - 1].createdAt : undefined,
        status: claim.currentStage === 'phone_level'
          ? 'current'
          : claim.phoneVerificationCount >= 2
          ? 'completed'
          : 'pending',
        metadata: {
          'SMS Sent': claim.phoneVerificationCount,
          'Target': 2,
        },
      });
    }

    // Key Retrieval
    if (claim.status !== 'rejected' && (claim.phoneVerificationCount >= 2 || claim.verifiedAt)) {
      events.push({
        id: 'key_retrieval',
        title: 'Key Retrieval',
        description: claim.keyRetrievedAt
          ? 'Encryption keys retrieved successfully'
          : 'Awaiting key retrieval',
        timestamp: claim.keyRetrievedAt || undefined,
        status: claim.keyRetrievedAt ? 'completed' : claim.currentStage === 'key_retrieval' ? 'current' : 'pending',
        metadata: claim.keyRetrievalTxHash ? {
          'Transaction Hash': claim.keyRetrievalTxHash.substring(0, 16) + '...',
        } : undefined,
      });
    }

    // Rejected
    if (claim.status === 'rejected') {
      events.push({
        id: 'rejected',
        title: 'Claim Rejected',
        description: 'User confirmed they are alive',
        timestamp: claim.updatedAt,
        status: 'failed',
      });
    }

    // Completed
    if (claim.keyRetrievedAt && claim.status !== 'rejected') {
      events.push({
        id: 'completed',
        title: 'Recovery Complete',
        description: 'All verification stages passed. Assets can now be accessed.',
        timestamp: claim.keyRetrievedAt,
        status: 'completed',
      });
    }

    return events;
  };

  const getStageProgress = () => {
    if (!claimDetails) return 0;
    const { claim } = claimDetails;

    if (claim.status === 'rejected') return 0;
    if (claim.keyRetrievedAt) return 100;

    let progress = 0;
    // Email verification: 0-40%
    progress += Math.min((claim.emailVerificationCount / 3) * 40, 40);
    // Phone verification: 40-70%
    progress += Math.min((claim.phoneVerificationCount / 2) * 30, 30);
    // Key retrieval: 70-100%
    if (claim.currentStage === 'key_retrieval') progress += 15;

    return Math.round(progress);
  };

  const getNextAction = () => {
    if (!claimDetails) return null;
    const { claim } = claimDetails;

    if (claim.status === 'rejected') {
      return {
        title: 'Claim Rejected',
        description: 'The user has confirmed they are alive. No further action needed.',
        action: null,
      };
    }

    if (claim.keyRetrievedAt) {
      return {
        title: 'Recovery Complete',
        description: 'All verification stages complete. You can now retrieve the encryption keys.',
        action: 'retrieve_keys',
      };
    }

    if (claim.currentStage === 'email_level') {
      const daysRemaining = 9 - Math.floor((Date.now() - new Date(claim.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      return {
        title: 'Email Verification in Progress',
        description: `Waiting for user response. ${Math.max(daysRemaining, 0)} days remaining in email verification period.`,
        action: null,
      };
    }

    if (claim.currentStage === 'phone_level') {
      return {
        title: 'Phone Verification in Progress',
        description: 'SMS notifications are being sent to the user. Waiting for confirmation.',
        action: null,
      };
    }

    if (claim.currentStage === 'key_retrieval') {
      return {
        title: 'Ready for Key Retrieval',
        description: 'All verifications complete. You can now retrieve the encryption keys.',
        action: 'retrieve_keys',
      };
    }

    return null;
  };

  const handleKeyRetrieval = () => {
    if (onKeyRetrievalComplete) {
      onKeyRetrievalComplete();
    }
    // In a real implementation, this would navigate to the recovery portal
    alert('Key retrieval flow will redirect to Recovery Portal');
  };

  if (loading) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Loading..." size="lg">
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-12 w-12 text-[#C0C8D4]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Error" size="md">
        <div className="p-6 text-center">
          <div className="inline-block p-4 rounded-full bg-[#ef4444]/20 mb-4">
            <svg className="w-12 h-12 text-[#ef4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-300">{error}</p>
          <button
            onClick={onClose}
            className="mt-6 px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  if (!claimDetails) return null;

  const timelineEvents = buildTimelineEvents();
  const progress = getStageProgress();
  const nextAction = getNextAction();

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Death Claim Verification"
      subtitle={`Claim for ${claimDetails.user.email}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Progress Overview */}
        <div className="p-6 rounded-lg bg-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Verification Progress</h3>
            <button
              onClick={fetchClaimDetails}
              disabled={isRefreshing}
              className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-sm text-white flex items-center gap-2"
            >
              <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">Overall Progress</span>
              <span className="text-[#C0C8D4] font-semibold">{progress}%</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#C0C8D4] to-[#10b981]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Current Status:</span>
            <span className={`
              px-3 py-1 rounded-full text-xs font-semibold
              ${claimDetails.claim.status === 'approved' ? 'bg-[#10b981]/20 text-[#10b981]' :
                claimDetails.claim.status === 'rejected' ? 'bg-[#ef4444]/20 text-[#ef4444]' :
                'bg-[#C0C8D4]/20 text-[#C0C8D4]'}
            `}>
              {claimDetails.claim.status.toUpperCase().replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Next Action Card */}
        {nextAction && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-lg ${
              nextAction.action === 'retrieve_keys'
                ? 'bg-[#10b981]/10 border border-[#10b981]/30'
                : claimDetails.claim.status === 'rejected'
                ? 'bg-[#ef4444]/10 border border-[#ef4444]/30'
                : 'bg-blue-500/10 border border-blue-500/30'
            }`}
          >
            <h3 className={`text-lg font-semibold mb-2 ${
              nextAction.action === 'retrieve_keys' ? 'text-[#10b981]' :
              claimDetails.claim.status === 'rejected' ? 'text-[#ef4444]' :
              'text-blue-400'
            }`}>
              {nextAction.title}
            </h3>
            <p className="text-gray-300 text-sm mb-4">{nextAction.description}</p>
            {nextAction.action === 'retrieve_keys' && (
              <button
                onClick={handleKeyRetrieval}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#10b981] to-[#059669] hover:opacity-90 transition-opacity text-white font-semibold flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Retrieve Encryption Keys
              </button>
            )}
          </motion.div>
        )}

        {/* Timeline */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Verification Timeline</h3>
          <Timeline events={timelineEvents} />
        </div>

        {/* Notifications History */}
        {claimDetails.notifications.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Notification History</h3>
            <div className="space-y-3">
              {claimDetails.notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {notification.notificationType.includes('email') ? '📧' :
                         notification.notificationType.includes('phone') ? '📱' : '🔔'}
                        <span className="text-white font-medium">
                          {notification.notificationType.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Sent: {new Date(notification.sentAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`
                      px-2 py-1 rounded text-xs font-semibold
                      ${notification.emailStatus === 'sent' ? 'bg-[#10b981]/20 text-[#10b981]' :
                        notification.emailStatus === 'failed' ? 'bg-[#ef4444]/20 text-[#ef4444]' :
                        'bg-gray-500/20 text-gray-400'}
                    `}>
                      {notification.emailStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
