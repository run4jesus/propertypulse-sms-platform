ALTER TABLE `team_members`
  MODIFY COLUMN `role` enum('workspace_admin','messenger_va') NOT NULL DEFAULT 'messenger_va';
ALTER TABLE `team_invitations`
  MODIFY COLUMN `role` enum('workspace_admin','messenger_va') NOT NULL DEFAULT 'messenger_va';
