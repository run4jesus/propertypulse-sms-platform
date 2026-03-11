CREATE TABLE `follow_up_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`campaignId` int NOT NULL,
	`conversationId` int NOT NULL,
	`contactId` int NOT NULL,
	`phoneNumberId` int,
	`message` text NOT NULL,
	`scheduledAt` timestamp NOT NULL,
	`sentAt` timestamp,
	`status` enum('pending','sent','cancelled','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `follow_up_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `campaigns` ADD `phoneNumberIds` json DEFAULT ('[]') NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `followUpEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `followUpDelayHours` int DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `followUpMessage` text;