CREATE TABLE IF NOT EXISTS `webhook_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `eventId` varchar(191) NOT NULL,
  `eventType` enum('inbound_sms','delivery_status') NOT NULL,
  `providerMessageSid` varchar(64) NOT NULL,
  `receivedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `webhook_events_id` PRIMARY KEY(`id`),
  CONSTRAINT `webhook_events_eventId_unique` UNIQUE(`eventId`)
);
