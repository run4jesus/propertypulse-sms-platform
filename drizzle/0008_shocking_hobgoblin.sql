ALTER TABLE `contacts` ADD `dncStatus` enum('clean','internal_dnc','federal_dnc','state_dnc','dnc_complainers') DEFAULT 'clean' NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `litigatorFlag` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `lastScrubbedAt` timestamp;