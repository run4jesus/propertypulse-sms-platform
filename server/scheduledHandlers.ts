/**
 * Scheduled handler: after-hours AI follow-up
 *
 * Fires daily at the user's configured business hours start time.
 * Finds all conversations where:
 *   - AI is enabled (globally + per conversation)
 *   - The last message is inbound (from seller) and was received outside business hours
 *   - The conversation stage is not terminal (needs_offer / not_interested / handoff)
 * Then triggers the AI to respond as if the message just arrived.
 */
import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { conversations, messages, contacts, users, phoneNumbers } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { handleInboundSms } from "./smsEngine";

export async function afterHoursFollowUpHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!(user as any).isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) return res.json({ ok: true, skipped: "no-db" });

    // Find all users with AI mode enabled
    const aiUsers = await db
      .select()
      .from(users)
      .where(eq(users.aiModeEnabled, true));

    let processed = 0;
    let skipped = 0;

    for (const aiUser of aiUsers) {
      // Check if we're currently within business hours for this user
      const tz = (aiUser as any).aiTimezone ?? "America/Chicago";
      const startHour = (aiUser as any).aiHoursStart ?? 8;
      const endHour = (aiUser as any).aiHoursEnd ?? 20;
      const currentHour = parseInt(
        new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          hour: "numeric",
          hour12: false,
        }).format(new Date()),
        10
      );

      // Only run within the first hour of business hours opening
      if (currentHour < startHour || currentHour >= startHour + 1) {
        skipped++;
        continue;
      }

      // Find conversations where last message is inbound and unanswered
      const pendingConvs = await db
        .select({ conv: conversations })
        .from(conversations)
        .where(and(
          eq(conversations.userId, aiUser.id),
          eq(conversations.aiEnabled, true),
          sql`${conversations.aiStage} NOT IN ('needs_offer', 'not_interested', 'handoff')`
        ));

      for (const { conv } of pendingConvs) {
        // Get the last message in this conversation
        const [lastMsg] = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        if (!lastMsg) continue;
        // Only follow up if last message was inbound (from seller) and received outside business hours
        if (lastMsg.direction !== "inbound") continue;

        // Check if the message was received outside business hours
        const msgHour = parseInt(
          new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            hour: "numeric",
            hour12: false,
          }).format(new Date(lastMsg.createdAt)),
          10
        );
        const wasOutsideHours = msgHour < startHour || msgHour >= endHour;
        if (!wasOutsideHours) continue;

        // Get the phone number this conversation is on
        const [phoneRec] = await db
          .select()
          .from(phoneNumbers)
          .where(eq(phoneNumbers.id, conv.phoneNumberId ?? 0))
          .limit(1);
        if (!phoneRec) continue;

        // Get the contact
        const [contact] = await db
          .select()
          .from(contacts)
          .where(eq(contacts.id, conv.contactId))
          .limit(1);
        if (!contact) continue;

        // Re-trigger the AI response by calling handleInboundSms with the last message
        // This will go through the full AI pipeline including stage checks
        try {
          await handleInboundSms(
            contact.phone,
            phoneRec.phoneNumber,
            lastMsg.body,
            lastMsg.twilioSid ?? `after-hours-${lastMsg.id}`
          );
          processed++;
          console.log(`[AfterHours] Triggered AI follow-up for conversation ${conv.id}`);
        } catch (err) {
          console.error(`[AfterHours] Failed to trigger AI for conversation ${conv.id}:`, err);
        }
      }
    }

    return res.json({ ok: true, processed, skipped });
  } catch (err: any) {
    console.error("[AfterHours] Handler error:", err);
    return res.status(500).json({ error: err.message, stack: err.stack, timestamp: new Date().toISOString() });
  }
}
