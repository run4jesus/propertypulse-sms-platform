CREATE TABLE `ai_suggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`suggestedReply` text,
	`leadScore` int,
	`motivationLevel` varchar(20),
	`extractedInfo` json,
	`reasoning` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_suggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `call_recordings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contactId` int NOT NULL,
	`conversationId` int,
	`audioUrl` text,
	`transcription` text,
	`duration` int,
	`calledAt` timestamp NOT NULL DEFAULT (now()),
	`transcriptionStatus` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `call_recordings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`stepNumber` int NOT NULL,
	`body` text NOT NULL,
	`delayDays` int NOT NULL DEFAULT 0,
	`delayHours` int NOT NULL DEFAULT 0,
	`sent` int NOT NULL DEFAULT 0,
	`delivered` int NOT NULL DEFAULT 0,
	`replied` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`body` text NOT NULL,
	`category` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('standard','drip') NOT NULL DEFAULT 'standard',
	`status` enum('draft','scheduled','active','paused','completed','cancelled') NOT NULL DEFAULT 'draft',
	`contactListId` int,
	`phoneNumberId` int,
	`scheduledAt` timestamp,
	`completedAt` timestamp,
	`totalContacts` int NOT NULL DEFAULT 0,
	`sent` int NOT NULL DEFAULT 0,
	`delivered` int NOT NULL DEFAULT 0,
	`replied` int NOT NULL DEFAULT 0,
	`optedOut` int NOT NULL DEFAULT 0,
	`failed` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contact_labels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`labelId` int NOT NULL,
	CONSTRAINT `contact_labels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contact_list_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`listId` int NOT NULL,
	CONSTRAINT `contact_list_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contact_lists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`contactCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contact_lists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`firstName` varchar(100),
	`lastName` varchar(100),
	`phone` varchar(20) NOT NULL,
	`email` varchar(320),
	`address` text,
	`city` varchar(100),
	`state` varchar(50),
	`zip` varchar(20),
	`propertyAddress` text,
	`notes` text,
	`optedOut` boolean NOT NULL DEFAULT false,
	`motivationLevel` enum('low','medium','high','unknown') DEFAULT 'unknown',
	`timeline` varchar(100),
	`askingPrice` varchar(50),
	`leadScore` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversation_labels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`labelId` int NOT NULL,
	CONSTRAINT `conversation_labels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contactId` int NOT NULL,
	`phoneNumberId` int,
	`aiEnabled` boolean NOT NULL DEFAULT false,
	`leadScore` int DEFAULT 0,
	`extractedInfo` json,
	`lastMessageAt` timestamp DEFAULT (now()),
	`lastMessagePreview` varchar(200),
	`unreadCount` int NOT NULL DEFAULT 0,
	`isStarred` boolean NOT NULL DEFAULT false,
	`status` enum('active','awaiting_reply','unreplied','opted_out','closed') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `labels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(50) NOT NULL,
	`color` varchar(20) NOT NULL DEFAULT '#6366f1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `labels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`userId` int NOT NULL,
	`direction` enum('outbound','inbound') NOT NULL,
	`body` text NOT NULL,
	`twilioSid` varchar(64),
	`status` enum('queued','sent','delivered','failed','received','undelivered') NOT NULL DEFAULT 'queued',
	`isAiGenerated` boolean NOT NULL DEFAULT false,
	`campaignId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `phone_numbers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`phoneNumber` varchar(20) NOT NULL,
	`twilioSid` varchar(64),
	`friendlyName` varchar(100),
	`status` enum('active','inactive','pending') NOT NULL DEFAULT 'active',
	`isDefault` boolean NOT NULL DEFAULT false,
	`smsSent` int NOT NULL DEFAULT 0,
	`blockRate` float NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `phone_numbers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `aiModeEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `twilioAccountSid` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `twilioAuthToken` varchar(64);