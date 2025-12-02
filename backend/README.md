# EternLink Backend API

Dead Man's Switch backend with heartbeat monitoring, Shamir's Secret Sharing, and automated beneficiary notifications.

## Features

- 🔐 **SIWE Authentication** - Sign-In with Ethereum for wallet-based authentication
- 💓 **Heartbeat Monitoring** - Automated tracking of user check-ins
- 📧 **Email Notifications** - Automated beneficiary notifications on missed heartbeats
- 🔑 **Shamir's Secret Sharing** - Secure storage of encrypted shares
- 🗄️ **PostgreSQL Database** - Robust data persistence with Prisma ORM
- ⏰ **Cron Jobs** - Scheduled heartbeat checks
- 🛡️ **Security** - Helmet, CORS, rate limiting, JWT authentication

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: SIWE (Sign-In with Ethereum) + JWT
- **Email**: Nodemailer
- **Scheduling**: node-cron
- **Logging**: Winston

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure `.env` file:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/eternlink"
JWT_SECRET="your-super-secret-jwt-key"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
```

4. Initialize database:
```bash
npm run prisma:generate
npm run prisma:migrate
```

## Development

Start development server with hot reload:
```bash
npm run dev
```

Server will start on `http://localhost:3001`

## Database Management

### Generate Prisma Client
```bash
npm run prisma:generate
```

### Create Migration
```bash
npm run prisma:migrate
```

### Open Prisma Studio
```bash
npm run prisma:studio
```

## API Endpoints

### Authentication

#### `POST /api/auth/nonce`
Get nonce for SIWE authentication.

**Request:**
```json
{
  "address": "0x1234567890123456789012345678901234567890"
}
```

**Response:**
```json
{
  "nonce": "abc123def456"
}
```

#### `POST /api/auth/verify`
Verify SIWE signature and get JWT token.

**Request:**
```json
{
  "message": "...", // SIWE message
  "signature": "0x..." // Signature
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "walletAddress": "0x...",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

#### `GET /api/auth/profile`
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "walletAddress": "0x...",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "heartbeats": [...]
}
```

### Heartbeats

#### `POST /api/heartbeat`
Create new heartbeat (requires authentication).

**Request:**
```json
{
  "intervalDays": 30,
  "encryptedFileHash": "0x...",
  "shareOneEncrypted": "encrypted_share_1",
  "shareThreeEncrypted": "encrypted_share_3"
}
```

#### `GET /api/heartbeat`
Get all user's heartbeats (requires authentication).

#### `GET /api/heartbeat/:heartbeatId`
Get specific heartbeat (requires authentication).

#### `PUT /api/heartbeat/:heartbeatId`
Update heartbeat check-in (requires authentication).

#### `DELETE /api/heartbeat/:heartbeatId`
Delete heartbeat (requires authentication).

### Beneficiaries

#### `POST /api/beneficiary`
Add beneficiary to heartbeat (requires authentication).

**Request:**
```json
{
  "heartbeatId": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "relationship": "Brother",
  "shareTwoEncrypted": "encrypted_share_2"
}
```

#### `GET /api/beneficiary/:heartbeatId`
Get all beneficiaries for a heartbeat (requires authentication).

#### `PUT /api/beneficiary/:beneficiaryId`
Update beneficiary (requires authentication).

#### `DELETE /api/beneficiary/:beneficiaryId`
Delete beneficiary (requires authentication).

## Heartbeat Monitoring

The heartbeat service runs as a cron job (default: daily at midnight) to check for missed check-ins.

**Algorithm:**
1. Find all heartbeats where `recoveryTriggered = false`
2. For each heartbeat, calculate deadline: `lastCheckIn + intervalDays + gracePeriodDays`
3. If current time > deadline, trigger recovery:
   - Mark `recoveryTriggered = true`
   - Send email notification to all beneficiaries with Share 2
   - Log notification status

**Configuration:**
```env
HEARTBEAT_CHECK_CRON="0 0 * * *"  # Daily at midnight
HEARTBEAT_GRACE_PERIOD_DAYS=7
```

## Email Notifications

Beneficiaries receive a professionally formatted HTML email containing:
- Their encrypted Share 2
- The encrypted file hash
- Instructions on how to recover the file
- Link to recovery portal

**Sample Email:**
- Subject: "EternLink Recovery Notification - You Have Been Named as a Beneficiary"
- Includes both HTML and plain text versions
- Brand-consistent design matching the landing page

## Security

### Authentication Flow
1. User requests nonce with wallet address
2. User signs SIWE message with nonce
3. Backend verifies signature
4. Backend issues JWT token
5. User includes token in Authorization header for protected routes

### Data Protection
- Passwords never stored (only encrypted shares)
- Zero-knowledge architecture (backend cannot decrypt files)
- JWT tokens expire after 7 days (configurable)
- Rate limiting: 100 requests per 15 minutes per IP
- Helmet.js for HTTP security headers

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Watch mode:
```bash
npm run test:watch
```

## Production Build

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Server port | 3001 |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Secret for JWT signing | - |
| `SMTP_HOST` | SMTP server host | smtp.gmail.com |
| `SMTP_PORT` | SMTP server port | 587 |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASSWORD` | SMTP password/app password | - |
| `HEARTBEAT_CHECK_CRON` | Cron schedule for heartbeat checks | 0 0 * * * |
| `HEARTBEAT_GRACE_PERIOD_DAYS` | Grace period after missed check-in | 7 |

## Database Schema

See `prisma/schema.prisma` for the complete database schema.

**Key Tables:**
- `users` - Wallet addresses and user metadata
- `heartbeats` - Heartbeat configurations and encrypted shares
- `beneficiaries` - Beneficiary information and Share 2
- `notification_logs` - Email notification history

## Logging

Logs are written to:
- Console (with colorized output in development)
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

Log levels:
- `error` - Error messages
- `warn` - Warnings
- `info` - Informational messages
- `http` - HTTP request logs
- `debug` - Debug messages (development only)

## License

MIT
