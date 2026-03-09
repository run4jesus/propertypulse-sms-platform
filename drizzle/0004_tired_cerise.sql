ALTER TABLE `campaigns` ADD `sendWindowStart` varchar(5) DEFAULT '09:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `sendWindowEnd` varchar(5) DEFAULT '20:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `propertyCity` varchar(100);--> statement-breakpoint
ALTER TABLE `contacts` ADD `propertyState` varchar(50);--> statement-breakpoint
ALTER TABLE `contacts` ADD `propertyZip` varchar(10);