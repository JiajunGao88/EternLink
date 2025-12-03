# Database Migration Guide

This guide explains how to set up and run database migrations for the EternLink backend.

## Prerequisites

1. PostgreSQL database installed and running
2. Node.js and npm installed
3. Backend dependencies installed (`npm install`)

## Setup

### 1. Configure Environment Variables

Copy `.env.example` to `.env` and update the database connection string:

```bash
cp .env.example .env
```

Edit `.env` and set your `DATABASE_URL`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/eternlink_db?schema=public"
```

Replace:
- `username` - Your PostgreSQL username
- `password` - Your PostgreSQL password
- `localhost:5432` - Your PostgreSQL host and port
- `eternlink_db` - Your database name

### 2. Create Database

If you haven't created the database yet:

```bash
# Using psql
psql -U postgres
CREATE DATABASE eternlink_db;
\q
```

Or use pgAdmin or any PostgreSQL GUI tool.

## Running Migrations

### First Time Setup

If this is your first time setting up the database, run:

```bash
npm run prisma:migrate
```

This will:
1. Apply all pending migrations
2. Generate Prisma Client
3. Create all tables, indexes, and foreign keys

### Apply Specific Migration

The migration file `20250102000000_add_beneficiary_system` includes:

**New Columns in `users` table:**
- `account_type` - VARCHAR(20) DEFAULT 'user' (distinguishes user vs beneficiary accounts)
- `refer_code` - VARCHAR(12) UNIQUE (unique referral code for linking beneficiaries)

**New Tables:**

1. **beneficiary_links**
   - Links beneficiary accounts to user accounts
   - Tracks link status (active/revoked)
   - Unique constraint on (user_id, beneficiary_id) pairs

2. **death_claims**
   - Tracks death verification process
   - Multi-stage verification (email → phone → key retrieval)
   - Stores verification counts and timestamps
   - Records blockchain transaction hash for key retrieval

3. **death_verification_events**
   - Audit trail for all verification events
   - Stores event type, level, and details (JSON)

4. **death_claim_notifications**
   - Tracks progress notifications sent to beneficiaries
   - Records email delivery status

### Verify Migration

After running the migration, verify it was applied:

```bash
npx prisma migrate status
```

You should see:
```
Database schema is up to date!
```

### Generate Prisma Client

If you make schema changes, regenerate the Prisma Client:

```bash
npm run prisma:generate
```

## Troubleshooting

### Migration Failed

If a migration fails partway through:

```bash
# Mark migration as rolled back
npx prisma migrate resolve --rolled-back 20250102000000_add_beneficiary_system

# Fix the issue and retry
npm run prisma:migrate
```

### Reset Database (Development Only)

**WARNING: This will delete all data!**

```bash
npx prisma migrate reset
```

This will:
1. Drop the database
2. Create a new database
3. Apply all migrations
4. Run seed script (if configured)

### View Database Schema

Open Prisma Studio to view your data:

```bash
npm run prisma:studio
```

This opens a web UI at http://localhost:5555

## Migration Details

### Beneficiary System Features

The migration adds support for:

1. **Beneficiary Accounts**
   - Separate account type (`accountType = 'beneficiary'`)
   - Register using refer code from user accounts
   - Multiple beneficiaries can link to one user
   - Users can revoke beneficiary links

2. **Death Claim Verification**
   - Multi-level verification process:
     - **Email Level**: 3 emails over 9 days (one every 3 days)
     - **Phone Level**: 2 SMS over 4 days (one every 2 days)
     - **Key Retrieval**: Access platform-managed encryption key
   - Automatic progression through stages if no response
   - User can respond at any stage to reject claim
   - Full audit trail of all verification events

3. **Progress Tracking**
   - Beneficiaries receive email at each stage
   - Real-time status tracking in dashboard
   - Event timeline with all verification attempts
   - Blockchain transaction hash recorded for key retrieval

### Database Indexes

The migration creates indexes for optimal query performance:

- **User queries**: `account_type`, `refer_code`
- **Link queries**: `user_id`, `beneficiary_id`, `status`
- **Claim queries**: `link_id`, `user_id`, `beneficiary_id`, `status`, `current_stage`
- **Event queries**: `claim_id`, `event_type`
- **Notification queries**: `claim_id`, `notification_type`

### Foreign Key Constraints

All foreign keys use `CASCADE DELETE` to ensure data integrity:

- Deleting a user → deletes all beneficiary links
- Deleting a link → deletes all death claims
- Deleting a claim → deletes all events and notifications

## Next Steps

After running the migration:

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. The following services will start automatically:
   - Heartbeat monitoring service
   - Account monitoring service
   - **Death claim processor service** (new)

3. Test the new API endpoints:
   - `POST /api/beneficiary/account/register` - Register beneficiary
   - `POST /api/beneficiary/account/generate-refer-code` - Generate refer code
   - `POST /api/beneficiary/death-claim/submit` - Submit death claim
   - See routes documentation for full API reference

## Support

For issues or questions:
1. Check Prisma documentation: https://www.prisma.io/docs
2. Review migration SQL file: `prisma/migrations/20250102000000_add_beneficiary_system/migration.sql`
3. Check application logs for detailed error messages
