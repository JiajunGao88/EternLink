<div align="center">

<img src="assets/logo.svg" alt="EternLink Logo" width="180" />

# EternLink

### Blockchain-Powered Digital Asset Protection & Inheritance Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Base Sepolia](https://img.shields.io/badge/Base-Sepolia-0052FF?logo=coinbase)](https://base.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?logo=solidity)](https://soliditylang.org/)

**Secure your digital legacy with military-grade encryption and blockchain immutability.**

[Features](#-features) · [Quick Start](#-quick-start) · [Architecture](#-architecture) · [Documentation](#-documentation)

</div>

---

## The Problem

In the digital age, we accumulate invaluable assets—documents, photos, credentials, and memories. But what happens to them if we're no longer around?

- **Lost passwords** mean lost files forever
- **Trusted third parties** can be compromised or go bankrupt
- **Traditional inheritance** doesn't cover digital assets
- **Complex crypto solutions** are inaccessible to most people

## The Solution

**EternLink** combines cutting-edge cryptography with blockchain technology to create a trustless, automated digital inheritance system—a "Dead Man's Switch" for your most important files.

---

## ✨ Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **2-of-3 Secret Sharing** | Shamir's Secret Sharing splits your encryption key into 3 shares. Any 2 can recover the key—you keep one, the platform stores one, and your beneficiary gets one. |
| **AES-256-GCM Encryption** | Military-grade authenticated encryption ensures your files remain private and tamper-proof. |
| **Blockchain Proof of Existence** | File hashes are permanently recorded on Base Sepolia, providing immutable proof of ownership without exposing content. |
| **Dead Man's Switch** | Automated heartbeat monitoring triggers secure asset transfer to your designated beneficiary after configurable inactivity. |
| **Zero-Knowledge Architecture** | The platform never sees your unencrypted data—all encryption happens client-side in your browser. |

### User Experience

- **No Wallet Required** — Platform-managed transactions mean no MetaMask, no gas fees, no crypto complexity
- **Multi-Format Support** — Encrypt and protect any file type
- **Multi-Channel Alerts** — Email, SMS, and voice call notifications for heartbeat reminders
- **Intuitive Dashboard** — Beautiful, responsive interface built with React and Framer Motion

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/eternlink.git
cd eternlink

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` to see the application.

### Backend Setup (Optional)

```bash
cd backend
npm install
npm run dev
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Encryption │  │   QR Code   │  │     File Management     │  │
│  │  (AES-GCM)  │  │  Generator  │  │       Dashboard         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Express.js)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Heartbeat │  │    Twilio   │  │    Cloudflare R2        │  │
│  │   Monitor   │  │   Alerts    │  │      Storage            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Blockchain (Base Sepolia)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              ProofOfExistence Smart Contract             │   │
│  │         • register(hash) → Immutable timestamp           │   │
│  │         • exists(hash) → Verification query              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Framer Motion |
| Backend | Express.js, Prisma, PostgreSQL |
| Blockchain | Base Sepolia (L2), Solidity 0.8.20, ethers.js |
| Cryptography | Web Crypto API, Shamir's Secret Sharing |
| Storage | Cloudflare R2 |
| Notifications | Twilio (SMS, Voice), Nodemailer |

---

## 📖 Documentation

### How It Works

#### 1. Encryption & Key Splitting

```
Original File → SHA-256 Hash → AES-256-GCM Encryption
                                      ↓
                              Encryption Key
                                      ↓
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
                Share 1           Share 2           Share 3
               (User QR)        (Platform)       (Beneficiary)
```

#### 2. Blockchain Registration

Your file's hash is recorded on-chain, creating permanent proof of:
- **Existence** — The file existed at a specific time
- **Ownership** — Linked to your account
- **Integrity** — Any modification changes the hash

#### 3. Dead Man's Switch

```
User Activity ──────────────────────────────────────────▶ Reset Timer
       │
       │ (Inactivity detected)
       ▼
   Day 1: Email reminder
   Day 3: SMS reminder
   Day 7: Voice call
   Day 14: Beneficiary notified + Share 2 released
```

### Security Model

| Threat | Mitigation |
|--------|------------|
| Platform compromise | 2-of-3 SSS means platform share alone is useless |
| Key loss | Any 2 shares can reconstruct the key |
| Unauthorized access | AES-256-GCM + PBKDF2 (250k iterations) |
| Data tampering | Blockchain verification + GCM authentication |
| Man-in-the-middle | All encryption client-side, HTTPS transport |

---

## 🛠 Development

### Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage
```

### Project Structure

```
EternLink/
├── contracts/              # Solidity smart contracts
│   └── ProofOfExistence.sol
├── src/
│   ├── components/         # React components
│   ├── pages/              # Page components
│   ├── utils/
│   │   ├── crypto.ts       # Encryption utilities
│   │   ├── contract.ts     # Blockchain interactions
│   │   └── sss.ts          # Shamir's Secret Sharing
│   └── App.tsx
├── backend/
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   └── prisma/             # Database schema
└── README.md
```

---

## 🗺 Roadmap

- [x] AES-256-GCM client-side encryption
- [x] Blockchain proof of existence
- [x] 2-of-3 Shamir's Secret Sharing
- [x] Automated heartbeat monitoring
- [x] Multi-channel notifications
- [ ] IPFS integration for decentralized storage
- [ ] Mobile app (React Native)
- [ ] Hardware wallet support
- [ ] Multi-signature beneficiary approval
- [ ] Mainnet deployment

---

## ⚠️ Important Notes

> **Testnet Only**: EternLink currently runs on Base Sepolia testnet. Do not use for production assets.

> **Password Security**: Lost passwords cannot be recovered. Store your encryption password and QR code share securely.

> **Backup Your Shares**: The 2-of-3 system requires any 2 shares for decryption. Losing 2+ shares means permanent data loss.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<div align="center">

**Built with security in mind, designed for everyone.**

[Report Bug](https://github.com/yourusername/eternlink/issues) · [Request Feature](https://github.com/yourusername/eternlink/issues)

</div>
