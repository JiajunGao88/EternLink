/**
 * FrozenOverview Component
 *
 * Displays a locked/frozen state for users who haven't purchased a plan yet.
 * Prompts users to buy a plan to unlock full dashboard functionality.
 */

import React from 'react';
import { motion } from 'framer-motion';

interface FrozenOverviewProps {
  onBuyPlan: () => void;
  onLogout: () => void;
  userEmail?: string;
  daysSinceCreation?: number;
}

export const FrozenOverview: React.FC<FrozenOverviewProps> = ({
  onBuyPlan,
  onLogout,
  userEmail,
  daysSinceCreation = 0
}) => {
  return (
    <div style={styles.container}>
      {/* Header matching regular dashboard */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.greeting}>Welcome to EternLink!</h1>
            <p style={styles.welcomeText}>
              Helping protect your family assets for {daysSinceCreation} days.
            </p>
          </div>
          <button onClick={onLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>

      {/* Dimmed Preview of Dashboard Features - Above lock message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 0.4, y: 0 }}
        transition={{ delay: 0.2 }}
        style={styles.previewSection}
      >
        <div style={styles.previewOverlay}>
          <div style={styles.grid}>
            {/* Account Info Card - Dimmed */}
            <div style={styles.dimmedCard}>
              <h3 style={styles.cardTitle}>Account Information</h3>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Email</span>
                  <span style={styles.infoValue}>{userEmail || 'your-email@example.com'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Phone Number</span>
                  <span style={styles.infoValue}>Not set</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Member Since</span>
                  <span style={styles.infoValue}>Just now</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Last Login</span>
                  <span style={styles.infoValue}>First time</span>
                </div>
              </div>
            </div>

            {/* Notification Settings Card - Dimmed */}
            <div style={styles.dimmedCard}>
              <h3 style={styles.cardTitle}>Notification Settings</h3>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Email Notifications</span>
                  <span style={styles.infoValue}>-- days before</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Phone Notifications</span>
                  <span style={styles.infoValue}>-- days before</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Freeze Period</span>
                  <span style={styles.infoValue}>-- days</span>
                </div>
              </div>
            </div>

            {/* Beneficiary Invite Code Card - Dimmed */}
            <div style={styles.dimmedCard}>
              <h3 style={styles.cardTitle}>Beneficiary Invite Code</h3>
              <p style={styles.referCodeDescription}>
                Share this code with your beneficiaries to link them to your account
              </p>
              <div style={styles.referCodeBox}>
                <code style={styles.referCode}>XXXX-XXXX-XXXX</code>
                <button disabled style={styles.copyButton}>
                  Copy
                </button>
              </div>
            </div>

            {/* Quick Stats Card - Dimmed */}
            <div style={styles.dimmedCard}>
              <h3 style={styles.cardTitle}>Quick Stats</h3>
              <div style={styles.statsGrid}>
                <div style={styles.statItem}>
                  <div style={styles.statNumber}>0</div>
                  <div style={styles.statLabel}>Linked Beneficiaries</div>
                </div>
                <div style={styles.statItem}>
                  <div style={styles.statNumber}>{daysSinceCreation}</div>
                  <div style={styles.statLabel}>Days Active</div>
                </div>
                <div style={styles.statItem}>
                  <div style={styles.statNumber}>🔒</div>
                  <div style={styles.statLabel}>System Status</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Lock Status Card - Below dashboard preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={styles.lockCard}
      >
        {/* Lock Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.5, type: 'spring', delay: 0.5 }}
          style={styles.iconContainer}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={styles.lockIcon}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </motion.div>

        <div style={styles.statusIcon}>🔒</div>
        <h2 style={styles.statusTitle}>Dashboard Locked</h2>
        <p style={styles.statusMessage}>
          To unlock full access to your dashboard and start protecting your family's digital assets,
          you need to activate your account by purchasing a subscription plan.
        </p>

        {/* CTA Button */}
        <motion.button
          onClick={onBuyPlan}
          style={styles.buyButton}
          whileHover={{ scale: 1.05, boxShadow: '0 10px 40px rgba(61, 162, 136, 0.4)' }}
          whileTap={{ scale: 0.95 }}
        >
          🚀 Buy a Plan & Unlock Dashboard
        </motion.button>
      </motion.div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    padding: '20px',
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

  lockCard: {
    maxWidth: '700px',
    margin: '0 auto 60px auto',
    background: 'rgba(192, 200, 212, 0.05)',
    backdropFilter: 'blur(20px)',
    borderRadius: '16px',
    padding: '40px',
    border: '1px solid rgba(192, 200, 212, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    textAlign: 'center',
  },

  iconContainer: {
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'center',
  },

  lockIcon: {
    color: '#C0C8D4',
    filter: 'drop-shadow(0 4px 20px rgba(192, 200, 212, 0.3))',
  },

  statusIcon: {
    fontSize: '2.5rem',
    marginBottom: '16px',
  },

  statusTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'white',
    marginBottom: '16px',
  },

  statusMessage: {
    fontSize: '1rem',
    color: '#C0C8D4',
    lineHeight: '1.6',
    marginBottom: '32px',
    opacity: 0.9,
  },

  buyButton: {
    width: '100%',
    padding: '18px 36px',
    fontSize: '1.1rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #3DA288 0%, #2d8a6f 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 20px rgba(61, 162, 136, 0.3)',
  },

  previewSection: {
    maxWidth: '1400px',
    margin: '0 auto',
    position: 'relative',
  },

  previewOverlay: {
    pointerEvents: 'none',
    userSelect: 'none',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },

  dimmedCard: {
    background: 'rgba(192, 200, 212, 0.03)',
    backdropFilter: 'blur(20px)',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(192, 200, 212, 0.08)',
    opacity: 0.5,
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
    cursor: 'not-allowed',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(61, 162, 136, 0.3)',
    opacity: 0.5,
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
};
