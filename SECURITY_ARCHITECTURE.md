# EternLink Three-Layer Security Architecture

## 🎯 Core Security Objectives

1. **Zero-Knowledge**: Platform never accesses user's seed phrase/private keys
2. **Split Trust**: No single party (user, beneficiary, or platform) can unilaterally access funds
3. **Dead Man's Switch**: Automatic beneficiary notification after user inactivity
4. **End-to-End Encryption**: All sensitive data encrypted client-side

---

## 🧩 Layer 1: Client-Side Encryption

### Current Implementation (✅ Completed)

**Encryption Stack:**
- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 (250,000 iterations, SHA-256)
- **IV**: Random 12-byte nonce per encryption
- **Salt**: Random 16-byte salt per password

**File Format (.enc):**
```
[Salt: 16 bytes][IV: 12 bytes][Encrypted Data: N bytes]
```

**Security Properties:**
- ✅ Platform never sees plaintext seed phrase
- ✅ Password never leaves client device
- ✅ Encrypted file can be stored anywhere (local/cloud/IPFS)
- ✅ Blockchain stores only SHA-256 hash (32 bytes)

### What We Store vs. What We Don't

| Data Type | Stored? | Location |
|-----------|---------|----------|
| Original Seed Phrase | ❌ NEVER | N/A |
| User Password | ❌ NEVER | N/A |
| Encrypted File (.enc) | ✅ YES | User's device / Optional cloud backup |
| File SHA-256 Hash | ✅ YES | Blockchain (public) |
| Encryption Metadata | ✅ YES | Blockchain (cipher method, timestamp) |

---

## 🧩 Layer 2: Shamir's Secret Sharing (SSS)

### Overview

Split the **decryption password** into multiple shares using Shamir's Secret Sharing:

- **Total Shares**: 3
- **Threshold**: 2 (any 2 shares can reconstruct the password)

### Share Distribution

```
Share 1 → User keeps (stored in secure local storage/hardware wallet)
Share 2 → Beneficiary receives (offline delivery: paper/USB)
Share 3 → Encrypted in user's .enc file metadata
```

### Security Properties

- ✅ User alone cannot lose access (has Share 1 + Share 3)
- ✅ Beneficiary alone cannot steal funds (only has Share 2)
- ✅ Platform breach doesn't expose password (no shares stored on server)
- ✅ Time-lock mechanism controls when Share 3 becomes accessible

### Implementation

**Library**: `secrets.js-grempe` (npm package)

```typescript
import secrets from 'secrets.js-grempe';

// Split password into 3 shares (threshold: 2)
function splitPassword(password: string): string[] {
  const shares = secrets.share(
    secrets.str2hex(password),
    3,  // total shares
    2   // threshold
  );
  return shares; // Returns: ['801...', '802...', '803...']
}

// Reconstruct password from any 2 shares
function reconstructPassword(shares: string[]): string {
  const combined = secrets.combine(shares);
  return secrets.hex2str(combined);
}
```

### User Flow

1. **Setup Phase**:
   ```
   User enters seed phrase
   ↓
   User creates master password
   ↓
   Password split into 3 shares
   ↓
   Share 1: Save to user's device (localStorage/keychain)
   Share 2: Display QR code for beneficiary (print/save offline)
   Share 3: Embed in encrypted file metadata
   ↓
   Encrypt seed phrase with master password
   ↓
   Register file hash on blockchain
   ```

2. **Recovery Phase** (after timeout):
   ```
   Beneficiary receives email notification
   ↓
   Email contains: Share 3 + recovery instructions
   ↓
   Beneficiary provides Share 2 (from paper backup)
   ↓
   System reconstructs password from Share 2 + Share 3
   ↓
   Decrypt .enc file → Recover seed phrase
   ```

---

## 🧩 Layer 3: Heartbeat + Time-Lock Mechanism

### Overview

A **Dead Man's Switch** that automatically notifies beneficiaries if user stops checking in.

### Components

#### 3.1 Heartbeat System

**User Actions:**
- User clicks "I'm Still Here" button
- Configurable intervals: 30 / 60 / 90 / 180 days
- Each check-in resets the countdown timer

**Data Structure:**
```typescript
interface HeartbeatRecord {
  userId: string;
  walletAddress: string;
  lastCheckIn: number;        // Unix timestamp
  intervalDays: number;       // 30, 60, 90, or 180
  beneficiaries: Beneficiary[];
  encryptedFileHash: string;  // Blockchain hash
  shareThree: string;         // SSS Share 3 (encrypted)
}

interface Beneficiary {
  id: string;
  name: string;
  email: string;
  shareTwo: string;           // SSS Share 2 (encrypted with beneficiary's public key)
  relationship: string;
}
```

#### 3.2 Time-Lock Trigger

**Backend Cron Job** (runs daily):
```typescript
async function checkTimeouts() {
  const now = Date.now();

  for (const record of allHeartbeats) {
    const elapsed = now - record.lastCheckIn;
    const threshold = record.intervalDays * 24 * 60 * 60 * 1000;

    if (elapsed > threshold) {
      // Trigger recovery notification
      await notifyBeneficiaries(record);
    }
  }
}
```

#### 3.3 Email Notification System

**What Beneficiaries Receive:**

```
Subject: EternLink Asset Recovery Notification

Dear [Beneficiary Name],

You have been designated as a beneficiary for an EternLink encrypted asset.

The asset owner has not checked in for [X] days, triggering automatic recovery procedures.

🔐 Recovery Information:
- Encrypted File Hash: 0xabc123... (verify on blockchain)
- Your Secret Share (Part 2): [Encrypted Share 2]
- Platform Share (Part 3): [Share 3 - now released]

📋 Recovery Steps:
1. Download the encrypted file from: [Link]
2. Verify blockchain hash matches: [Block Explorer Link]
3. Use your offline Share 2 (paper backup you received)
4. Combine Share 2 + Share 3 to reconstruct password
5. Decrypt file to access seed phrase

⚠️ Security Warning:
- We NEVER send complete seed phrases via email
- You must have your offline Share 2 to complete recovery
- If you did not expect this email, contact support immediately

Recovery Portal: https://eternlink.io/recovery
```

**Email Security:**
- ✅ Email contains only Share 3 (useless alone)
- ✅ Beneficiary must provide Share 2 (offline storage)
- ✅ No complete password or seed phrase in email
- ✅ All shares encrypted in transit (TLS)

---

## 🔒 Smart Contract Updates

### Extended ProofOfExistence Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProofOfExistence {
    struct FileRecord {
        address owner;
        bytes32 fileHash;
        string cipher;
        string cid;
        uint256 size;
        string mime;
        uint256 registeredAt;
        uint256 lastHeartbeat;      // NEW: Last check-in timestamp
        uint256 heartbeatInterval;  // NEW: Interval in seconds
        address[] beneficiaries;    // NEW: Beneficiary addresses
        bool recoveryTriggered;     // NEW: Recovery state
    }

    mapping(bytes32 => FileRecord) public files;
    mapping(address => bytes32[]) public userFiles;

    event HeartbeatUpdated(
        bytes32 indexed fileHash,
        address indexed owner,
        uint256 timestamp
    );

    event RecoveryTriggered(
        bytes32 indexed fileHash,
        address indexed owner,
        address[] beneficiaries,
        uint256 timestamp
    );

    function register(
        bytes32 fileHash,
        string calldata cipher,
        string calldata cid,
        uint256 size,
        string calldata mime,
        uint256 heartbeatInterval,
        address[] calldata beneficiaries
    ) external {
        require(files[fileHash].owner == address(0), "already registered");

        files[fileHash] = FileRecord({
            owner: msg.sender,
            fileHash: fileHash,
            cipher: cipher,
            cid: cid,
            size: size,
            mime: mime,
            registeredAt: block.timestamp,
            lastHeartbeat: block.timestamp,
            heartbeatInterval: heartbeatInterval,
            beneficiaries: beneficiaries,
            recoveryTriggered: false
        });

        userFiles[msg.sender].push(fileHash);
        emit FileRegistered(msg.sender, fileHash, cipher, cid, size, mime);
    }

    function heartbeat(bytes32 fileHash) external {
        require(files[fileHash].owner == msg.sender, "not owner");
        files[fileHash].lastHeartbeat = block.timestamp;
        emit HeartbeatUpdated(fileHash, msg.sender, block.timestamp);
    }

    function checkTimeout(bytes32 fileHash) external view returns (bool) {
        FileRecord memory record = files[fileHash];
        uint256 elapsed = block.timestamp - record.lastHeartbeat;
        return elapsed > record.heartbeatInterval;
    }

    function triggerRecovery(bytes32 fileHash) external {
        FileRecord storage record = files[fileHash];
        require(!record.recoveryTriggered, "already triggered");
        require(checkTimeout(fileHash), "not timed out");

        record.recoveryTriggered = true;
        emit RecoveryTriggered(
            fileHash,
            record.owner,
            record.beneficiaries,
            block.timestamp
        );
    }
}
```

---

## 📊 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        USER DEVICE                          │
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │ 1. Input Seed Phrase (12/24 words)               │     │
│  │ 2. Create Master Password                        │     │
│  └─────────────────┬────────────────────────────────┘     │
│                    │                                        │
│                    ▼                                        │
│  ┌──────────────────────────────────────────────────┐     │
│  │ Shamir's Secret Sharing (3 shares, threshold 2)  │     │
│  │   Share 1: User Device (localStorage)            │     │
│  │   Share 2: Beneficiary (QR code/paper)           │     │
│  │   Share 3: Embedded in .enc file                 │     │
│  └─────────────────┬────────────────────────────────┘     │
│                    │                                        │
│                    ▼                                        │
│  ┌──────────────────────────────────────────────────┐     │
│  │ AES-256-GCM Encryption                           │     │
│  │   Input: Seed Phrase                             │     │
│  │   Key: Master Password                           │     │
│  │   Output: .enc file                              │     │
│  └─────────────────┬────────────────────────────────┘     │
│                    │                                        │
└────────────────────┼────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────────┐
│  LOCAL STORAGE  │    │  BLOCKCHAIN (L2)    │
│                 │    │                     │
│  • .enc file    │    │  • File SHA-256     │
│  • Share 1      │    │  • Owner address    │
│                 │    │  • Heartbeat timer  │
└─────────────────┘    │  • Beneficiaries    │
                       └──────────┬──────────┘
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │  BACKEND SERVER     │
                       │                     │
                       │  • Heartbeat Cron   │
                       │  • Timeout Checker  │
                       │  • Email Service    │
                       └──────────┬──────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │ Timeout Detected?         │
                    │ (no check-in for X days)  │
                    └─────────────┬─────────────┘
                                  │ YES
                                  ▼
                       ┌─────────────────────┐
                       │  SEND EMAIL TO      │
                       │  BENEFICIARIES      │
                       │                     │
                       │  Contains:          │
                       │  • Share 3          │
                       │  • Recovery guide   │
                       │  • .enc file link   │
                       └──────────┬──────────┘
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │  BENEFICIARY        │
                       │                     │
                       │  1. Get Share 3     │
                       │     (from email)    │
                       │  2. Get Share 2     │
                       │     (from paper)    │
                       │  3. Reconstruct     │
                       │     password        │
                       │  4. Decrypt .enc    │
                       │  5. Access assets   │
                       └─────────────────────┘
```

---

## 🛡️ Security Guarantees

### What We Achieve

| Threat | Protection |
|--------|-----------|
| **Platform Compromise** | No seed phrases on server, only encrypted files + Share 3 |
| **Email Interception** | Share 3 alone is useless (need Share 2 from offline storage) |
| **Beneficiary Theft** | Cannot access funds until timeout + need Share 3 from platform |
| **User Forgetfulness** | Can recover with Share 1 (device) + Share 3 (backup) |
| **Database Leak** | All shares encrypted, no master passwords stored |
| **Blockchain Analysis** | Only file hash visible, no personal data on-chain |

### Attack Scenarios & Mitigations

#### Scenario 1: Hacker Compromises Backend Server
- **What they get**: Share 3 (encrypted), user emails, heartbeat timers
- **What they DON'T get**: Share 1, Share 2, master password, seed phrases
- **Can they steal funds?** ❌ NO - Need 2 shares to reconstruct password

#### Scenario 2: Beneficiary Tries to Steal Early
- **What they have**: Share 2 (from paper backup)
- **What they need**: Share 3 (locked until timeout)
- **Can they steal funds?** ❌ NO - Share 3 only released after heartbeat timeout

#### Scenario 3: Man-in-the-Middle Email Attack
- **What attacker intercepts**: Email with Share 3
- **What they DON'T have**: Share 2 (delivered offline)
- **Can they steal funds?** ❌ NO - Share 3 alone cannot reconstruct password

#### Scenario 4: User Loses Device
- **What user lost**: Share 1 (in device localStorage)
- **What user can recover with**: Share 2 (paper backup) + Share 3 (from platform)
- **Can user recover?** ✅ YES - Any 2 shares can reconstruct password

---

## 📋 Implementation Checklist

### Phase 1: Shamir's Secret Sharing (Week 1-2)
- [ ] Install `secrets.js-grempe` library
- [ ] Create `secretSharing.ts` utility module
- [ ] Implement password splitting UI
- [ ] Add QR code generation for Share 2
- [ ] Update encryption flow to embed Share 3

### Phase 2: Backend Infrastructure (Week 3-4)
- [ ] Setup Node.js/Express backend
- [ ] Create PostgreSQL database schema
- [ ] Implement user authentication (wallet signature)
- [ ] Build heartbeat API endpoints
- [ ] Create beneficiary management API

### Phase 3: Smart Contract (Week 5-6)
- [ ] Extend ProofOfExistence contract
- [ ] Add heartbeat functions
- [ ] Implement recovery trigger
- [ ] Deploy to Base Sepolia testnet
- [ ] Update frontend to use new contract

### Phase 4: Heartbeat System (Week 7-8)
- [ ] Build heartbeat UI component
- [ ] Implement cron job for timeout checks
- [ ] Create email notification templates
- [ ] Setup SMTP service (SendGrid/AWS SES)
- [ ] Test timeout trigger flow

### Phase 5: Recovery Portal (Week 9-10)
- [ ] Create beneficiary recovery UI
- [ ] Implement share combination logic
- [ ] Build file decryption workflow
- [ ] Add blockchain verification
- [ ] End-to-end recovery testing

### Phase 6: Security & Documentation (Week 11-12)
- [ ] Security audit (internal)
- [ ] Penetration testing
- [ ] Write user documentation
- [ ] Create video tutorials
- [ ] Beta testing with real users

---

## 🔧 Technology Stack

### Frontend
- React 18.2 + TypeScript
- **New**: `secrets.js-grempe` (Shamir's Secret Sharing)
- **New**: `qrcode.react` (QR code generation)
- Web Crypto API (existing)
- ethers.js 6.9 (existing)

### Backend (NEW)
- Node.js 20+ / Express 4.18
- PostgreSQL 15+ (database)
- **Cron**: `node-cron` (heartbeat checks)
- **Email**: SendGrid / AWS SES
- **Auth**: Wallet signature verification (SIWE)

### Smart Contracts
- Solidity 0.8.20
- Hardhat (testing/deployment)
- Base Sepolia L2 (testnet)

### DevOps
- **Hosting**: Vercel (frontend) + Railway (backend)
- **Database**: Supabase / Neon
- **Monitoring**: Sentry (error tracking)
- **Cron**: Vercel Cron / Railway Cron

---

## 📞 Support & Contact

For security issues or questions about this architecture:
- **Email**: security@eternlink.io
- **GitHub Issues**: [Link to repo]
- **Docs**: https://docs.eternlink.io

---

**Last Updated**: 2025-01-24
**Version**: 2.0
**Status**: Design Phase
