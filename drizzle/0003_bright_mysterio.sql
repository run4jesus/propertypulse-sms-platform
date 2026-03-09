ALTER TABLE `campaigns` ADD `batchSize` int DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `batchIntervalMinutes` int DEFAULT 5 NOT NULL;