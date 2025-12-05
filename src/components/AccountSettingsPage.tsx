import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api`;

interface AccountSettingsPageProps {
  token: string;
  onLogout: () => void;
}

interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  phoneNumber?: string;
  phoneVerified: boolean;
  hasVoiceSignature: boolean;
  emailNotificationDays?: number;
  phoneNotificationDays?: number;
  freezeDays?: number;
  accountFrozen: boolean;
  daysSinceLogin?: number;
}

export default function AccountSettingsPage({ token, onLogout }: AccountSettingsPageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailNotificationDays, setEmailNotificationDays] = useState('');
  const [phoneNotificationDays, setPhoneNotificationDays] = useState('');
  const [freezeDays, setFreezeDays] = useState('');
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('');

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [voiceData, setVoiceData] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetchUserAccount();
  }, []);

  const fetchUserAccount = async () => {
    try {
      const response = await fetch(`${API_URL}/user/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch account');
      }

      setUser(data.user);
      setPhoneNumber(data.user.phoneNumber || '');
      setEmailNotificationDays(data.user.emailNotificationDays?.toString() || '');
      setPhoneNotificationDays(data.user.phoneNotificationDays?.toString() || '');
      setFreezeDays(data.user.freezeDays?.toString() || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const settings: any = {};

    if (phoneNumber) settings.phoneNumber = phoneNumber;
    if (emailNotificationDays) settings.emailNotificationDays = parseInt(emailNotificationDays);
    if (phoneNotificationDays) settings.phoneNotificationDays = parseInt(phoneNotificationDays);
    if (freezeDays) settings.freezeDays = parseInt(freezeDays);

    // Validation
    if (settings.emailNotificationDays && settings.phoneNotificationDays) {
      if (settings.emailNotificationDays >= settings.phoneNotificationDays) {
        setError('Email notification days must be less than phone notification days');
        return;
      }
    }

    if (settings.phoneNotificationDays && settings.freezeDays) {
      if (settings.phoneNotificationDays >= settings.freezeDays) {
        setError('Phone notification days must be less than freeze days');
        return;
      }
    }

    try {
      const response = await fetch(`${API_URL}/user/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      setSuccess('Settings updated successfully!');
      await fetchUserAccount();
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    }
  };

  const handleSendPhoneCode = async () => {
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/user/phone/send-code`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send code');
      }

      setSuccess('Verification code sent to your phone!');
    } catch (err: any) {
      setError(err.message || 'Failed to send code');
    }
  };

  const handleVerifyPhone = async () => {
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/user/phone/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: phoneVerificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify phone');
      }

      setSuccess('Phone number verified successfully!');
      await fetchUserAccount();
    } catch (err: any) {
      setError(err.message || 'Failed to verify phone');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setVoiceData(base64data);
        };

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      setError('Failed to access microphone: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadVoice = async () => {
    if (!voiceData) {
      setError('Please record your voice first');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/user/voice/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voiceData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload voice');
      }

      setSuccess('Voice signature uploaded successfully!');
      await fetchUserAccount();
      setVoiceData(null);
    } catch (err: any) {
      setError(err.message || 'Failed to upload voice');
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>Loading account settings...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.errorText}>Failed to load account</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Account Settings</h1>
        <button onClick={onLogout} style={styles.logoutButton}>
          Logout
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Error/Success Messages */}
        {error && (
          <div style={styles.errorMessage}>
            <span>⚠️</span> {error}
          </div>
        )}
        {success && (
          <div style={styles.successMessage}>
            <span>✓</span> {success}
          </div>
        )}

        {/* Account Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.section}
        >
          <h2 style={styles.sectionTitle}>Account Status</h2>
          <div style={styles.statusGrid}>
            <div style={styles.statusItem}>
              <span style={styles.statusLabel}>Email:</span>
              <span style={styles.statusValue}>
                {user.email} {user.emailVerified && <span style={styles.verified}>✓ Verified</span>}
              </span>
            </div>
            <div style={styles.statusItem}>
              <span style={styles.statusLabel}>Phone:</span>
              <span style={styles.statusValue}>
                {user.phoneNumber || 'Not set'}{' '}
                {user.phoneVerified && <span style={styles.verified}>✓ Verified</span>}
              </span>
            </div>
            <div style={styles.statusItem}>
              <span style={styles.statusLabel}>Voice Signature:</span>
              <span style={styles.statusValue}>
                {user.hasVoiceSignature ? (
                  <span style={styles.verified}>✓ Registered</span>
                ) : (
                  <span style={styles.notSet}>Not registered</span>
                )}
              </span>
            </div>
            {user.daysSinceLogin !== null && (
              <div style={styles.statusItem}>
                <span style={styles.statusLabel}>Days Since Last Login:</span>
                <span style={styles.statusValue}>{user.daysSinceLogin} days</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Notification Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={styles.section}
        >
          <h2 style={styles.sectionTitle}>Multi-Level Notification Settings</h2>
          <p style={styles.sectionDescription}>
            Configure how many days of inactivity trigger different notification levels and account freeze.
          </p>

          <form onSubmit={handleUpdateSettings} style={styles.form}>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  📧 Email Notification (days)
                  <span style={styles.hint}>Email alert after X days of inactivity</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={emailNotificationDays}
                  onChange={(e) => setEmailNotificationDays(e.target.value)}
                  style={styles.input}
                  placeholder="e.g., 7"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  📱 Phone Notification (days)
                  <span style={styles.hint}>SMS alert after X days (must be &gt; email days)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={phoneNotificationDays}
                  onChange={(e) => setPhoneNotificationDays(e.target.value)}
                  style={styles.input}
                  placeholder="e.g., 14"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  🔒 Account Freeze (days)
                  <span style={styles.hint}>Freeze account after X days (must be &gt; phone days)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={freezeDays}
                  onChange={(e) => setFreezeDays(e.target.value)}
                  style={styles.input}
                  placeholder="e.g., 30"
                />
              </div>
            </div>

            <div style={styles.infoBox}>
              <p style={styles.infoText}>
                <strong>⚠️ Important:</strong> After {freezeDays || '?'} days of inactivity, your account will be
                frozen. You will need <strong>voice verification</strong> to unlock it.
              </p>
              <p style={styles.infoText}>
                Example: Email at {emailNotificationDays || '?'} days → Phone at{' '}
                {phoneNotificationDays || '?'} days → Freeze at {freezeDays || '?'} days
              </p>
            </div>

            <button type="submit" style={styles.submitButton}>
              Save Notification Settings
            </button>
          </form>
        </motion.div>

        {/* Phone Verification */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={styles.section}
        >
          <h2 style={styles.sectionTitle}>Phone Number</h2>
          <div style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                style={styles.input}
                placeholder="+1234567890"
              />
            </div>

            {!user.phoneVerified && phoneNumber && (
              <>
                <button
                  type="button"
                  onClick={handleSendPhoneCode}
                  style={styles.secondaryButton}
                >
                  Send Verification Code
                </button>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Verification Code</label>
                  <input
                    type="text"
                    value={phoneVerificationCode}
                    onChange={(e) => setPhoneVerificationCode(e.target.value)}
                    maxLength={6}
                    style={styles.input}
                    placeholder="000000"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleVerifyPhone}
                  style={styles.submitButton}
                >
                  Verify Phone Number
                </button>
              </>
            )}
          </div>
        </motion.div>

        {/* Voice Signature */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={styles.section}
        >
          <h2 style={styles.sectionTitle}>🎤 Voice Signature</h2>
          <p style={styles.sectionDescription}>
            Record a voice sample to enable voice verification for account unlock after freeze.
          </p>

          <div style={styles.voiceContainer}>
            {!user.hasVoiceSignature && (
              <>
                <div style={styles.voiceControls}>
                  {!isRecording && !voiceData && (
                    <button
                      type="button"
                      onClick={startRecording}
                      style={styles.recordButton}
                    >
                      🎤 Start Recording
                    </button>
                  )}

                  {isRecording && (
                    <button
                      type="button"
                      onClick={stopRecording}
                      style={styles.stopButton}
                    >
                      ⏹️ Stop Recording
                    </button>
                  )}

                  {voiceData && (
                    <>
                      <div style={styles.recordedIndicator}>
                        ✓ Voice recorded
                      </div>
                      <button
                        type="button"
                        onClick={uploadVoice}
                        style={styles.submitButton}
                      >
                        Upload Voice Signature
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoiceData(null)}
                        style={styles.secondaryButton}
                      >
                        Re-record
                      </button>
                    </>
                  )}
                </div>

                <div style={styles.infoBox}>
                  <p style={styles.infoText}>
                    <strong>💡 Tip:</strong> Say a phrase that's easy for you to remember and repeat. Example: "My
                    name is [Your Name] and this is my voice signature for EternLink."
                  </p>
                </div>
              </>
            )}

            {user.hasVoiceSignature && (
              <div style={styles.successBox}>
                <p style={styles.successText}>
                  ✓ Voice signature is registered. Your account can be unlocked with voice verification if
                  frozen.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a1628 0%, #0f1e2e 50%, #1a2942 100%)',
  },

  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a1628 0%, #0f1e2e 50%, #1a2942 100%)',
  },

  loadingText: {
    fontSize: '18px',
    color: 'var(--text-secondary)',
  },

  errorText: {
    fontSize: '18px',
    color: '#ff6b6b',
  },

  header: {
    padding: '20px 40px',
    borderBottom: '1px solid rgba(192, 200, 212, 0.2)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0,
  },

  logoutButton: {
    padding: '10px 20px',
    fontSize: '14px',
    backgroundColor: 'rgba(220, 53, 69, 0.2)',
    color: '#ff6b6b',
    border: '1px solid rgba(220, 53, 69, 0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
  },

  content: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '40px 20px',
  },

  errorMessage: {
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    border: '1px solid rgba(220, 53, 69, 0.3)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#ff6b6b',
    fontSize: '14px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  successMessage: {
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    border: '1px solid rgba(40, 167, 69, 0.3)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#51cf66',
    fontSize: '14px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  section: {
    backgroundColor: 'rgba(26, 41, 66, 0.6)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(192, 200, 212, 0.3)',
    borderRadius: '12px',
    padding: '32px',
    marginBottom: '24px',
  },

  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginTop: 0,
    marginBottom: '12px',
  },

  sectionDescription: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '24px',
  },

  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },

  statusItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  statusLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },

  statusValue: {
    fontSize: '14px',
    color: 'var(--text-primary)',
  },

  verified: {
    color: '#51cf66',
    fontSize: '12px',
    fontWeight: '600',
  },

  notSet: {
    color: 'var(--text-muted)',
    fontSize: '12px',
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },

  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  hint: {
    fontSize: '12px',
    fontWeight: '400',
    color: 'var(--text-muted)',
  },

  input: {
    padding: '10px 14px',
    fontSize: '14px',
    backgroundColor: 'rgba(139, 157, 195, 0.1)',
    border: '1px solid rgba(192, 200, 212, 0.3)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    outline: 'none',
  },

  infoBox: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    border: '1px solid rgba(33, 150, 243, 0.3)',
    borderRadius: '8px',
    padding: '16px',
  },

  infoText: {
    fontSize: '13px',
    color: '#64b5f6',
    margin: '4px 0',
  },

  submitButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },

  secondaryButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500',
    backgroundColor: 'transparent',
    color: 'var(--accent-primary)',
    border: '1px solid rgba(192, 200, 212, 0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
  },

  voiceContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  voiceControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  recordButton: {
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },

  stopButton: {
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    background: 'linear-gradient(135deg, #ffc107 0%, #ffb300 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },

  recordedIndicator: {
    padding: '12px 16px',
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    border: '1px solid rgba(40, 167, 69, 0.3)',
    borderRadius: '6px',
    color: '#51cf66',
    fontSize: '14px',
    textAlign: 'center',
  },

  successBox: {
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    border: '1px solid rgba(40, 167, 69, 0.3)',
    borderRadius: '8px',
    padding: '16px',
  },

  successText: {
    fontSize: '14px',
    color: '#51cf66',
    margin: 0,
  },
};
