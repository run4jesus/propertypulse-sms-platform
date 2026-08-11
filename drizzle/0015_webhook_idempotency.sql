ALTER TABLE `messages`
  ADD CONSTRAINT `messages_twilioSid_unique` UNIQUE(`twilioSid`);
