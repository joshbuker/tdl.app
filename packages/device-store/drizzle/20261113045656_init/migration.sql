CREATE TABLE `confirmed_ops` (
	`id` text PRIMARY KEY,
	`op` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `key_value` (
	`key` text PRIMARY KEY,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pending_ops` (
	`position` integer PRIMARY KEY AUTOINCREMENT,
	`id` text NOT NULL UNIQUE,
	`op` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rejected_ops` (
	`op_id` text PRIMARY KEY,
	`rejected` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `replica` (
	`user_id` text NOT NULL,
	`device_id` text NOT NULL,
	`cursor` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `unknown_entries` (
	`feed_id` integer PRIMARY KEY,
	`raw` text NOT NULL
);
