CREATE TABLE `beneficiaries` (
	`id` text PRIMARY KEY NOT NULL,
	`heartbeat_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`relationship` text,
	`share_two_encrypted` text NOT NULL,
	`notified_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`heartbeat_id`) REFERENCES `heartbeats`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `beneficiaries_heartbeat_id_idx` ON `beneficiaries` (`heartbeat_id`);--> statement-breakpoint
CREATE INDEX `beneficiaries_email_idx` ON `beneficiaries` (`email`);--> statement-breakpoint
CREATE TABLE `beneficiary_links` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`beneficiary_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`beneficiary_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `beneficiary_links_user_id_idx` ON `beneficiary_links` (`user_id`);--> statement-breakpoint
CREATE INDEX `beneficiary_links_beneficiary_id_idx` ON `beneficiary_links` (`beneficiary_id`);--> statement-breakpoint
CREATE INDEX `beneficiary_links_status_idx` ON `beneficiary_links` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `beneficiary_links_unique` ON `beneficiary_links` (`user_id`,`beneficiary_id`);--> statement-breakpoint
CREATE TABLE `death_claim_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`claim_id` text NOT NULL,
	`notification_type` text NOT NULL,
	`sent_at` integer NOT NULL,
	`email_status` text NOT NULL,
	`email_provider_id` text,
	FOREIGN KEY (`claim_id`) REFERENCES `death_claims`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `death_claim_notifications_claim_id_idx` ON `death_claim_notifications` (`claim_id`);--> statement-breakpoint
CREATE INDEX `death_claim_notifications_notification_type_idx` ON `death_claim_notifications` (`notification_type`);--> statement-breakpoint
CREATE TABLE `death_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`link_id` text NOT NULL,
	`user_id` text NOT NULL,
	`beneficiary_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`current_stage` text DEFAULT 'email_level' NOT NULL,
	`email_verification_sent_at` integer,
	`email_verification_count` integer DEFAULT 0 NOT NULL,
	`phone_verification_sent_at` integer,
	`phone_verification_count` integer DEFAULT 0 NOT NULL,
	`verified_at` integer,
	`rejected_at` integer,
	`rejection_reason` text,
	`key_retrieved_at` integer,
	`key_retrieval_tx_hash` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`link_id`) REFERENCES `beneficiary_links`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `death_claims_link_id_idx` ON `death_claims` (`link_id`);--> statement-breakpoint
CREATE INDEX `death_claims_user_id_idx` ON `death_claims` (`user_id`);--> statement-breakpoint
CREATE INDEX `death_claims_beneficiary_id_idx` ON `death_claims` (`beneficiary_id`);--> statement-breakpoint
CREATE INDEX `death_claims_status_idx` ON `death_claims` (`status`);--> statement-breakpoint
CREATE INDEX `death_claims_current_stage_idx` ON `death_claims` (`current_stage`);--> statement-breakpoint
CREATE TABLE `death_verification_events` (
	`id` text PRIMARY KEY NOT NULL,
	`claim_id` text NOT NULL,
	`event_type` text NOT NULL,
	`verification_level` text NOT NULL,
	`details` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`claim_id`) REFERENCES `death_claims`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `death_verification_events_claim_id_idx` ON `death_verification_events` (`claim_id`);--> statement-breakpoint
CREATE INDEX `death_verification_events_event_type_idx` ON `death_verification_events` (`event_type`);--> statement-breakpoint
CREATE TABLE `encrypted_files` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`file_hash` text NOT NULL,
	`r2_key` text NOT NULL,
	`original_name` text NOT NULL,
	`encrypted_size` integer NOT NULL,
	`mime_type` text,
	`blockchain_tx_hash` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `encrypted_files_file_hash_unique` ON `encrypted_files` (`file_hash`);--> statement-breakpoint
CREATE INDEX `encrypted_files_user_id_idx` ON `encrypted_files` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `encrypted_files_file_hash_idx` ON `encrypted_files` (`file_hash`);--> statement-breakpoint
CREATE TABLE `heartbeats` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`last_check_in` integer NOT NULL,
	`interval_days` integer NOT NULL,
	`encrypted_file_hash` text NOT NULL,
	`share_one_encrypted` text NOT NULL,
	`share_three_encrypted` text NOT NULL,
	`recovery_triggered` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `heartbeats_user_id_idx` ON `heartbeats` (`user_id`);--> statement-breakpoint
CREATE INDEX `heartbeats_last_check_in_idx` ON `heartbeats` (`last_check_in`);--> statement-breakpoint
CREATE TABLE `login_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`login_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`login_method` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `login_history_user_id_idx` ON `login_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `login_history_login_at_idx` ON `login_history` (`login_at`);--> statement-breakpoint
CREATE TABLE `notification_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`heartbeat_id` text NOT NULL,
	`beneficiary_id` text NOT NULL,
	`sent_at` integer NOT NULL,
	`email_status` text NOT NULL,
	`email_provider_id` text,
	`error_message` text,
	FOREIGN KEY (`heartbeat_id`) REFERENCES `heartbeats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`beneficiary_id`) REFERENCES `beneficiaries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notification_logs_heartbeat_id_idx` ON `notification_logs` (`heartbeat_id`);--> statement-breakpoint
CREATE INDEX `notification_logs_beneficiary_id_idx` ON `notification_logs` (`beneficiary_id`);--> statement-breakpoint
CREATE INDEX `notification_logs_sent_at_idx` ON `notification_logs` (`sent_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`wallet_address` text,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`account_type` text DEFAULT 'user' NOT NULL,
	`phone_number` text,
	`phone_verified` integer DEFAULT false NOT NULL,
	`voice_signature` text,
	`account_frozen` integer DEFAULT false NOT NULL,
	`freeze_reason` text,
	`last_login_at` integer,
	`email_notification_days` integer,
	`phone_notification_days` integer,
	`freeze_days` integer,
	`two_factor_enabled` integer DEFAULT false NOT NULL,
	`two_factor_secret` text,
	`two_factor_backup_codes` text,
	`refer_code` text,
	`subscription_active` integer DEFAULT false NOT NULL,
	`onboarding_completed` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_refer_code_unique` ON `users` (`refer_code`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_last_login_idx` ON `users` (`last_login_at`);--> statement-breakpoint
CREATE INDEX `users_account_type_idx` ON `users` (`account_type`);--> statement-breakpoint
CREATE INDEX `users_refer_code_idx` ON `users` (`refer_code`);--> statement-breakpoint
CREATE TABLE `verification_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`email` text,
	`phone_number` text,
	`code` text NOT NULL,
	`type` text NOT NULL,
	`expires_at` integer NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `verification_codes_email_idx` ON `verification_codes` (`email`);--> statement-breakpoint
CREATE INDEX `verification_codes_phone_idx` ON `verification_codes` (`phone_number`);--> statement-breakpoint
CREATE INDEX `verification_codes_code_idx` ON `verification_codes` (`code`);--> statement-breakpoint
CREATE INDEX `verification_codes_expires_idx` ON `verification_codes` (`expires_at`);