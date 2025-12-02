import React, { useState } from 'react';
import { motion } from 'framer-motion';

const API_BASE_URL = 'http://localhost:3001/api';

interface RegistrationPageProps {
  onRegistrationComplete: (token: string) => void;
  onBackToHome: () => void;
}

export default function RegistrationPage({ onRegistrationComplete, onBackToHome }: RegistrationPageProps) {
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/registration/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess('Registration successful! Please check your email for verification code.');
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
      const response = await fetch(`${API_BASE_URL}/registration/verify-email`, {
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

      setSuccess('Email verified successfully!');
      onRegistrationComplete(data.token);
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
      const response = await fetch(`${API_BASE_URL}/registration/resend-code`, {
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

      setSuccess('Verification code sent! Please check your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBackToHome} style={styles.backButton}>
          ← Back to Home
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={styles.card}
        >
          {/* Logo */}
          <div style={styles.logoContainer}>
            <svg width="60" height="60" viewBox="0 0 48 48" fill="none">
              <path
                d="M24 4L8 12V22C8 31 14 39 24 44C34 39 40 31 40 22V12L24 4Z"
                stroke="var(--accent-primary)"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 24H18L21 18L24 30L27 20L30 24H36"
                stroke="var(--accent-primary)"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1 style={styles.title}>
              {step === 'register' ? 'Create Account' : 'Verify Email'}
            </h1>
            <p style={styles.subtitle}>
              {step === 'register'
                ? 'Register for EternLink to secure your digital assets'
                : 'Enter the verification code sent to your email'}
            </p>
          </div>

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

          {/* Registration Form */}
          {step === 'register' && (
            <form onSubmit={handleRegister} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={styles.input}
                  placeholder="you@example.com"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  style={styles.input}
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={styles.input}
                  placeholder="Re-enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.submitButton,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          )}

          {/* Verification Form */}
          {step === 'verify' && (
            <form onSubmit={handleVerifyEmail} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Verification Code</label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                  maxLength={6}
                  style={{
                    ...styles.input,
                    fontSize: '24px',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                  }}
                  placeholder="000000"
                />
                <p style={styles.hint}>
                  Check your email ({email}) for the 6-digit code
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.submitButton,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                style={styles.secondaryButton}
              >
                Resend Code
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a1628 0%, #0f1e2e 50%, #1a2942 100%)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },

  header: {
    padding: '20px 40px',
  },

  backButton: {
    padding: '12px 24px',
    fontSize: '16px',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--card-border)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.3s ease',
  },

  content: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },

  card: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: 'rgba(26, 41, 66, 0.6)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(192, 200, 212, 0.3)',
    borderRadius: '16px',
    padding: '40px',
  },

  logoContainer: {
    textAlign: 'center',
    marginBottom: '32px',
  },

  title: {
    fontSize: '32px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '16px 0 8px 0',
  },

  subtitle: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    margin: 0,
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

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
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
  },

  input: {
    padding: '12px 16px',
    fontSize: '16px',
    backgroundColor: 'rgba(139, 157, 195, 0.1)',
    border: '1px solid rgba(192, 200, 212, 0.3)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    transition: 'all 0.3s ease',
    outline: 'none',
  },

  hint: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    margin: '4px 0 0 0',
  },

  submitButton: {
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '8px',
  },

  secondaryButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
    backgroundColor: 'transparent',
    color: 'var(--accent-primary)',
    border: '1px solid rgba(192, 200, 212, 0.3)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
};
