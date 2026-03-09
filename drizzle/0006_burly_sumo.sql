ALTER TABLE `campaigns` ADD `optOutFooter` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `lastBatchSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `nextBatchOffset` int DEFAULT 0 NOT NULL;