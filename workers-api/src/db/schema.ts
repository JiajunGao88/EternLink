/**
 * Drizzle ORM Schema for EternLink
 * Converted from Prisma schema for Cloudflare D1 (SQLite)
 */

import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Helper for UUID generation (SQLite doesn't have native UUID)
const uuid = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const timestamp = () => integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date());
const timestampUpdated = () => integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date());

// ==================== USERS ====================
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  walletAddress: text('wallet_address'),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false).notNull(),
  accountType: text('account_type').default('user').notNull(), // 'user' | 'beneficiary'
  phoneNumber: text('phone_number'),
  phoneVerified: integer('phone_verified', { mode: 'boolean' }).default(false).notNull(),
  voiceSignature: text('voice_signature'), // Voice profile ID
  accountFrozen: integer('account_frozen', { mode: 'boolean' }).default(false).notNull(),
  freezeReason: text('freeze_reason'),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  emailNotificationDays: integer('email_notification_days'),
  phoneNotificationDays: integer('phone_notification_days'),
  freezeDays: integer('freeze_days'),
  twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' }).default(false).notNull(),
  twoFactorSecret: text('two_factor_secret'),
  twoFactorBackupCodes: text('two_factor_backup_codes'),
  referCode: text('refer_code').unique(),
  subscriptionActive: integer('subscription_active', { mode: 'boolean' }).default(false).notNull(),
  onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  lastLoginIdx: index('users_last_login_idx').on(table.lastLoginAt),
  accountTypeIdx: index('users_account_type_idx').on(table.accountType),
  referCodeIdx: index('users_refer_code_idx').on(table.referCode),
}));

// ==================== VERIFICATION CODES ====================
export const verificationCodes = sqliteTable('verification_codes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  email: text('email'),
  phoneNumber: text('phone_number'),
  code: text('code').notNull(),
  type: text('type').notNull(), // 'email_verification' | 'phone_verification' | 'password_reset'
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  verified: integer('verified', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
}, (table) => ({
  emailIdx: index('verification_codes_email_idx').on(table.email),
  phoneIdx: index('verification_codes_phone_idx').on(table.phoneNumber),
  codeIdx: index('verification_codes_code_idx').on(table.code),
  expiresIdx: index('verification_codes_expires_idx').on(table.expiresAt),
}));

// ==================== LOGIN HISTORY ====================
export const loginHistory = sqliteTable('login_history', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  loginAt: integer('login_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  loginMethod: text('login_method').notNull(), // 'password' | 'siwe' | 'voice'
}, (table) => ({
  userIdIdx: index('login_history_user_id_idx').on(table.userId),
  loginAtIdx: index('login_history_login_at_idx').on(table.loginAt),
}));

// ==================== HEARTBEATS ====================
export const heartbeats = sqliteTable('heartbeats', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lastCheckIn: integer('last_check_in', { mode: 'timestamp' }).notNull(),
  intervalDays: integer('interval_days').notNull(), // 30, 60, 90, 180
  encryptedFileHash: text('encrypted_file_hash').notNull(), // 0x...
  shareOneEncrypted: text('share_one_encrypted').notNull(), // Encrypted SSS Share 1
  shareThreeEncrypted: text('share_three_encrypted').notNull(), // Encrypted SSS Share 3
  recoveryTriggered: integer('recovery_triggered', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
}, (table) => ({
  userIdIdx: index('heartbeats_user_id_idx').on(table.userId),
  lastCheckInIdx: index('heartbeats_last_check_in_idx').on(table.lastCheckIn),
}));

// ==================== BENEFICIARIES (per heartbeat) ====================
export const beneficiaries = sqliteTable('beneficiaries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  heartbeatId: text('heartbeat_id').notNull().references(() => heartbeats.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  relationship: text('relationship'),
  shareTwoEncrypted: text('share_two_encrypted').notNull(), // Encrypted SSS Share 2
  notifiedAt: integer('notified_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
}, (table) => ({
  heartbeatIdIdx: index('beneficiaries_heartbeat_id_idx').on(table.heartbeatId),
  emailIdx: index('beneficiaries_email_idx').on(table.email),
}));

// ==================== NOTIFICATION LOGS ====================
export const notificationLogs = sqliteTable('notification_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  heartbeatId: text('heartbeat_id').notNull().references(() => heartbeats.id, { onDelete: 'cascade' }),
  beneficiaryId: text('beneficiary_id').notNull().references(() => beneficiaries.id, { onDelete: 'cascade' }),
  sentAt: integer('sent_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  emailStatus: text('email_status').notNull(), // 'sent' | 'failed' | 'bounced'
  emailProviderId: text('email_provider_id'),
  errorMessage: text('error_message'),
}, (table) => ({
  heartbeatIdIdx: index('notification_logs_heartbeat_id_idx').on(table.heartbeatId),
  beneficiaryIdIdx: index('notification_logs_beneficiary_id_idx').on(table.beneficiaryId),
  sentAtIdx: index('notification_logs_sent_at_idx').on(table.sentAt),
}));

// ==================== BENEFICIARY LINKS (user account connections) ====================
export const beneficiaryLinks = sqliteTable('beneficiary_links', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  beneficiaryId: text('beneficiary_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').default('active').notNull(), // 'active' | 'revoked'
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }),
}, (table) => ({
  userIdIdx: index('beneficiary_links_user_id_idx').on(table.userId),
  beneficiaryIdIdx: index('beneficiary_links_beneficiary_id_idx').on(table.beneficiaryId),
  statusIdx: index('beneficiary_links_status_idx').on(table.status),
  uniqueLink: uniqueIndex('beneficiary_links_unique').on(table.userId, table.beneficiaryId),
}));

// ==================== DEATH CLAIMS ====================
export const deathClaims = sqliteTable('death_claims', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  linkId: text('link_id').notNull().references(() => beneficiaryLinks.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(), // The deceased user
  beneficiaryId: text('beneficiary_id').notNull(), // The beneficiary making the claim
  status: text('status').default('pending').notNull(), // 'pending' | 'email_verification' | 'phone_verification' | 'approved' | 'rejected'
  currentStage: text('current_stage').default('email_level').notNull(), // 'email_level' | 'phone_level' | 'key_retrieval' | 'completed'
  emailVerificationSentAt: integer('email_verification_sent_at', { mode: 'timestamp' }),
  emailVerificationCount: integer('email_verification_count').default(0).notNull(),
  phoneVerificationSentAt: integer('phone_verification_sent_at', { mode: 'timestamp' }),
  phoneVerificationCount: integer('phone_verification_count').default(0).notNull(),
  verifiedAt: integer('verified_at', { mode: 'timestamp' }),
  rejectedAt: integer('rejected_at', { mode: 'timestamp' }),
  rejectionReason: text('rejection_reason'),
  keyRetrievedAt: integer('key_retrieved_at', { mode: 'timestamp' }),
  keyRetrievalTxHash: text('key_retrieval_tx_hash'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
}, (table) => ({
  linkIdIdx: index('death_claims_link_id_idx').on(table.linkId),
  userIdIdx: index('death_claims_user_id_idx').on(table.userId),
  beneficiaryIdIdx: index('death_claims_beneficiary_id_idx').on(table.beneficiaryId),
  statusIdx: index('death_claims_status_idx').on(table.status),
  currentStageIdx: index('death_claims_current_stage_idx').on(table.currentStage),
}));

// ==================== DEATH VERIFICATION EVENTS ====================
export const deathVerificationEvents = sqliteTable('death_verification_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  claimId: text('claim_id').notNull().references(() => deathClaims.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(), // 'email_sent' | 'phone_sent' | 'no_response' | 'user_responded'
  verificationLevel: text('verification_level').notNull(), // 'email' | 'phone'
  details: text('details'), // JSON string
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
}, (table) => ({
  claimIdIdx: index('death_verification_events_claim_id_idx').on(table.claimId),
  eventTypeIdx: index('death_verification_events_event_type_idx').on(table.eventType),
}));

// ==================== DEATH CLAIM NOTIFICATIONS ====================
export const deathClaimNotifications = sqliteTable('death_claim_notifications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  claimId: text('claim_id').notNull().references(() => deathClaims.id, { onDelete: 'cascade' }),
  notificationType: text('notification_type').notNull(), // 'claim_submitted' | 'email_stage_started' | etc.
  sentAt: integer('sent_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  emailStatus: text('email_status').notNull(), // 'sent' | 'failed'
  emailProviderId: text('email_provider_id'),
}, (table) => ({
  claimIdIdx: index('death_claim_notifications_claim_id_idx').on(table.claimId),
  notificationTypeIdx: index('death_claim_notifications_notification_type_idx').on(table.notificationType),
}));

// ==================== ENCRYPTED FILES (stored in R2, metadata here) ====================
export const encryptedFiles = sqliteTable('encrypted_files', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fileHash: text('file_hash').notNull().unique(), // SHA-256 hash
  r2Key: text('r2_key').notNull(), // R2 object key
  originalName: text('original_name').notNull(),
  encryptedSize: integer('encrypted_size').notNull(), // bytes
  mimeType: text('mime_type'),
  blockchainTxHash: text('blockchain_tx_hash'), // If registered on chain
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
}, (table) => ({
  userIdIdx: index('encrypted_files_user_id_idx').on(table.userId),
  fileHashIdx: uniqueIndex('encrypted_files_file_hash_idx').on(table.fileHash),
}));

// ==================== TYPE EXPORTS ====================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type NewVerificationCode = typeof verificationCodes.$inferInsert;
export type LoginHistoryRecord = typeof loginHistory.$inferSelect;
export type Heartbeat = typeof heartbeats.$inferSelect;
export type Beneficiary = typeof beneficiaries.$inferSelect;
export type BeneficiaryLink = typeof beneficiaryLinks.$inferSelect;
export type DeathClaim = typeof deathClaims.$inferSelect;
export type EncryptedFile = typeof encryptedFiles.$inferSelect;

