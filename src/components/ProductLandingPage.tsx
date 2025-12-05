import { motion } from "framer-motion";

interface ProductLandingPageProps {
  onTryDemo: () => void;
  onRegisterBeneficiary: () => void;
  onLogin: () => void;
  isLoggedIn?: boolean;
  userName?: string;
  onDashboard?: () => void;
  onLogout?: () => void;
}

export default function ProductLandingPage({ 
  onTryDemo, 
  onLogin,
  isLoggedIn = false,
  userName = '',
  onDashboard,
  onLogout,
}: ProductLandingPageProps) {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#1a2942] to-[#0a1628] text-white">
      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 bg-[#0a1628]/80 backdrop-blur-md border-b border-[#C0C8D4]/10"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                <path
                  d="M24 4L8 12V22C8 31 14 39 24 44C34 39 40 31 40 22V12L24 4Z"
                  stroke="#C0C8D4"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 24H18L21 18L24 30L27 20L30 24H36"
                  stroke="#3DA288"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-2xl font-bold bg-gradient-to-r from-[#C0C8D4] to-[#3DA288] bg-clip-text text-transparent">
                EternLink
              </span>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection("mission")}
                className="text-[#C0C8D4] hover:text-[#3DA288] transition-colors"
              >
                Mission
              </button>
              <button
                onClick={() => scrollToSection("features")}
                className="text-[#C0C8D4] hover:text-[#3DA288] transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="text-[#C0C8D4] hover:text-[#3DA288] transition-colors"
              >
                How It Works
              </button>
              
              {isLoggedIn ? (
                <div className="flex items-center gap-4">
                  <button
                    onClick={onDashboard}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1a2942]/60 border border-[#C0C8D4]/20 rounded-lg hover:border-[#3DA288]/50 transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#3DA288] to-[#2d8a6f] flex items-center justify-center text-white font-semibold text-sm">
                      {userName ? userName.charAt(0).toUpperCase() : '👤'}
                    </div>
                    <span className="text-[#C0C8D4] font-medium">
                      {userName || 'Dashboard'}
                    </span>
                  </button>
                  <button
                    onClick={onLogout}
                    className="px-4 py-2 text-[#8b96a8] hover:text-white transition-colors text-sm"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={onLogin}
                  className="px-6 py-2 bg-gradient-to-r from-[#3DA288] to-[#2d8a6f] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#3DA288]/30 transition-all"
                >
                  Get Started Free
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="inline-block px-4 py-2 bg-[#3DA288]/10 border border-[#3DA288]/30 rounded-full mb-6"
            >
              <span className="text-[#3DA288] font-semibold text-sm">🛡️ Zero-Knowledge Security</span>
            </motion.div>

            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-[#C0C8D4] to-white bg-clip-text text-transparent">
                Family-Grade
              </span>
              <br />
              <span className="bg-gradient-to-r from-[#3DA288] to-[#2d8a6f] bg-clip-text text-transparent">
                Crypto Assets
              </span>
            </h1>

            <p className="text-xl text-[#8b96a8] mb-8 leading-relaxed">
              Transforming "high-risk" crypto storage into a <span className="text-[#3DA288] font-semibold">secure</span>,{" "}
              <span className="text-[#3DA288] font-semibold">inheritable</span>, and{" "}
              <span className="text-[#3DA288] font-semibold">resilient</span> family legacy.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onLogin}
                className="px-8 py-4 bg-gradient-to-r from-[#3DA288] to-[#2d8a6f] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#3DA288]/30 transition-all transform hover:scale-105"
              >
                Get Started Free
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="px-8 py-4 bg-[#1a2942]/50 border border-[#C0C8D4]/20 text-[#C0C8D4] font-semibold rounded-xl hover:bg-[#1a2942] transition-all"
              >
                Learn More
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            {/* Animated Shield Graphic */}
            <div className="relative w-full aspect-square max-w-md mx-auto">
              {/* Outer Glow */}
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 bg-gradient-to-r from-[#3DA288]/20 to-[#C0C8D4]/20 rounded-full blur-3xl"
              />

              {/* Main Shield */}
              <svg
                className="relative z-10 w-full h-full drop-shadow-2xl"
                viewBox="0 0 200 200"
                fill="none"
              >
                <defs>
                  <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#C0C8D4" />
                    <stop offset="50%" stopColor="#3DA288" />
                    <stop offset="100%" stopColor="#2d8a6f" />
                  </linearGradient>
                </defs>

                {/* Shield Outline */}
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, delay: 0.5 }}
                  d="M100 20L40 50V90C40 130 60 165 100 180C140 165 160 130 160 90V50L100 20Z"
                  stroke="url(#shieldGradient)"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Heartbeat Line */}
                <motion.path
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.5, delay: 1.5 }}
                  d="M50 100H75L85 80L100 120L115 85L125 100H150"
                  stroke="#3DA288"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Animated Pulse */}
                <motion.circle
                  animate={{
                    scale: [0, 2],
                    opacity: [0.8, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                  cx="100"
                  cy="100"
                  r="10"
                  fill="#3DA288"
                />
              </svg>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section id="mission" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[#C0C8D4] to-[#3DA288] bg-clip-text text-transparent">
                The Single Point of Failure
              </span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#C0C8D4] mb-2">Traditional Risk</h3>
                  <p className="text-[#8b96a8]">
                    Standard cold wallets rely on a single mnemonic phrase (private key).
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#C0C8D4] mb-2">Loss = Total Loss</h3>
                  <p className="text-[#8b96a8]">
                    If this phrase is lost, or if the owner passes away without sharing it, the assets are permanently inaccessible.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#C0C8D4] mb-2">Sharing Risk</h3>
                  <p className="text-[#8b96a8]">
                    Sharing the phrase pre-mortem compromises security ("Not your keys, not your coins").
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square bg-gradient-to-br from-[#1a2942] to-[#0a1628] rounded-2xl border border-[#C0C8D4]/10 p-8 flex items-center justify-center">
                <motion.div
                  animate={{
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <svg className="w-48 h-48" viewBox="0 0 200 200" fill="none">
                    <rect x="60" y="80" width="80" height="60" rx="8" stroke="#fbbf24" strokeWidth="4" fill="none" />
                    <circle cx="100" cy="110" r="8" fill="#fbbf24" />
                    <path d="M100 50C90 50 80 60 80 70V80H120V70C120 60 110 50 100 50Z" stroke="#fbbf24" strokeWidth="4" fill="none" />

                    <motion.path
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: [0, 1, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      d="M50 110L150 110"
                      stroke="#dc2626"
                      strokeWidth="3"
                      strokeDasharray="5,5"
                    />
                  </svg>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-[#1a2942]/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[#C0C8D4] to-[#3DA288] bg-clip-text text-transparent">
                Zero-Knowledge Security
              </span>
            </h2>
            <p className="text-xl text-[#8b96a8] max-w-3xl mx-auto">
              Your encryption happens client-side. EternLink servers only receive encrypted data.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-[#1a2942] to-[#0a1628] p-8 rounded-2xl border border-[#3DA288]/20 hover:border-[#3DA288]/50 transition-all group"
            >
              <div className="w-16 h-16 bg-[#3DA288]/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-[#3DA288]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-[#C0C8D4] mb-4">Client-Side Only</h3>
              <p className="text-[#8b96a8] leading-relaxed">
                Encryption happens on the user's device. EternLink servers only receive the encrypted share (Key 3), never the mnemonic.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-[#1a2942] to-[#0a1628] p-8 rounded-2xl border border-[#3DA288]/20 hover:border-[#3DA288]/50 transition-all group"
            >
              <div className="w-16 h-16 bg-[#3DA288]/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-[#3DA288]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-[#C0C8D4] mb-4">On-Chain Traceability</h3>
              <p className="text-[#8b96a8] leading-relaxed">
                The Platform Key's existence and access logs are hashed on-chain, creating an immutable audit trail.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-[#1a2942] to-[#0a1628] p-8 rounded-2xl border border-[#3DA288]/20 hover:border-[#3DA288]/50 transition-all group"
            >
              <div className="w-16 h-16 bg-[#3DA288]/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-[#3DA288]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-[#C0C8D4] mb-4">No Insider Threat</h3>
              <p className="text-[#8b96a8] leading-relaxed">
                Even if EternLink is hacked, attackers only get one share (Key 3), which is insufficient to steal funds.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Key Distribution Architecture */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[#C0C8D4] to-[#3DA288] bg-clip-text text-transparent">
                Key Distribution Architecture
              </span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Key 1 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-[#3DA288]/10 to-[#2d8a6f]/5 p-8 rounded-2xl border border-[#3DA288]/30"
            >
              <div className="w-16 h-16 bg-[#3DA288]/20 rounded-full flex items-center justify-center mb-6 mx-auto">
                <svg className="w-8 h-8 text-[#3DA288]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-center text-[#3DA288] mb-4">Key 1: User</h3>
              <p className="text-[#8b96a8] text-center leading-relaxed">
                Held by the asset owner. Allows them to maintain full control and perform standard recovery at any time.
              </p>
            </motion.div>

            {/* Key 2 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-[#C0C8D4]/10 to-[#8b9da8]/5 p-8 rounded-2xl border border-[#C0C8D4]/30"
            >
              <div className="w-16 h-16 bg-[#C0C8D4]/20 rounded-full flex items-center justify-center mb-6 mx-auto">
                <svg className="w-8 h-8 text-[#C0C8D4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-center text-[#C0C8D4] mb-4">Key 2: Beneficiary</h3>
              <p className="text-[#8b96a8] text-center leading-relaxed">
                Given to the designated heir. It is useless on its own, ensuring the heir cannot access funds prematurely.
              </p>
            </motion.div>

            {/* Key 3 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-[#1a2942] to-[#0a1628] p-8 rounded-2xl border border-[#C0C8D4]/30"
            >
              <div className="w-16 h-16 bg-[#C0C8D4]/20 rounded-full flex items-center justify-center mb-6 mx-auto">
                <svg className="w-8 h-8 text-[#C0C8D4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-center text-[#C0C8D4] mb-4">Key 3: Platform</h3>
              <p className="text-[#8b96a8] text-center leading-relaxed">
                Stored by EternLink on-chain. This key is <span className="text-[#3DA288] font-semibold">only</span> released via the "Dead Man's Switch" protocol.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-[#1a2942]/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[#C0C8D4] to-[#3DA288] bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>
            <p className="text-xl text-[#8b96a8] max-w-3xl mx-auto">
              Four-stage automated process to secure your digital legacy
            </p>
          </motion.div>

          <div className="relative">
            {/* Vertical Timeline Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-[#C0C8D4]/30 via-[#3DA288]/50 to-[#C0C8D4]/30 transform -translate-x-1/2 hidden md:block" />

            {/* Step 1 - Inactivity Detected (Left text, Right icon) */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="relative mb-24"
            >
              <div className="md:grid md:grid-cols-[1fr_auto_1fr] md:gap-8 items-center">
                {/* Left: Text Content */}
                <div className="md:text-right mb-8 md:mb-0 md:pr-8">
                  <h3 className="text-2xl md:text-3xl font-bold text-[#C0C8D4] mb-3">
                    1. Inactivity Detected
                  </h3>
                  <p className="text-[#8b96a8] text-lg">
                    Prolonged silence on the platform triggers the initial alert.
                  </p>
                </div>

                {/* Center: Timeline Node */}
                <div className="hidden md:flex items-center justify-center relative z-10">
                  <div className="w-6 h-6 bg-gradient-to-br from-[#C0C8D4] to-[#8b9da8] rounded-full border-4 border-[#0a1628]"></div>
                </div>

                {/* Right: Icon */}
                <div className="flex justify-center md:justify-start md:pl-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#C0C8D4]/20 rounded-full blur-xl" />
                    <div className="relative w-24 h-24 bg-gradient-to-br from-[#C0C8D4] to-[#8b9da8] rounded-full flex items-center justify-center shadow-lg shadow-[#C0C8D4]/30">
                      <svg className="w-12 h-12 text-[#0a1628]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Step 2 - Verification Attempts (Left icon, Right text) */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative mb-24"
            >
              <div className="md:grid md:grid-cols-[1fr_auto_1fr] md:gap-8 items-center">
                {/* Left: Icon */}
                <div className="flex justify-center md:justify-end md:pr-8 mb-8 md:mb-0">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#3DA288]/20 rounded-full blur-xl" />
                    <div className="relative w-24 h-24 bg-gradient-to-br from-[#3DA288] to-[#2d8a6f] rounded-full flex items-center justify-center shadow-lg shadow-[#3DA288]/30">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Center: Timeline Node */}
                <div className="hidden md:flex items-center justify-center relative z-10">
                  <div className="w-6 h-6 bg-gradient-to-br from-[#3DA288] to-[#2d8a6f] rounded-full border-4 border-[#0a1628]"></div>
                </div>

                {/* Right: Text Content */}
                <div className="md:text-left md:pl-8">
                  <h3 className="text-2xl md:text-3xl font-bold text-[#C0C8D4] mb-3">
                    2. Verification Attempts
                  </h3>
                  <p className="text-[#8b96a8] text-lg">
                    We try to reach you via Email, SMS, and App notifications.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Step 3 - Protocol Activation (Left text, Right icon) */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="relative mb-24"
            >
              <div className="md:grid md:grid-cols-[1fr_auto_1fr] md:gap-8 items-center">
                {/* Left: Text Content */}
                <div className="md:text-right mb-8 md:mb-0 md:pr-8">
                  <h3 className="text-2xl md:text-3xl font-bold text-[#C0C8D4] mb-3">
                    3. Protocol Activation
                  </h3>
                  <p className="text-[#8b96a8] text-lg">
                    If no response, the Platform Key (Key 3) is released securely.
                  </p>
                </div>

                {/* Center: Timeline Node */}
                <div className="hidden md:flex items-center justify-center relative z-10">
                  <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-red-600 rounded-full border-4 border-[#0a1628]"></div>
                </div>

                {/* Right: Icon */}
                <div className="flex justify-center md:justify-start md:pl-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl" />
                    <div className="relative w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Step 4 - Asset Restoration (Left icon, Right text) */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="md:grid md:grid-cols-[1fr_auto_1fr] md:gap-8 items-center">
                {/* Left: Icon */}
                <div className="flex justify-center md:justify-end md:pr-8 mb-8 md:mb-0">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl" />
                    <div className="relative w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Center: Timeline Node */}
                <div className="hidden md:flex items-center justify-center relative z-10">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full border-4 border-[#0a1628]"></div>
                </div>

                {/* Right: Text Content */}
                <div className="md:text-left md:pl-8">
                  <h3 className="text-2xl md:text-3xl font-bold text-[#C0C8D4] mb-3">
                    4. Asset Restoration
                  </h3>
                  <p className="text-[#8b96a8] text-lg">
                    Beneficiary combines Key 3 + Key 2 to unlock the legacy.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-[#3DA288]/20 to-[#2d8a6f]/10 p-12 rounded-3xl border border-[#3DA288]/30 text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-[#C0C8D4] bg-clip-text text-transparent">
                Ready to Secure Your Legacy?
              </span>
            </h2>
            <p className="text-xl text-[#8b96a8] mb-8">
              Try EternLink for free. No credit card required.
            </p>
            <button
              onClick={onLogin}
              className="px-12 py-4 bg-gradient-to-r from-[#3DA288] to-[#2d8a6f] text-white text-lg font-semibold rounded-xl hover:shadow-lg hover:shadow-[#3DA288]/30 transition-all transform hover:scale-105"
            >
              Get Started Free
            </button>
          </motion.div>
        </div>
      </section>

      {/* Try Demo Section */}
      <section className="py-20 px-6 bg-[#1a2942]/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[#C0C8D4] to-[#3DA288] bg-clip-text text-transparent">
                See How Our Core Features Work
              </span>
            </h2>
            <p className="text-lg text-[#8b96a8] mb-8 max-w-2xl mx-auto">
              Experience a live demonstration of EternLink's key recovery process and see how our zero-knowledge security protects your digital assets.
            </p>
            <button
              onClick={onTryDemo}
              className="px-10 py-4 bg-[#1a2942] border-2 border-[#3DA288] text-[#3DA288] text-lg font-semibold rounded-xl hover:bg-[#3DA288] hover:text-white transition-all transform hover:scale-105"
            >
              Try Demo
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#C0C8D4]/10 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-[#8b96a8] text-sm">
            © 2025 EternLink. All rights reserved. | Securing crypto legacies with zero-knowledge security.
          </p>
        </div>
      </footer>
    </div>
  );
}
