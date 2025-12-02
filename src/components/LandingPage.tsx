import React from "react";
import { motion } from "framer-motion";

interface LandingPageProps {
  onTryDemo: () => void;
}

export default function LandingPage({ onTryDemo }: LandingPageProps) {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div style={styles.container}>
      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={styles.nav}
      >
        <div style={styles.navContent}>
          <div style={styles.logoContainer}>
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
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
            <span style={styles.logoText}>EternLink</span>
          </div>
          <div style={styles.navLinks}>
            <button onClick={() => scrollToSection("features")} style={styles.navLink}>
              Features
            </button>
            <button onClick={() => scrollToSection("how-it-works")} style={styles.navLink}>
              How It Works
            </button>
            <button onClick={() => scrollToSection("security")} style={styles.navLink}>
              Security
            </button>
            <button onClick={onTryDemo} style={styles.navCtaButton}>
              Try Demo
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroWrapper}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={styles.heroContent}
          >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={styles.heroIcon}
          >
            <svg width="120" height="120" viewBox="0 0 48 48" fill="none">
              <path
                d="M24 4L8 12V22C8 31 14 39 24 44C34 39 40 31 40 22V12L24 4Z"
                stroke="var(--accent-primary)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 24H18L21 18L24 30L27 20L30 24H36"
                stroke="var(--accent-primary)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
          <h1 style={styles.heroTitle}>
            Secure your digital files.
            <br />
            Forever.
          </h1>
          <p style={styles.heroSubtitle}>
            EternLink helps you encrypt your files and create immutable proof of existence
            on the blockchain. Take control of your digital assets with client-side encryption
            and on-chain verification.
          </p>
          <div style={styles.heroButtons}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onTryDemo}
              style={styles.primaryButton}
            >
              Try Demo
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => scrollToSection("how-it-works")}
              style={styles.secondaryButton}
            >
              Learn More
            </motion.button>
          </div>
        </motion.div>
        </div>
      </section>

      {/* Trust Section */}
      <section style={styles.trustSection}>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={styles.trustContent}
        >
          <h2 style={styles.trustTitle}>Blockchain-Powered Security</h2>
          <p style={styles.trustText}>
            Your file hashes are stored immutably on Base Sepolia, providing
            tamper-proof proof of existence. Combined with local AES-256-GCM encryption,
            your files are protected both in transit and at rest.
          </p>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" style={styles.featuresSection}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={styles.sectionContent}
        >
          <h2 style={styles.sectionTitle}>Better protection than traditional storage</h2>
          <p style={styles.sectionSubtitle}>
            Our system uses blockchain immutability and military-grade encryption
            for greater security than cloud storage, local drives, or single-device solutions.
            Be free from hacks, data loss, and unauthorized access.
          </p>
          <div style={styles.featuresGrid}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={styles.featureCard}
            >
              <div style={styles.featureIcon}>
                <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
                  <rect x="5" y="9" width="10" height="8" rx="1" stroke="var(--accent-primary)" strokeWidth="1.5" fill="none"/>
                  <path d="M7 9V6C7 4.34315 8.34315 3 10 3C11.6569 3 13 4.34315 13 6V9" stroke="var(--accent-primary)" strokeWidth="1.5"/>
                </svg>
              </div>
              <h3 style={styles.featureTitle}>Client-Side Encryption</h3>
              <p style={styles.featureText}>
                All encryption happens locally in your browser. Your files never leave
                your device unencrypted. AES-256-GCM with PBKDF2 key derivation ensures
                maximum security.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={styles.featureCard}
            >
              <div style={styles.featureIcon}>
                <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L3 6V10C3 14 6 17.5 10 19C14 17.5 17 14 17 10V6L10 2Z" stroke="var(--accent-primary)" strokeWidth="1.5" fill="none"/>
                </svg>
              </div>
              <h3 style={styles.featureTitle}>Immutable Proof</h3>
              <p style={styles.featureText}>
                File hashes are stored on the blockchain, creating an unchangeable
                record of existence. Verify file integrity anytime, anywhere,
                with cryptographic certainty.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={styles.featureCard}
            >
              <div style={styles.featureIcon}>
                <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
                  <circle cx="9" cy="9" r="6" stroke="var(--accent-primary)" strokeWidth="1.5" fill="none"/>
                  <path d="M14 14L18 18" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M7 9L8.5 10.5L12 7" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 style={styles.featureTitle}>Self-Custody</h3>
              <p style={styles.featureText}>
                You own your encryption keys. No third-party custody, no middlemen.
                Your files, your keys, your control. True digital sovereignty.
              </p>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={styles.featuresCTA}
          >
            <button onClick={onTryDemo} style={styles.featuresButton}>
              Try Demo Now
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" style={styles.howItWorksSection}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={styles.sectionContent}
        >
          <h2 style={styles.sectionTitle}>How It Works</h2>
          <p style={styles.sectionSubtitle}>
            Simple, secure, and transparent. Here's how EternLink protects your files.
          </p>
          <div style={styles.stepsContainer}>
            {[
              {
                step: "1",
                title: "Select Your File",
                description: "Choose a .txt file you want to secure. The file stays on your device.",
              },
              {
                step: "2",
                title: "Encrypt Locally",
                description: "Your file is encrypted using AES-256-GCM with a password you choose. All encryption happens in your browser.",
              },
              {
                step: "3",
                title: "Calculate Hash",
                description: "A SHA-256 hash of your file is computed. This hash uniquely identifies your file.",
              },
              {
                step: "4",
                title: "Store on Blockchain",
                description: "The file hash is registered on Base Sepolia blockchain, creating an immutable proof of existence.",
              },
              {
                step: "5",
                title: "Verify Anytime",
                description: "Verify your file's existence and integrity by checking the blockchain record.",
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                style={styles.stepCard}
              >
                <div style={styles.stepNumber}>{item.step}</div>
                <h3 style={styles.stepTitle}>{item.title}</h3>
                <p style={styles.stepText}>{item.description}</p>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            style={styles.stepsCTA}
          >
            <button onClick={onTryDemo} style={styles.primaryButton}>
              Try It Now
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Security Section */}
      <section id="security" style={styles.securitySection}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={styles.sectionContent}
        >
          <h2 style={styles.sectionTitle}>Enterprise-Grade Security</h2>
          <div style={styles.securityGrid}>
            <div style={styles.securityItem}>
              <h3 style={styles.securityTitle}>AES-256-GCM Encryption</h3>
              <p style={styles.securityText}>
                Military-grade encryption algorithm used by banks and governments worldwide.
              </p>
            </div>
            <div style={styles.securityItem}>
              <h3 style={styles.securityTitle}>PBKDF2 Key Derivation</h3>
              <p style={styles.securityText}>
                250,000 iterations ensure your password is securely transformed into an encryption key.
              </p>
            </div>
            <div style={styles.securityItem}>
              <h3 style={styles.securityTitle}>Blockchain Immutability</h3>
              <p style={styles.securityText}>
                Once recorded, your file hash cannot be altered or deleted from the blockchain.
              </p>
            </div>
            <div style={styles.securityItem}>
              <h3 style={styles.securityTitle}>Zero-Knowledge Architecture</h3>
              <p style={styles.securityText}>
                Only file hashes are stored on-chain. File content never leaves your device unencrypted.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section style={styles.ctaSection}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={styles.ctaContent}
        >
          <h2 style={styles.ctaTitle}>Ready to secure your files?</h2>
          <p style={styles.ctaText}>
            Join EternLink and take control of your digital future today.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onTryDemo}
            style={styles.ctaButton}
          >
            Get Started
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerLogo}>
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
              <path
                d="M24 4L8 12V22C8 31 14 39 24 44C34 39 40 31 40 22V12L24 4Z"
                stroke="var(--accent-primary)"
                strokeWidth="2.5"
                fill="none"
              />
              <path
                d="M12 24H18L21 18L24 30L27 20L30 24H36"
                stroke="var(--accent-primary)"
                strokeWidth="2.5"
                fill="none"
              />
            </svg>
            <span style={styles.footerLogoText}>EternLink</span>
          </div>
          <p style={styles.footerText}>
            Secured with AES-256-GCM Encryption · Base Sepolia L2 Network
          </p>
          <p style={styles.footerCopy}>
            © 2024 EternLink. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ===== Styles =====
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    width: "100%",
    background: "linear-gradient(135deg, #0a1628 0%, #0f1e2e 50%, #1a2942 100%)",
    position: "relative",
  },

  nav: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    background: "rgba(139, 157, 195, 0.1)",
    backdropFilter: "blur(20px)",
    padding: "20px 0",
  },

  navContent: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 40px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  logoText: {
    fontSize: "1.5rem",
    fontWeight: "700",
    background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
  },

  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "32px",
  },

  navLink: {
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    fontSize: "0.95rem",
    fontWeight: "500",
    cursor: "pointer",
    transition: "color 0.3s ease",
    padding: "8px 0",
  },

  navCtaButton: {
    padding: "12px 24px",
    background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)",
    color: "white",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "0.95rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "var(--shadow-sm)",
  },

  hero: {
    paddingTop: "140px",
    paddingBottom: "100px",
    textAlign: "center" as const,
    width: "100%",
  },

  heroWrapper: {
    maxWidth: "900px",
    margin: "0 auto",
    paddingLeft: "40px",
    paddingRight: "40px",
  },

  heroContent: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "32px",
  },

  heroIcon: {
    marginBottom: "20px",
  },

  heroTitle: {
    fontSize: "clamp(2.5rem, 5vw, 4rem)",
    fontWeight: "700",
    background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
    lineHeight: "1.2",
    margin: 0,
  },

  heroSubtitle: {
    fontSize: "1.25rem",
    color: "var(--text-secondary)",
    lineHeight: "1.6",
    maxWidth: "700px",
    margin: 0,
  },

  heroButtons: {
    display: "flex",
    gap: "20px",
    marginTop: "20px",
    flexWrap: "wrap" as const,
    justifyContent: "center",
  },

  primaryButton: {
    padding: "16px 32px",
    background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)",
    color: "white",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "var(--shadow-md)",
  },

  secondaryButton: {
    padding: "16px 32px",
    background: "rgba(139, 157, 195, 0.1)",
    color: "var(--accent-primary)",
    border: "1px solid rgba(139, 157, 195, 0.3)",
    borderRadius: "var(--radius-md)",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },

  trustSection: {
    paddingTop: "80px",
    paddingBottom: "80px",
    paddingLeft: "0",
    paddingRight: "0",
    textAlign: "center" as const,
    background: "rgba(139, 157, 195, 0.05)",
    width: "100%",
  },

  trustContent: {
    maxWidth: "800px",
    margin: "0 auto",
    paddingLeft: "40px",
    paddingRight: "40px",
  },

  trustTitle: {
    fontSize: "2rem",
    fontWeight: "600",
    color: "var(--text-primary)",
    marginBottom: "20px",
  },

  trustText: {
    fontSize: "1.1rem",
    color: "var(--text-secondary)",
    lineHeight: "1.6",
  },

  featuresSection: {
    paddingTop: "100px",
    paddingBottom: "100px",
    paddingLeft: "0",
    paddingRight: "0",
    width: "100%",
  },

  sectionContent: {
    maxWidth: "1200px",
    margin: "0 auto",
    paddingLeft: "40px",
    paddingRight: "40px",
  },

  sectionTitle: {
    fontSize: "clamp(2rem, 4vw, 3rem)",
    fontWeight: "700",
    color: "var(--text-primary)",
    textAlign: "center" as const,
    marginBottom: "20px",
  },

  sectionSubtitle: {
    fontSize: "1.2rem",
    color: "var(--text-secondary)",
    textAlign: "center" as const,
    maxWidth: "700px",
    margin: "0 auto 60px",
    lineHeight: "1.6",
  },

  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "32px",
    marginBottom: "60px",
  },

  featureCard: {
    background: "var(--card-bg)",
    backdropFilter: "blur(20px)",
    border: "1px solid var(--card-border)",
    borderRadius: "var(--radius-lg)",
    padding: "40px",
    transition: "all 0.3s ease",
  },

  featureIcon: {
    marginBottom: "24px",
    color: "var(--accent-primary)",
  },

  featureTitle: {
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "var(--text-primary)",
    marginBottom: "16px",
  },

  featureText: {
    fontSize: "1rem",
    color: "var(--text-secondary)",
    lineHeight: "1.6",
  },

  featuresCTA: {
    textAlign: "center" as const,
  },

  featuresButton: {
    padding: "16px 32px",
    background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)",
    color: "white",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "var(--shadow-md)",
  },

  howItWorksSection: {
    paddingTop: "100px",
    paddingBottom: "100px",
    paddingLeft: "0",
    paddingRight: "0",
    background: "rgba(139, 157, 195, 0.03)",
    width: "100%",
  },

  stepsContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "24px",
    marginBottom: "60px",
  },

  stepCard: {
    background: "var(--card-bg)",
    backdropFilter: "blur(20px)",
    border: "1px solid var(--card-border)",
    borderRadius: "var(--radius-lg)",
    padding: "32px",
    position: "relative" as const,
  },

  stepNumber: {
    position: "absolute" as const,
    top: "-16px",
    left: "32px",
    width: "40px",
    height: "40px",
    background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontWeight: "700",
    fontSize: "1.2rem",
    boxShadow: "var(--shadow-md)",
  },

  stepTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "var(--text-primary)",
    marginTop: "16px",
    marginBottom: "12px",
  },

  stepText: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    lineHeight: "1.6",
  },

  stepsCTA: {
    textAlign: "center" as const,
  },

  securitySection: {
    paddingTop: "100px",
    paddingBottom: "100px",
    paddingLeft: "0",
    paddingRight: "0",
    width: "100%",
  },

  securityGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "32px",
  },

  securityItem: {
    textAlign: "center" as const,
  },

  securityTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "var(--accent-primary)",
    marginBottom: "12px",
  },

  securityText: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    lineHeight: "1.6",
  },

  ctaSection: {
    paddingTop: "120px",
    paddingBottom: "120px",
    paddingLeft: "0",
    paddingRight: "0",
    textAlign: "center" as const,
    background: "rgba(139, 157, 195, 0.05)",
    width: "100%",
  },

  ctaContent: {
    maxWidth: "700px",
    margin: "0 auto",
    paddingLeft: "40px",
    paddingRight: "40px",
  },

  ctaTitle: {
    fontSize: "clamp(2rem, 4vw, 3rem)",
    fontWeight: "700",
    color: "var(--text-primary)",
    marginBottom: "20px",
  },

  ctaText: {
    fontSize: "1.2rem",
    color: "var(--text-secondary)",
    marginBottom: "40px",
    lineHeight: "1.6",
  },

  ctaButton: {
    padding: "18px 40px",
    background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)",
    color: "white",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "1.1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "var(--shadow-lg)",
  },

  footer: {
    paddingTop: "60px",
    paddingBottom: "40px",
    paddingLeft: "0",
    paddingRight: "0",
    background: "rgba(10, 22, 40, 0.5)",
    width: "100%",
  },

  footerContent: {
    maxWidth: "1200px",
    margin: "0 auto",
    paddingLeft: "40px",
    paddingRight: "40px",
    textAlign: "center" as const,
  },

  footerLogo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "20px",
  },

  footerLogoText: {
    fontSize: "1.25rem",
    fontWeight: "700",
    background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
  },

  footerText: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    marginBottom: "12px",
  },

  footerCopy: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
  },
};

