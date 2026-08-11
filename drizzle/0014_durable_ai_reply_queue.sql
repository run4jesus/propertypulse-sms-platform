CREATE TABLE IF NOT EXISTS `ai_reply_queue` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `conversationId` int NOT NULL,
  `contactId` int NOT NULL,
  `phoneNumberId` int,
  `sourceMessageSid` varchar(128) NOT NULL,
  `dedupeKey` varchar(191) NOT NULL,
  `replyBody` text NOT NULL,
  `nextStage` enum('intro','price_ask','needs_offer','handoff','not_interested') NOT NULL,
  `scheduledAt` timestamp NOT NULL,
  `awaitingBusinessHours` boolean NOT NULL DEFAULT false,
  `status` enum('pending','processing','sent','cancelled','failed') NOT NULL DEFAULT 'pending',
  `attemptCount` int NOT NULL DEFAULT 0,
  `lockToken` varchar(64),
  `lockedAt` timestamp NULL,
  `sentAt` timestamp NULL,
  `providerSid` varchar(64),
  `lastError` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `ai_reply_queue_id` PRIMARY KEY(`id`),
  CONSTRAINT `ai_reply_queue_dedupeKey_unique` UNIQUE(`dedupeKey`)
);

CREATE INDEX `ai_reply_queue_due_idx` ON `ai_reply_queue` (`status`, `scheduledAt`);
CREATE INDEX `ai_reply_queue_conversation_idx` ON `ai_reply_queue` (`conversationId`, `status`);
