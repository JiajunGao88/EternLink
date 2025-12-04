import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = 'http://localhost:3001/api';

interface UserData {
  id: string;
  email: string;
  phoneNumber: string | null;
  emailNotificationDays: number;
  phoneNotificationDays: number;
  freezeDays: number;
  referCode: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface LinkedBeneficiary {
  linkId: string;
  beneficiary: {
    id: string;
    email: string;
    emailVerified: boolean;
    createdAt: string;
  };
  linkedAt: string;
}

interface HeartbeatStatus {
  id: string;
  lastHeartbeat: string;
  nextHeartbeatDue: string;
  status: string;
  consecutiveMissed: number;
}

interface PendingDeathClaim {
  id: string;
  beneficiary: {
    id: string;
    email: string;
  };
  status: string;
  currentStage: string;
  emailVerificationCount: number;
  phoneVerificationCount: number;
  createdAt: string;
}

interface UserDashboardProps {
  onLogout: () => void;
  onTryDemo?: () => void;
}

export default function UserDashboard({ onLogout, onTryDemo }: UserDashboardProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [linkedBeneficiaries, setLinkedBeneficiaries] = useState<LinkedBeneficiary[]>([]);
  const [heartbeatStatus, setHeartbeatStatus] = useState<HeartbeatStatus | null>(null);
  const [pendingClaims, setPendingClaims] = useState<PendingDeathClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'beneficiaries' | 'heartbeat'>('overview');

  useEffect(() => {
    fetchUserData();
    fetchLinkedBeneficiaries();
    fetchHeartbeatStatus();
    fetchPendingClaims();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchUserData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user data');
      }

      setUserData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkedBeneficiaries = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/beneficiary-account/linked-beneficiaries`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch beneficiaries');
      }

      setLinkedBeneficiaries(data.beneficiaries || []);
    } catch (err: any) {
      console.error('Error fetching beneficiaries:', err);
    }
  };

  const fetchHeartbeatStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/heartbeat/status`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch heartbeat status');
      }

      setHeartbeatStatus(data);
    } catch (err: any) {
      console.error('Error fetching heartbeat:', err);
    }
  };

  const fetchPendingClaims = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/beneficiary/death-claim/pending-against-me`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pending claims');
      }

      setPendingClaims(data.claims || []);
    } catch (err: any) {
      console.error('Error fetching pending claims:', err);
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/beneficiary/death-claim/respond`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ claimId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject claim');
      }

      setSuccess('Death claim rejected successfully! You have confirmed you are alive.');
      fetchPendingClaims();
    } catch (err: any) {
      setError(err.message || 'Failed to reject claim');
    }
  };

  const handleSendHeartbeat = async () => {
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/heartbeat/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send heartbeat');
      }

      setSuccess('Heartbeat sent successfully!');
      fetchHeartbeatStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to send heartbeat');
    }
  };

  const handleGenerateReferCode = async () => {
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/beneficiary-account/generate-refer-code`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate refer code');
      }

      setSuccess('Refer code generated successfully!');
      fetchUserData();
    } catch (err: any) {
      setError(err.message || 'Failed to generate refer code');
    }
  };

  const copyReferCode = () => {
    if (userData?.referCode) {
      navigator.clipboard.writeText(userData.referCode);
      setSuccess('Refer code copied to clipboard!');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysSince = (dateString: string) => {
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.greeting}>Welcome Back</h1>
            <p style={styles.welcomeText}>
              EternLink have been helping you protect your family assets for {userData?.createdAt ? getDaysSince(userData.createdAt) : 0} days.
            </p>
          </div>
          <button onClick={onLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>

      {/* Status Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={styles.errorMessage}
          >
            ⚠️ {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={styles.successMessage}
          >
            ✓ {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            ...styles.tab,
            ...(activeTab === 'overview' ? styles.activeTab : {}),
          }}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('beneficiaries')}
          style={{
            ...styles.tab,
            ...(activeTab === 'beneficiaries' ? styles.activeTab : {}),
          }}
        >
          Beneficiaries ({linkedBeneficiaries.length})
        </button>
        <button
          onClick={() => setActiveTab('heartbeat')}
          style={{
            ...styles.tab,
            ...(activeTab === 'heartbeat' ? styles.activeTab : {}),
          }}
        >
          Heartbeat Status
        </button>
        <button
          onClick={onTryDemo}
          style={styles.tab}
        >
          Encryption
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Death Claim Warning Banner */}
            {pendingClaims.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(185, 28, 28, 0.1) 100%)',
                  border: '2px solid rgba(220, 38, 38, 0.5)',
                  borderRadius: '12px',
                  padding: '20px 24px',
                  marginBottom: '24px',
                  boxShadow: '0 4px 20px rgba(220, 38, 38, 0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
                  <div style={{ fontSize: '32px' }}>⚠️</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      color: '#fca5a5',
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      margin: '0 0 8px 0'
                    }}>
                      URGENT: Death Claim Submitted
                    </h3>
                    <p style={{
                      color: '#fecaca',
                      margin: '0 0 16px 0',
                      lineHeight: '1.6'
                    }}>
                      A beneficiary has submitted a death claim stating you have passed away.
                      If you are alive, please reject this claim immediately to prevent unauthorized access to your account.
                    </p>

                    {pendingClaims.map((claim) => (
                      <div
                        key={claim.id}
                        style={{
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: '8px',
                          padding: '16px',
                          marginBottom: '12px',
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '12px'
                        }}>
                          <div>
                            <p style={{
                              color: '#fecaca',
                              margin: '0 0 4px 0',
                              fontSize: '0.875rem',
                              fontWeight: '600'
                            }}>
                              Claim from: {claim.beneficiary.email}
                            </p>
                            <p style={{
                              color: '#fca5a5',
                              margin: 0,
                              fontSize: '0.75rem',
                              opacity: 0.8
                            }}>
                              Submitted: {new Date(claim.createdAt).toLocaleDateString()} •
                              Status: {claim.currentStage.replace('_', ' ')} •
                              Email attempts: {claim.emailVerificationCount}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRejectClaim(claim.id)}
                            style={{
                              padding: '10px 20px',
                              background: 'linear-gradient(to right, #dc2626, #b91c1c)',
                              border: 'none',
                              borderRadius: '8px',
                              color: 'white',
                              fontWeight: '700',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 2px 10px rgba(220, 38, 38, 0.4)',
                            }}
                          >
                            I'M ALIVE - REJECT CLAIM
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            <div style={styles.grid}>
              {/* Account Info Card */}
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Account Information</h3>
                <div style={styles.infoGrid}>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Email</span>
                    <span style={styles.infoValue}>{userData?.email}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Phone Number</span>
                    <span style={styles.infoValue}>{userData?.phoneNumber || 'Not set'}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Member Since</span>
                    <span style={styles.infoValue}>{userData?.createdAt ? formatDate(userData.createdAt) : 'N/A'}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Last Login</span>
                    <span style={styles.infoValue}>
                      {userData?.lastLoginAt ? formatDate(userData.lastLoginAt) : 'First time'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notification Settings Card */}
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Notification Settings</h3>
                <div style={styles.infoGrid}>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Email Notifications</span>
                    <span style={styles.infoValue}>{userData?.emailNotificationDays} days before</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Phone Notifications</span>
                    <span style={styles.infoValue}>{userData?.phoneNotificationDays} days before</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Freeze Period</span>
                    <span style={styles.infoValue}>{userData?.freezeDays} days</span>
                  </div>
                </div>
              </div>

              {/* Refer Code Card */}
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Beneficiary Invite Code</h3>
                {userData?.referCode ? (
                  <div>
                    <p style={styles.referCodeDescription}>
                      Share this code with your beneficiaries to link them to your account
                    </p>
                    <div style={styles.referCodeBox}>
                      <code style={styles.referCode}>{userData.referCode}</code>
                      <button onClick={copyReferCode} style={styles.copyButton}>
                        Copy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={styles.referCodeDescription}>
                      Generate a refer code to invite beneficiaries
                    </p>
                    <button onClick={handleGenerateReferCode} style={styles.generateButton}>
                      Generate Refer Code
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Stats Card */}
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Quick Stats</h3>
                <div style={styles.statsGrid}>
                  <div style={styles.statItem}>
                    <div style={styles.statNumber}>{linkedBeneficiaries.length}</div>
                    <div style={styles.statLabel}>Linked Beneficiaries</div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={styles.statNumber}>
                      {userData?.createdAt ? getDaysSince(userData.createdAt) : 0}
                    </div>
                    <div style={styles.statLabel}>Days Active</div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={styles.statNumber}>
                      {heartbeatStatus?.status === 'active' ? '✓' : '⚠'}
                    </div>
                    <div style={styles.statLabel}>System Status</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Beneficiaries Tab */}
        {activeTab === 'beneficiaries' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Linked Beneficiaries</h3>
              {linkedBeneficiaries.length === 0 ? (
                <div style={styles.emptyState}>
                  <p style={styles.emptyStateText}>No beneficiaries linked yet</p>
                  <p style={styles.emptyStateHint}>
                    Generate a refer code and share it with your beneficiaries
                  </p>
                </div>
              ) : (
                <div style={styles.beneficiariesList}>
                  {linkedBeneficiaries.map((link) => (
                    <div key={link.linkId} style={styles.beneficiaryCard}>
                      <div style={styles.beneficiaryInfo}>
                        <div style={styles.beneficiaryEmail}>{link.beneficiary.email}</div>
                        <div style={styles.beneficiaryMeta}>
                          Linked on {formatDate(link.linkedAt)} •
                          {link.beneficiary.emailVerified ? ' Email Verified' : ' Email Not Verified'} •
                          Member since {formatDate(link.beneficiary.createdAt)}
                        </div>
                      </div>
                      <div style={{
                        ...styles.statusBadge,
                        ...(link.beneficiary.emailVerified ? styles.activeBadge : styles.inactiveBadge),
                      }}>
                        {link.beneficiary.emailVerified ? 'Verified' : 'Pending'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Heartbeat Tab */}
        {activeTab === 'heartbeat' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Heartbeat Monitor</h3>
              {heartbeatStatus ? (
                <div>
                  <div style={styles.heartbeatGrid}>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Status</span>
                      <span style={{
                        ...styles.infoValue,
                        color: heartbeatStatus.status === 'active' ? '#10b981' : '#ef4444',
                      }}>
                        {heartbeatStatus.status}
                      </span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Last Heartbeat</span>
                      <span style={styles.infoValue}>{formatDate(heartbeatStatus.lastHeartbeat)}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Next Due</span>
                      <span style={styles.infoValue}>{formatDate(heartbeatStatus.nextHeartbeatDue)}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Consecutive Missed</span>
                      <span style={styles.infoValue}>{heartbeatStatus.consecutiveMissed}</span>
                    </div>
                  </div>
                  <button onClick={handleSendHeartbeat} style={styles.heartbeatButton}>
                    Send Heartbeat Now
                  </button>
                </div>
              ) : (
                <p style={styles.emptyStateText}>No heartbeat data available</p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom, #0a1628 0%, #1a2942 50%, #0a1628 100%)',
    padding: '20px',
    color: 'white',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(to bottom, #0a1628 0%, #1a2942 50%, #0a1628 100%)',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(192, 200, 212, 0.2)',
    borderTop: '4px solid #3DA288',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#C0C8D4',
    marginTop: '20px',
    fontSize: '16px',
  },
  header: {
    marginBottom: '40px',
    paddingTop: '20px',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  greeting: {
    color: 'white',
    fontSize: '2.5rem',
    fontWeight: '700',
    margin: 0,
    marginBottom: '12px',
    background: 'linear-gradient(to right, #C0C8D4, #3DA288)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  welcomeText: {
    color: '#C0C8D4',
    fontSize: '1.1rem',
    margin: 0,
    opacity: 0.9,
  },
  logoutButton: {
    padding: '12px 24px',
    background: 'rgba(192, 200, 212, 0.1)',
    border: '1px solid rgba(192, 200, 212, 0.3)',
    borderRadius: '8px',
    color: '#C0C8D4',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
  },
  errorMessage: {
    padding: '16px 20px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    color: '#ef4444',
    marginBottom: '20px',
    maxWidth: '1400px',
    margin: '0 auto 20px auto',
  },
  successMessage: {
    padding: '16px 20px',
    background: 'rgba(61, 162, 136, 0.1)',
    border: '1px solid rgba(61, 162, 136, 0.3)',
    borderRadius: '8px',
    color: '#3DA288',
    marginBottom: '20px',
    maxWidth: '1400px',
    margin: '0 auto 20px auto',
  },
  tabs: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    maxWidth: '1400px',
    margin: '0 auto 24px auto',
  },
  tab: {
    padding: '12px 24px',
    background: 'rgba(192, 200, 212, 0.05)',
    border: '1px solid rgba(192, 200, 212, 0.2)',
    borderRadius: '8px',
    color: '#C0C8D4',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
  },
  activeTab: {
    background: 'rgba(61, 162, 136, 0.2)',
    color: '#3DA288',
    borderColor: '#3DA288',
    boxShadow: '0 0 20px rgba(61, 162, 136, 0.3)',
  },
  content: {
    marginTop: '24px',
    maxWidth: '1400px',
    margin: '24px auto 0 auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  card: {
    background: 'rgba(192, 200, 212, 0.05)',
    backdropFilter: 'blur(20px)',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(192, 200, 212, 0.1)',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#C0C8D4',
    marginBottom: '16px',
    marginTop: 0,
  },
  infoGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '0.875rem',
    color: '#C0C8D4',
    fontWeight: '500',
    opacity: 0.7,
  },
  infoValue: {
    fontSize: '1rem',
    color: 'white',
    fontWeight: '600',
  },
  referCodeDescription: {
    color: '#C0C8D4',
    fontSize: '0.875rem',
    marginBottom: '12px',
    opacity: 0.8,
  },
  referCodeBox: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  referCode: {
    flex: 1,
    padding: '12px',
    background: 'rgba(61, 162, 136, 0.1)',
    borderRadius: '8px',
    fontSize: '1.25rem',
    fontWeight: '700',
    letterSpacing: '2px',
    color: '#3DA288',
    border: '1px solid rgba(61, 162, 136, 0.3)',
  },
  copyButton: {
    padding: '12px 20px',
    background: 'linear-gradient(to right, #3DA288, #2d8a6f)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(61, 162, 136, 0.3)',
  },
  generateButton: {
    padding: '12px 24px',
    background: 'linear-gradient(to right, #3DA288, #2d8a6f)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(61, 162, 136, 0.3)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  statItem: {
    textAlign: 'center',
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#3DA288',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#C0C8D4',
    opacity: 0.8,
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyStateText: {
    fontSize: '1.125rem',
    color: '#C0C8D4',
    marginBottom: '8px',
  },
  emptyStateHint: {
    fontSize: '0.875rem',
    color: '#C0C8D4',
    opacity: 0.6,
  },
  beneficiariesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  beneficiaryCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: 'rgba(192, 200, 212, 0.05)',
    borderRadius: '8px',
    border: '1px solid rgba(192, 200, 212, 0.2)',
    backdropFilter: 'blur(10px)',
  },
  beneficiaryInfo: {
    flex: 1,
  },
  beneficiaryEmail: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'white',
    marginBottom: '4px',
  },
  beneficiaryMeta: {
    fontSize: '0.875rem',
    color: '#C0C8D4',
    opacity: 0.8,
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  activeBadge: {
    background: 'rgba(61, 162, 136, 0.2)',
    color: '#3DA288',
    border: '1px solid rgba(61, 162, 136, 0.3)',
  },
  inactiveBadge: {
    background: 'rgba(192, 200, 212, 0.1)',
    color: '#C0C8D4',
    border: '1px solid rgba(192, 200, 212, 0.2)',
  },
  heartbeatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '20px',
  },
  heartbeatButton: {
    padding: '14px 24px',
    background: 'linear-gradient(to right, #3DA288, #2d8a6f)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    fontSize: '1rem',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(61, 162, 136, 0.3)',
  },
};
