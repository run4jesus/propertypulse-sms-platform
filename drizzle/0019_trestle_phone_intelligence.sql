ALTER TABLE `contacts`
  ADD COLUMN `phone1ActivityScore` int,
  ADD COLUMN `phone2ActivityScore` int,
  ADD COLUMN `phone3ActivityScore` int,
  ADD COLUMN `phone1Carrier` varchar(255),
  ADD COLUMN `phone2Carrier` varchar(255),
  ADD COLUMN `phone3Carrier` varchar(255),
  ADD COLUMN `phone1IsValid` boolean,
  ADD COLUMN `phone2IsValid` boolean,
  ADD COLUMN `phone3IsValid` boolean,
  ADD COLUMN `phone1ClassifiedAt` timestamp NULL,
  ADD COLUMN `phone2ClassifiedAt` timestamp NULL,
  ADD COLUMN `phone3ClassifiedAt` timestamp NULL;

CREATE TABLE `phone_intelligence_cache` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `phone` varchar(20) NOT NULL,
  `lineType` enum('mobile','landline','voip','unknown') NOT NULL DEFAULT 'unknown',
  `activityScore` int,
  `carrier` varchar(255),
  `isValid` boolean,
  `classifiedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `phone_intelligence_cache_user_phone` (`userId`, `phone`)
);

CREATE TABLE `phone_classification_jobs` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `listId` int NOT NULL,
  `status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  `totalPhones` int NOT NULL,
  `processedPhones` int NOT NULL DEFAULT 0,
  `estimatedCost` float NOT NULL,
  `error` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completedAt` timestamp NULL
);
