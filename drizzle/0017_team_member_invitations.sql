CREATE TABLE IF NOT EXISTS `team_members` (
  `id` int AUTO_INCREMENT NOT NULL,
  `ownerUserId` int NOT NULL,
  `memberUserId` int NOT NULL,
  `membershipKey` varchar(128) NOT NULL,
  `role` enum('messenger_va') NOT NULL DEFAULT 'messenger_va',
  `status` enum('active','revoked') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revokedAt` timestamp NULL,
  CONSTRAINT `team_members_id` PRIMARY KEY(`id`),
  CONSTRAINT `team_members_membershipKey_unique` UNIQUE(`membershipKey`)
);
CREATE TABLE IF NOT EXISTS `team_invitations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `ownerUserId` int NOT NULL,
  `email` varchar(320) NOT NULL,
  `role` enum('messenger_va') NOT NULL DEFAULT 'messenger_va',
  `token` varchar(128) NOT NULL,
  `status` enum('pending','accepted','revoked','expired') NOT NULL DEFAULT 'pending',
  `expiresAt` timestamp NOT NULL,
  `acceptedByUserId` int,
  `acceptedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `team_invitations_id` PRIMARY KEY(`id`),
  CONSTRAINT `team_invitations_token_unique` UNIQUE(`token`)
);
