CREATE TABLE `referrals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`referrer_name` text NOT NULL,
	`referrer_phone` text NOT NULL,
	`referrer_email` text DEFAULT '' NOT NULL,
	`supporter_name` text NOT NULL,
	`supporter_phone` text NOT NULL,
	`supporter_address` text NOT NULL,
	`supporter_postal` text DEFAULT '' NOT NULL,
	`ward` text DEFAULT 'Ward 6 or 11' NOT NULL,
	`support_level` text DEFAULT 'Needs follow-up' NOT NULL,
	`consent_to_contact` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_referrals_created_at` ON `referrals` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_referrals_status_ward` ON `referrals` (`status`,`ward`);