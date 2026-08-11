import { randomUUID } from "crypto";
import { and, eq, lt, lte, sql } from "drizzle-orm";
import {
  aiReplyQueue,
  contacts,
  conversations,
  messages,
  phoneNumbers,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";
import { sendTextGridSms } from "./textgrid";

export type AiReplyStage = "intro" | "price_ask" | "needs_offer" | "handoff" | "not_interested";

type ReplyUser = Pick<
  typeof users.$inferSelect,
  | "id"
  | "aiTimezone"
  | "aiHoursStart"
  | "aiHoursEnd"
  | "aiReplyDelayFirstMin"
  | "aiReplyDelayFirstMax"
  | "aiReplyDelayFollowMin"
  | "aiReplyDelayFollowMax"
>;

export function isWithinBusinessHours(user: ReplyUser, now = new Date()): boolean {
  const timezone = user.aiTimezone ?? "America/Chicago";
  const startHour = user.aiHoursStart ?? 8;
  const endHour = user.aiHoursEnd ?? 20;
  const currentHour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(now),
    10
  );

  return startHour <= endHour
    ? currentHour >= startHour && currentHour < endHour
    : currentHour >= startHour || currentHour < endHour;
}

export function getRandomReplyDelayMs(user: ReplyUser, isFirstReply: boolean): number {
  const configuredMin = isFirstReply
    ? (user.aiReplyDelayFirstMin ?? 2)
    : (user.aiReplyDelayFollowMin ?? 2);
  const configuredMax = isFirstReply
    ? (user.aiReplyDelayFirstMax ?? 6)
    : (user.aiReplyDelayFollowMax ?? 6);
  const min = Math.max(0, Math.min(configuredMin, configuredMax));
  const max = Math.max(0, Math.max(configuredMin, configuredMax));
  return (Math.floor(Math.random() * (max - min + 1)) + min) * 60 * 1000;
}

/** Persist a reply before it is sent. Provider message IDs make enqueueing idempotent. */
export async function queueAiReply(input: {
  user: typeof users.$inferSelect;
  conversation: typeof conversations.$inferSelect;
  contact: typeof contacts.$inferSelect;
  phoneNumberId: number | null;
  sourceMessageSid: string;
  replyBody: string;
  nextStage: AiReplyStage;
  isFirstReply: boolean;
}): Promise<{ queued: boolean; scheduledAt?: Date }> {
  const db = await getDb();
  if (!db || !input.sourceMessageSid) {
    console.warn("[AIQueue] Reply not queued because the inbound provider message ID is missing");
    return { queued: false };
  }

  const now = new Date();
  const awaitingBusinessHours = !isWithinBusinessHours(input.user, now);
  const scheduledAt = awaitingBusinessHours
    ? now
    : new Date(now.getTime() + getRandomReplyDelayMs(input.user, input.isFirstReply));
  const dedupeKey = `ai-reply:${input.user.id}:${input.conversation.id}:${input.sourceMessageSid}`;

  try {
    await db.insert(aiReplyQueue).values({
      userId: input.user.id,
      conversationId: input.conversation.id,
      contactId: input.contact.id,
      phoneNumberId: input.phoneNumberId,
      sourceMessageSid: input.sourceMessageSid,
      dedupeKey,
      replyBody: input.replyBody,
      nextStage: input.nextStage,
      scheduledAt,
      awaitingBusinessHours,
      status: "pending",
    });
    console.log(`[AIQueue] Queued reply for conversation ${input.conversation.id} at ${scheduledAt.toISOString()}`);
    return { queued: true, scheduledAt };
  } catch (error: any) {
    // The unique dedupe key means provider retries cannot schedule a second reply.
    if (String(error?.message ?? "").toLowerCase().includes("duplicate")) {
      console.warn(`[AIQueue] Ignored duplicate provider event: ${dedupeKey}`);
      return { queued: false };
    }
    throw error;
  }
}

/**
 * Processes a small batch of due queue rows. Rows are atomically claimed before
 * sending. Failures stay visible for manual review instead of risking duplicate SMS.
 */
export async function processAiReplyQueue(): Promise<{
  sent: number;
  deferred: number;
  cancelled: number;
  failed: number;
}> {
  const db = await getDb();
  if (!db) return { sent: 0, deferred: 0, cancelled: 0, failed: 0 };

  const now = new Date();
  const counts = { sent: 0, deferred: 0, cancelled: 0, failed: 0 };

  // An expired processing lease is ambiguous: an old worker could have reached
  // TextGrid before it stopped. Flag it for review instead of auto-resending.
  const staleCutoff = new Date(now.getTime() - 10 * 60 * 1000);
  await db.update(aiReplyQueue).set({
    status: "failed",
    lastError: "Processing lease expired before completion. Review before resending.",
  }).where(and(
    eq(aiReplyQueue.status, "processing"),
    lt(aiReplyQueue.lockedAt, staleCutoff)
  ));

  const dueItems = await db.select().from(aiReplyQueue).where(and(
    eq(aiReplyQueue.status, "pending"),
    lte(aiReplyQueue.scheduledAt, now)
  )).limit(25);

  for (const item of dueItems) {
    const [user] = await db.select().from(users).where(eq(users.id, item.userId)).limit(1);
    if (!user) {
      await db.update(aiReplyQueue).set({ status: "cancelled", lastError: "Owning user not found" })
        .where(eq(aiReplyQueue.id, item.id));
      counts.cancelled++;
      continue;
    }

    // Messages received after hours wait silently until the user's next business window.
    if (item.awaitingBusinessHours) {
      if (!isWithinBusinessHours(user, now)) continue;
      const [priorAiReply] = await db.select({ id: messages.id }).from(messages).where(and(
        eq(messages.conversationId, item.conversationId),
        eq(messages.isAiGenerated, true)
      )).limit(1);
      await db.update(aiReplyQueue).set({
        awaitingBusinessHours: false,
        scheduledAt: new Date(now.getTime() + getRandomReplyDelayMs(user, !priorAiReply)),
      }).where(and(eq(aiReplyQueue.id, item.id), eq(aiReplyQueue.status, "pending")));
      counts.deferred++;
      continue;
    }

    if (!isWithinBusinessHours(user, now)) {
      await db.update(aiReplyQueue).set({ awaitingBusinessHours: true })
        .where(and(eq(aiReplyQueue.id, item.id), eq(aiReplyQueue.status, "pending")));
      counts.deferred++;
      continue;
    }

    const lockToken = randomUUID();
    const claim = await db.update(aiReplyQueue).set({
      status: "processing",
      lockToken,
      lockedAt: now,
      attemptCount: sql`${aiReplyQueue.attemptCount} + 1`,
    }).where(and(
      eq(aiReplyQueue.id, item.id),
      eq(aiReplyQueue.status, "pending"),
      lte(aiReplyQueue.scheduledAt, now)
    ));
    const affectedRows = (claim as any)[0]?.affectedRows ?? (claim as any).affectedRows ?? 0;
    if (affectedRows !== 1) continue;

    try {
      const [conversation] = await db.select().from(conversations).where(and(
        eq(conversations.id, item.conversationId),
        eq(conversations.userId, item.userId)
      )).limit(1);
      const [contact] = await db.select().from(contacts).where(and(
        eq(contacts.id, item.contactId),
        eq(contacts.userId, item.userId)
      )).limit(1);
      const [phoneRecord] = await db.select().from(phoneNumbers).where(and(
        eq(phoneNumbers.id, item.phoneNumberId ?? 0),
        eq(phoneNumbers.userId, item.userId)
      )).limit(1);
      const [latestMessage] = await db.select().from(messages)
        .where(eq(messages.conversationId, item.conversationId))
        .orderBy(sql`${messages.createdAt} DESC`, sql`${messages.id} DESC`)
        .limit(1);

      const terminalStage = conversation?.aiStage === "needs_offer" || conversation?.aiStage === "handoff" || conversation?.aiStage === "not_interested";
      const shouldCancel = !conversation || !contact || !phoneRecord || !user.aiModeEnabled || !conversation.aiEnabled || conversation.aiPaused || contact.optedOut || terminalStage || latestMessage?.direction !== "inbound" || latestMessage?.twilioSid !== item.sourceMessageSid;
      if (shouldCancel) {
        await db.update(aiReplyQueue).set({
          status: "cancelled",
          lastError: "Conversation changed, AI was paused/disabled, or contact became suppressed before send",
        }).where(and(eq(aiReplyQueue.id, item.id), eq(aiReplyQueue.lockToken, lockToken)));
        counts.cancelled++;
        continue;
      }

      if (!user.twilioAccountSid || !user.twilioAuthToken) {
        await db.update(aiReplyQueue).set({ status: "failed", lastError: "TextGrid credentials are not configured" })
          .where(and(eq(aiReplyQueue.id, item.id), eq(aiReplyQueue.lockToken, lockToken)));
        counts.failed++;
        continue;
      }

      const providerResult = await sendTextGridSms({
        accountSid: user.twilioAccountSid,
        authToken: user.twilioAuthToken,
        from: phoneRecord.phoneNumber,
        to: contact.phone,
        body: item.replyBody,
      });

      if (!providerResult) {
        await db.update(aiReplyQueue).set({
          status: "failed",
          lastError: "TextGrid did not return a provider confirmation. Review before resending.",
        }).where(and(eq(aiReplyQueue.id, item.id), eq(aiReplyQueue.lockToken, lockToken)));
        counts.failed++;
        continue;
      }

      await db.insert(messages).values({
        conversationId: conversation.id,
        userId: item.userId,
        direction: "outbound",
        body: item.replyBody,
        twilioSid: providerResult.sid,
        status: "sent",
        isAiGenerated: true,
      });
      await db.update(conversations).set({
        lastMessageAt: new Date(),
        lastMessagePreview: item.replyBody.slice(0, 200),
        status: "active",
        aiStage: item.nextStage,
      }).where(eq(conversations.id, conversation.id));
      await db.update(aiReplyQueue).set({
        status: "sent",
        sentAt: new Date(),
        providerSid: providerResult.sid,
        lastError: null,
      }).where(and(eq(aiReplyQueue.id, item.id), eq(aiReplyQueue.lockToken, lockToken)));
      counts.sent++;
    } catch (error: any) {
      console.error(`[AIQueue] Failed processing item ${item.id}:`, error);
      await db.update(aiReplyQueue).set({
        status: "failed",
        lastError: String(error?.message ?? "Unknown queue processing failure").slice(0, 2000),
      }).where(and(eq(aiReplyQueue.id, item.id), eq(aiReplyQueue.lockToken, lockToken)));
      counts.failed++;
    }
  }

  return counts;
}
