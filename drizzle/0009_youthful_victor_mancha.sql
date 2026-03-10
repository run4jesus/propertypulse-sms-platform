ALTER TABLE `campaigns` ADD `scrubInternalDnc` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `scrubLitigators` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `scrubExistingContacts` boolean DEFAULT false NOT NULL;