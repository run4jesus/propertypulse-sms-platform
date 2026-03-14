ALTER TABLE `conversations` ADD COLUMN `aiStage` enum('intro','price_ask','handoff','not_interested') DEFAULT 'intro';
