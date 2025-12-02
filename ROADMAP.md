# EternLink Three-Layer Security Implementation Roadmap

## 🎯 Project Overview

Transform EternLink from a basic encryption tool into a **Dead Man's Switch Asset Protection Platform** with:
- Shamir's Secret Sharing (password split into 3 shares)
- Heartbeat mechanism (user check-ins)
- Automatic beneficiary notification
- Zero-knowledge architecture

---

## 📅 Implementation Phases

### Phase 1: Shamir's Secret Sharing (Priority: HIGH)
**Timeline**: Week 1-2
**Complexity**: Medium
**Dependencies**: None

#### Tasks
- [ ] Install `secrets.js-grempe` npm package
- [ ] Create `src/utils/secretSharing.ts` module
- [ ] Implement password splitting logic (3 shares, threshold 2)
- [ ] Add UI for share generation and display
- [ ] Generate QR codes for Share 2 (beneficiary offline backup)
- [ ] Update encryption workflow to embed Share 3 in metadata
- [ ] Add unit tests for secret sharing
- [ ] Update TESTING.md with new test coverage

#### Files to Create/Modify
```
src/utils/secretSharing.ts          (NEW)
src/components/ShareGeneration.tsx  (NEW)
src/App.tsx                         (MODIFY - add SSS flow)
package.json                        (MODIFY - add dependencies)
src/test/secretSharing.test.ts      (NEW)
```

#### Success Criteria
- ✅ Password can be split into 3 shares
- ✅ Any 2 shares can reconstruct original password
- ✅ Share 2 displayed as QR code for user to print
- ✅ Share 3 embedded in encrypted file metadata
- ✅ 100% test coverage for SSS functions

---

### Phase 2: Backend Infrastructure (Priority: HIGH) ✅ COMPLETED
**Timeline**: Week 3-4
**Complexity**: High
**Dependencies**: None

#### Tasks
- ✅ Initialize backend project (`backend/` directory)
- ✅ Setup Express.js + TypeScript
- ✅ Design PostgreSQL database schema
- ✅ Implement user authentication (SIWE - Sign-In With Ethereum)
- ✅ Create REST API endpoints:
  - POST `/api/heartbeat` - Create/update heartbeat
  - GET `/api/heartbeat` - Get all user heartbeats
  - GET `/api/heartbeat/:heartbeatId` - Get specific heartbeat
  - PUT `/api/heartbeat/:heartbeatId` - Update check-in
  - DELETE `/api/heartbeat/:heartbeatId` - Delete heartbeat
  - POST `/api/beneficiary` - Add beneficiary
  - GET `/api/beneficiary/:heartbeatId` - List beneficiaries
  - PUT `/api/beneficiary/:beneficiaryId` - Update beneficiary
  - DELETE `/api/beneficiary/:beneficiaryId` - Delete beneficiary
  - POST `/api/auth/nonce` - Get SIWE nonce
  - POST `/api/auth/verify` - Verify SIWE signature
  - GET `/api/auth/profile` - Get user profile
- ✅ Setup database migrations (Prisma)
- ✅ Add API authentication middleware (JWT)
- ✅ Implement heartbeat monitoring service (cron job)
- ✅ Create email notification system
- [ ] Write API integration tests

#### Database Schema
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Heartbeats table
CREATE TABLE heartbeats (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  last_check_in TIMESTAMP NOT NULL,
  interval_days INTEGER NOT NULL, -- 30, 60, 90, 180
  encrypted_file_hash VARCHAR(66) NOT NULL, -- 0x...
  share_three_encrypted TEXT NOT NULL, -- Encrypted SSS Share 3
  recovery_triggered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Beneficiaries table
CREATE TABLE beneficiaries (
  id UUID PRIMARY KEY,
  heartbeat_id UUID REFERENCES heartbeats(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  relationship VARCHAR(100),
  share_two_encrypted TEXT NOT NULL, -- Encrypted SSS Share 2
  notified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications log
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY,
  heartbeat_id UUID REFERENCES heartbeats(id),
  beneficiary_id UUID REFERENCES beneficiaries(id),
  sent_at TIMESTAMP DEFAULT NOW(),
  email_status VARCHAR(50), -- sent, failed, bounced
  email_provider_id VARCHAR(255)
);
```

#### Files to Create
```
backend/
├── src/
│   ├── server.ts
│   ├── routes/
│   │   ├── heartbeat.routes.ts
│   │   ├── beneficiary.routes.ts
│   │   └── auth.routes.ts
│   ├── controllers/
│   │   ├── heartbeat.controller.ts
│   │   ├── beneficiary.controller.ts
│   │   └── auth.controller.ts
│   ├── services/
│   │   ├── heartbeat.service.ts
│   │   ├── email.service.ts
│   │   └── blockchain.service.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   └── validation.middleware.ts
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── heartbeat.model.ts
│   │   └── beneficiary.model.ts
│   └── config/
│       ├── database.ts
│       └── environment.ts
├── prisma/
│   └── schema.prisma
├── tests/
│   └── integration/
├── package.json
└── tsconfig.json
```

#### Success Criteria
- ✅ Backend server running on port 3001
- ✅ All API endpoints functional
- ✅ Database schema deployed with Prisma
- ✅ Wallet authentication working (SIWE + JWT)
- ✅ Heartbeat monitoring service running
- ✅ Email notification system functional
- ⏳ API integration tests (pending)

---

### Phase 3: Smart Contract Upgrade (Priority: MEDIUM)
**Timeline**: Week 5-6
**Complexity**: Medium
**Dependencies**: Phase 2 (backend schema)

#### Tasks
- [ ] Extend `ProofOfExistence.sol` contract
- [ ] Add heartbeat tracking functions
- [ ] Implement recovery trigger mechanism
- [ ] Add beneficiary address storage
- [ ] Write Hardhat test suite
- [ ] Deploy to Base Sepolia testnet
- [ ] Update frontend to interact with new contract functions
- [ ] Verify contract on Basescan

#### New Contract Functions
```solidity
function register(
    bytes32 fileHash,
    string calldata cipher,
    string calldata cid,
    uint256 size,
    string calldata mime,
    uint256 heartbeatInterval,
    address[] calldata beneficiaries
) external;

function heartbeat(bytes32 fileHash) external;

function checkTimeout(bytes32 fileHash) external view returns (bool);

function triggerRecovery(bytes32 fileHash) external;
```

#### Files to Modify
```
contracts/ProofOfExistence.sol       (MODIFY)
scripts/deploy.ts                    (MODIFY)
test/ProofOfExistence.test.ts        (MODIFY)
src/services/blockchain.ts           (NEW - frontend service)
hardhat.config.ts                    (MODIFY - add new network configs)
```

#### Success Criteria
- ✅ Contract deployed to Base Sepolia
- ✅ Heartbeat functions working on-chain
- ✅ Recovery trigger emits correct events
- ✅ Frontend can call new contract functions
- ✅ 100% test coverage for new functions

---

### Phase 4: Heartbeat System (Priority: HIGH)
**Timeline**: Week 7-8
**Complexity**: High
**Dependencies**: Phase 2, Phase 3

#### Tasks
- [ ] Create heartbeat UI component
- [ ] Add configurable interval selector (30/60/90/180 days)
- [ ] Implement "I'm Still Here" button
- [ ] Build countdown timer display
- [ ] Create backend cron job for timeout checking
- [ ] Setup email service (SendGrid/AWS SES)
- [ ] Design email templates (HTML + plaintext)
- [ ] Implement email sending logic
- [ ] Add email delivery tracking
- [ ] Test full timeout → notification flow

#### Cron Job Logic
```typescript
// Backend: src/cron/checkTimeouts.ts
import cron from 'node-cron';

// Run every day at 2 AM UTC
cron.schedule('0 2 * * *', async () => {
  const now = Date.now();
  const timeoutRecords = await db.heartbeats.findMany({
    where: {
      recovery_triggered: false,
      last_check_in: {
        lt: new Date(now - intervalDays * 24 * 60 * 60 * 1000)
      }
    },
    include: { beneficiaries: true }
  });

  for (const record of timeoutRecords) {
    await emailService.sendRecoveryNotification(record);
    await db.heartbeats.update({
      where: { id: record.id },
      data: { recovery_triggered: true }
    });
  }
});
```

#### Email Template Structure
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>EternLink Asset Recovery Notification</title>
</head>
<body>
  <h1>🔐 Asset Recovery Notification</h1>
  <p>Dear {{beneficiary_name}},</p>

  <p>You have been designated as a beneficiary for an EternLink encrypted asset.</p>

  <p>The asset owner has not checked in for {{days_elapsed}} days.</p>

  <h2>Recovery Information</h2>
  <ul>
    <li><strong>File Hash</strong>: {{file_hash}}</li>
    <li><strong>Blockchain</strong>: <a href="{{block_explorer_link}}">Verify on Base Sepolia</a></li>
    <li><strong>Your Secret Share (Part 3)</strong>: {{share_three}}</li>
  </ul>

  <h2>Recovery Steps</h2>
  <ol>
    <li>Download encrypted file: <a href="{{file_download_link}}">Download</a></li>
    <li>Verify blockchain hash matches</li>
    <li>Retrieve your offline Share 2 (paper backup)</li>
    <li>Visit recovery portal: <a href="https://eternlink.io/recovery">Recovery Portal</a></li>
    <li>Combine Share 2 + Share 3</li>
    <li>Decrypt file to access seed phrase</li>
  </ol>

  <p><strong>⚠️ Security Warning</strong></p>
  <p>This email contains only Share 3, which is useless alone. You must have your offline Share 2 to complete recovery.</p>

  <p>Questions? Contact support@eternlink.io</p>
</body>
</html>
```

#### Files to Create/Modify
```
src/components/HeartbeatPanel.tsx    (NEW)
src/components/IntervalSelector.tsx  (NEW)
backend/src/cron/checkTimeouts.ts    (NEW)
backend/src/services/email.service.ts (NEW)
backend/templates/recovery-email.html (NEW)
src/App.tsx                          (MODIFY)
```

#### Success Criteria
- ✅ User can set heartbeat interval
- ✅ "I'm Still Here" button updates timestamp
- ✅ Countdown timer shows days remaining
- ✅ Cron job detects timeouts correctly
- ✅ Email sent to all beneficiaries on timeout
- ✅ Email contains Share 3 + recovery instructions
- ✅ No seed phrases or passwords in email

---

### Phase 5: Beneficiary Management (Priority: MEDIUM)
**Timeline**: Week 9-10
**Complexity**: Medium
**Dependencies**: Phase 2

#### Tasks
- [ ] Create beneficiary add/edit/delete UI
- [ ] Build beneficiary list component
- [ ] Implement email validation
- [ ] Add Share 2 encryption for each beneficiary
- [ ] Generate printable Share 2 cards (PDF)
- [ ] Create QR codes for each beneficiary's Share 2
- [ ] Add beneficiary confirmation flow (email verification)
- [ ] Implement beneficiary removal with confirmation

#### UI Components
```
src/components/BeneficiaryManager.tsx  (NEW)
src/components/BeneficiaryCard.tsx     (NEW)
src/components/AddBeneficiaryModal.tsx (NEW)
src/components/ShareTwoQRCode.tsx      (NEW)
src/components/PrintableShareCard.tsx  (NEW)
```

#### Beneficiary Setup Flow
```
1. User clicks "Add Beneficiary"
   ↓
2. Modal opens: Enter name, email, relationship
   ↓
3. System generates Share 2 for this beneficiary
   ↓
4. Display Share 2 as:
   - QR code (scannable)
   - Text string (copyable)
   - Printable PDF card
   ↓
5. User saves/prints Share 2 offline
   ↓
6. System sends confirmation email to beneficiary
   ↓
7. Beneficiary confirms email (optional)
   ↓
8. Share 2 stored encrypted in backend
```

#### Success Criteria
- ✅ User can add multiple beneficiaries
- ✅ Each beneficiary gets unique Share 2
- ✅ Share 2 displayed as QR code + text
- ✅ Printable PDF cards generated
- ✅ Beneficiary list shows all contacts
- ✅ User can remove beneficiaries
- ✅ Confirmation emails sent successfully

---

### Phase 6: Recovery Portal (Priority: HIGH)
**Timeline**: Week 11-12
**Complexity**: High
**Dependencies**: Phase 4, Phase 5

#### Tasks
- [ ] Create recovery portal landing page
- [ ] Build share combination UI
- [ ] Implement file upload for .enc files
- [ ] Add blockchain hash verification
- [ ] Create password reconstruction logic
- [ ] Implement file decryption workflow
- [ ] Display recovered seed phrase securely
- [ ] Add "Copy to Clipboard" with security warnings
- [ ] Build recovery history log
- [ ] Add support/help documentation

#### Recovery Portal Pages
```
/recovery                           (Landing page)
/recovery/upload                    (Upload .enc file)
/recovery/verify                    (Verify blockchain hash)
/recovery/combine-shares            (Combine Share 2 + Share 3)
/recovery/decrypt                   (Decrypt file)
/recovery/success                   (Display seed phrase)
```

#### Recovery Flow
```
1. Beneficiary receives email with Share 3
   ↓
2. Visit recovery portal
   ↓
3. Upload encrypted .enc file
   ↓
4. System extracts file hash, verifies on blockchain
   ↓
5. Beneficiary enters Share 2 (from paper backup)
   ↓
6. System combines Share 2 + Share 3 → Reconstructs password
   ↓
7. System decrypts .enc file with reconstructed password
   ↓
8. Display recovered seed phrase (with copy button)
   ↓
9. Show security warning: "Transfer assets immediately"
```

#### Files to Create
```
src/pages/Recovery.tsx               (NEW)
src/pages/RecoveryUpload.tsx         (NEW)
src/pages/RecoveryVerify.tsx         (NEW)
src/pages/RecoveryCombineShares.tsx  (NEW)
src/pages/RecoveryDecrypt.tsx        (NEW)
src/pages/RecoverySuccess.tsx        (NEW)
src/components/FileUploader.tsx      (NEW)
src/components/ShareCombiner.tsx     (NEW)
src/components/SeedPhraseDisplay.tsx (NEW)
```

#### Success Criteria
- ✅ Beneficiary can upload .enc file
- ✅ System verifies file hash on blockchain
- ✅ Share 2 + Share 3 correctly reconstruct password
- ✅ File decrypts successfully
- ✅ Seed phrase displayed securely
- ✅ Copy to clipboard works
- ✅ Full end-to-end recovery test passes

---

### Phase 7: Testing & Security Audit (Priority: CRITICAL)
**Timeline**: Week 13-14
**Complexity**: High
**Dependencies**: All previous phases

#### Tasks
- [ ] Write integration tests for full workflow
- [ ] Perform security audit (internal)
- [ ] Test all attack scenarios from SECURITY_ARCHITECTURE.md
- [ ] Penetration testing (hire external auditor if budget allows)
- [ ] Fix all critical/high vulnerabilities
- [ ] Add rate limiting to API endpoints
- [ ] Implement CAPTCHA for recovery portal
- [ ] Add IP-based access logs
- [ ] Test email deliverability (spam filters)
- [ ] Load testing (simulate 1000 users)

#### Security Tests
```
✅ Test 1: Backend compromise - can attacker steal funds?
✅ Test 2: Email interception - is Share 3 alone useless?
✅ Test 3: Beneficiary theft attempt - can they access early?
✅ Test 4: User device loss - can user recover?
✅ Test 5: SQL injection in API
✅ Test 6: XSS in recovery portal
✅ Test 7: CSRF in heartbeat endpoint
✅ Test 8: Timing attacks on password reconstruction
```

#### Files to Create
```
tests/integration/fullWorkflow.test.ts
tests/security/attackScenarios.test.ts
tests/security/penetrationTest.md
SECURITY_AUDIT_REPORT.md
```

#### Success Criteria
- ✅ All integration tests pass
- ✅ Zero critical vulnerabilities
- ✅ All attack scenarios mitigated
- ✅ Security audit report completed
- ✅ Penetration testing passed
- ✅ Email deliverability > 95%

---

### Phase 8: Documentation & Launch (Priority: HIGH)
**Timeline**: Week 15-16
**Complexity**: Medium
**Dependencies**: Phase 7

#### Tasks
- [ ] Write comprehensive user documentation
- [ ] Create video tutorials (setup, recovery)
- [ ] Build FAQ section
- [ ] Write security best practices guide
- [ ] Create beneficiary onboarding guide
- [ ] Deploy to production (frontend + backend)
- [ ] Setup monitoring (Sentry, LogRocket)
- [ ] Create incident response plan
- [ ] Beta testing with 10 real users
- [ ] Collect feedback and iterate

#### Documentation Structure
```
docs/
├── user-guide/
│   ├── getting-started.md
│   ├── encrypting-seed-phrase.md
│   ├── setting-up-beneficiaries.md
│   ├── heartbeat-mechanism.md
│   └── recovery-process.md
├── security/
│   ├── architecture.md
│   ├── threat-model.md
│   ├── best-practices.md
│   └── audit-reports/
├── api/
│   ├── authentication.md
│   ├── endpoints.md
│   └── webhooks.md
└── videos/
    ├── setup-tutorial.mp4
    └── recovery-tutorial.mp4
```

#### Success Criteria
- ✅ All documentation complete
- ✅ Video tutorials published
- ✅ Production deployment successful
- ✅ Monitoring dashboards active
- ✅ Beta users successfully onboarded
- ✅ Positive user feedback
- ✅ No critical bugs in first week

---

## 📊 Progress Tracking

### Overall Progress: 10% Complete

| Phase | Status | Progress | Priority |
|-------|--------|----------|----------|
| Phase 1: SSS | 🟡 Not Started | 0% | HIGH |
| Phase 2: Backend | 🟡 Not Started | 0% | HIGH |
| Phase 3: Smart Contract | 🟡 Not Started | 0% | MEDIUM |
| Phase 4: Heartbeat | 🟡 Not Started | 0% | HIGH |
| Phase 5: Beneficiaries | 🟡 Not Started | 0% | MEDIUM |
| Phase 6: Recovery Portal | 🟡 Not Started | 0% | HIGH |
| Phase 7: Security Audit | 🟡 Not Started | 0% | CRITICAL |
| Phase 8: Documentation | 🟡 Not Started | 0% | HIGH |

**Legend**:
- 🟢 Complete
- 🟡 Not Started
- 🔵 In Progress
- 🔴 Blocked

---

## 🚀 Quick Start (Phase 1)

To start implementing immediately:

```bash
# Install Shamir's Secret Sharing library
npm install secrets.js-grempe

# Install QR code generation library
npm install qrcode.react

# Install TypeScript types
npm install --save-dev @types/qrcode.react

# Create new utility file
touch src/utils/secretSharing.ts

# Create test file
touch src/test/secretSharing.test.ts
```

Then follow Phase 1 tasks in detail.

---

## 📞 Questions or Feedback?

If you have questions about this roadmap or want to adjust priorities:
- Open GitHub Issue
- Email: dev@eternlink.io
- Discord: [Link to server]

---

**Last Updated**: 2025-01-24
**Next Review**: After Phase 1 completion
**Estimated Total Time**: 16 weeks (4 months)
