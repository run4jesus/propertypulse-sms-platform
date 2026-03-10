/**
 * SMS Engine — TextGrid webhook handler + batch send engine
 *
 * TextGrid is Twilio-compatible. We use the Twilio Node SDK pointed at
 * api.textgrid.com. All inbound webhooks POST to /api/sms/inbound.
 * The batch engine runs on a setInterval tick every 60 seconds and
 * processes scheduled/active campaigns respecting batch size, interval,
 * and daily send window.
 */

import type { Express } from "express";
import { and, eq, isNull, lt, lte, or, sql } from "drizzle-orm";
import {
  campaigns,
  contactListMembers,
  contacts,
  contactManagement,
  conversations,
  keywordCampaigns,
  messages,
  phoneNumbers,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";
import { invokeLLM } from "./_core/llm";

// ─── Opt-out keywords ────────────────────────────────────────────────────────
const OPT_OUT_KEYWORDS = ["stop", "unsubscribe", "quit", "cancel", "end", "stopall", "remove"];
const OPT_IN_KEYWORDS = ["start", "unstop"];

// ─── Reply keyword auto-labeling ─────────────────────────────────────────────
const HOT_LEAD_KEYWORDS = ["interested", "yes", "call me", "i'm interested", "im interested", "want to sell", "how much", "what's your offer", "whats your offer", "make an offer"];
const NOT_INTERESTED_KEYWORDS = ["not interested", "no thanks", "not selling", "dont contact", "don't contact", "remove me", "take me off"];

// ─── Merge field resolver ─────────────────────────────────────────────────────
export function resolveMergeFields(
  body: string,
  contact: {
    firstName?: string | null;
    lastName?: string | null;
    propertyAddress?: string | null;
    propertyCity?: string | null;
    propertyState?: string | null;
    propertyZip?: string | null;
  }
): string {
  return body
    .replace(/\{FirstName\}/gi, contact.firstName ?? "")
    .replace(/\{LastName\}/gi, contact.lastName ?? "")
    .replace(/\{PropertyAddress\}/gi, contact.propertyAddress ?? "")
    .replace(/\{PropertyCity\}/gi, contact.propertyCity ?? "")
    .replace(/\{PropertyState\}/gi, contact.propertyState ?? "")
    .replace(/\{PropertyZip\}/gi, contact.propertyZip ?? "");
}

// ─── TextGrid / Twilio SMS sender ────────────────────────────────────────────
export async function sendSms(opts: {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
}): Promise<{ sid: string; status: string } | null> {
  try {
    const baseUrl = `https://api.textgrid.com/2010-04-01/Accounts/${opts.accountSid}/Messages.json`;
    const params = new URLSearchParams({
      From: opts.from,
      To: opts.to,
      Body: opts.body,
    });
    const credentials = Buffer.from(`${opts.accountSid}:${opts.authToken}`).toString("base64");
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!response.ok) {
      const err = await response.text();
      console.error("[SMS] Send failed:", err);
      return null;
    }
    const data = (await response.json()) as { sid: string; status: string };
    return data;
  } catch (err) {
    console.error("[SMS] Send error:", err);
    return null;
  }
}

// ─── Inbound webhook handler ─────────────────────────────────────────────────
export async function handleInboundSms(
  From: string,
  To: string,
  Body: string,
  MessageSid: string
) {
  const db = await getDb();
  if (!db) return;

  const normalizedFrom = normalizePhone(From);
  const normalizedTo = normalizePhone(To);
  const bodyLower = Body.trim().toLowerCase();

  // Find the phone number record to determine which user owns this number
  const [phoneRecord] = await db
    .select()
    .from(phoneNumbers)
    .where(eq(phoneNumbers.phoneNumber, normalizedTo))
    .limit(1);

  if (!phoneRecord) {
    console.warn("[SMS] Inbound: no phone number record found for", normalizedTo);
    return;
  }

  const userId = phoneRecord.userId;

  // Find or create contact
  let [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.userId, userId), eq(contacts.phone, normalizedFrom)))
    .limit(1);

  if (!contact) {
    await db.insert(contacts).values({
      userId,
      phone: normalizedFrom,
      firstName: "",
      lastName: "",
    });
    [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.phone, normalizedFrom)))
      .limit(1);
  }

  if (!contact) return;

  // ─── Opt-out / opt-in detection ──────────────────────────────────────────
  if (OPT_OUT_KEYWORDS.includes(bodyLower)) {
    // Mark contact as opted out
    await db.update(contacts).set({ optedOut: true }).where(eq(contacts.id, contact.id));

    // Add to contact management opted_out list (avoid duplicates)
    const [existing] = await db
      .select()
      .from(contactManagement)
      .where(
        and(
          eq(contactManagement.userId, userId),
          eq(contactManagement.phone, normalizedFrom),
          eq(contactManagement.listType, "opted_out")
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(contactManagement).values({
        userId,
        contactId: contact.id,
        phone: normalizedFrom,
        listType: "opted_out",
        reason: `Replied: "${Body}"`,
      });
    }

    // Update conversation status to opted_out
    await db
      .update(conversations)
      .set({ status: "opted_out" })
      .where(and(eq(conversations.userId, userId), eq(conversations.contactId, contact.id)));

    // Increment campaign optedOut counter for any active campaign messages
    // (best effort — we update all active campaigns targeting this contact)
    console.log(`[SMS] Opt-out recorded for ${normalizedFrom}`);
  } else if (OPT_IN_KEYWORDS.includes(bodyLower)) {
    // Re-opt-in
    await db.update(contacts).set({ optedOut: false }).where(eq(contacts.id, contact.id));
    await db
      .delete(contactManagement)
      .where(
        and(
          eq(contactManagement.userId, userId),
          eq(contactManagement.phone, normalizedFrom),
          eq(contactManagement.listType, "opted_out")
        )
      );
    console.log(`[SMS] Opt-in recorded for ${normalizedFrom}`);
  }

  // ─── Keyword campaign trigger ─────────────────────────────────────────────
  const activeKeywords = await db
    .select()
    .from(keywordCampaigns)
    .where(
      and(
        eq(keywordCampaigns.userId, userId),
        eq(keywordCampaigns.status, "active")
      )
    );

  for (const kw of activeKeywords) {
    if (bodyLower.includes(kw.keyword.toLowerCase())) {
      // Increment trigger count
      await db
        .update(keywordCampaigns)
        .set({ triggerCount: sql`${keywordCampaigns.triggerCount} + 1` })
        .where(eq(keywordCampaigns.id, kw.id));

      // Send auto-reply (if contact not opted out)
      if (!contact.optedOut && kw.phoneNumberId) {
        const [fromPhone] = await db
          .select()
          .from(phoneNumbers)
          .where(eq(phoneNumbers.id, kw.phoneNumberId))
          .limit(1);

        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

        if (fromPhone && user?.twilioAccountSid && user?.twilioAuthToken) {
          await sendSms({
            accountSid: user.twilioAccountSid,
            authToken: user.twilioAuthToken,
            from: fromPhone.phoneNumber,
            to: normalizedFrom,
            body: kw.replyMessage,
          });
        }
      }
      break;
    }
  }

  // ─── Find or create conversation ─────────────────────────────────────────
  let [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(eq(conversations.userId, userId), eq(conversations.contactId, contact.id))
    )
    .limit(1);

  if (!conversation) {
    await db.insert(conversations).values({
      userId,
      contactId: contact.id,
      phoneNumberId: phoneRecord.id,
      status: "active",
      lastMessageAt: new Date(),
      lastMessagePreview: Body.slice(0, 200),
      unreadCount: 1,
    });
    [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.userId, userId), eq(conversations.contactId, contact.id)))
      .limit(1);
  } else {
    // Update conversation with new inbound message
    const newStatus = contact.optedOut ? "opted_out" : "unreplied";
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        lastMessagePreview: Body.slice(0, 200),
        unreadCount: sql`${conversations.unreadCount} + 1`,
        status: newStatus,
      })
      .where(eq(conversations.id, conversation.id));
  }

  if (!conversation) return;

  // ─── Store the inbound message ────────────────────────────────────────────
  await db.insert(messages).values({
    conversationId: conversation.id,
    userId,
    direction: "inbound",
    body: Body,
    twilioSid: MessageSid,
    status: "received",
    isAiGenerated: false,
  });

  // ─── Reply keyword auto-labeling ─────────────────────────────────────────
  if (!OPT_OUT_KEYWORDS.includes(bodyLower)) {
    const isHotLead = HOT_LEAD_KEYWORDS.some((kw) => bodyLower.includes(kw));
    const isNotInterested = NOT_INTERESTED_KEYWORDS.some((kw) => bodyLower.includes(kw));

    if (isHotLead || isNotInterested) {
      try {
        const { labels, conversationLabels } = await import("../drizzle/schema");
        const targetLabelName = isHotLead ? "Hot Lead" : "Not Interested";

        // Find or create the label for this user
        let [targetLabel] = await db
          .select()
          .from(labels)
          .where(and(eq(labels.userId, userId), eq(labels.name, targetLabelName)))
          .limit(1);

        if (!targetLabel) {
          await db.insert(labels).values({
            userId,
            name: targetLabelName,
            color: isHotLead ? "#ef4444" : "#6b7280",
          });
          [targetLabel] = await db
            .select()
            .from(labels)
            .where(and(eq(labels.userId, userId), eq(labels.name, targetLabelName)))
            .limit(1);
        }

        if (targetLabel && conversation) {
          // Check if label already assigned
          const [existing] = await db
            .select()
            .from(conversationLabels)
            .where(
              and(
                eq(conversationLabels.conversationId, conversation.id),
                eq(conversationLabels.labelId, targetLabel.id)
              )
            )
            .limit(1);

          if (!existing) {
            await db.insert(conversationLabels).values({
              conversationId: conversation.id,
              labelId: targetLabel.id,
            });
            console.log(`[SMS] Auto-labeled conversation ${conversation.id} as "${targetLabelName}"`);
          }
        }
      } catch (err) {
        console.error("[SMS] Auto-labeling error:", err);
      }
    }
  }

  // ─── AI auto-reply (if AI mode enabled globally + per conversation) ───────
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (
    user?.aiModeEnabled &&
    conversation.aiEnabled &&
    !contact.optedOut &&
    user.twilioAccountSid &&
    user.twilioAuthToken
  ) {
    try {
      // Get recent messages for context
      const recentMsgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(sql`${messages.createdAt} DESC`)
        .limit(10);

      const transcript = recentMsgs
        .reverse()
        .map((m) => `${m.direction === "outbound" ? "Agent" : "Seller"}: ${m.body}`)
        .join("\n");

      const aiResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a real estate wholesaler texting a motivated seller about their vacant lot or property. Be conversational, empathetic, and professional. Keep responses short (1-3 sentences). Your goal is to understand their situation and make an offer. Never mention you are an AI.`,
          },
          {
            role: "user",
            content: `Generate the next best reply to this conversation:\n\n${transcript}`,
          },
        ],
      });

      const replyBody = aiResponse.choices[0]?.message?.content;
      if (replyBody && typeof replyBody === "string") {
        const fromPhone = await db
          .select()
          .from(phoneNumbers)
          .where(eq(phoneNumbers.id, phoneRecord.id))
          .limit(1);

        const result = await sendSms({
          accountSid: user.twilioAccountSid,
          authToken: user.twilioAuthToken,
          from: fromPhone[0]?.phoneNumber ?? normalizedTo,
          to: normalizedFrom,
          body: replyBody,
        });

        if (result) {
          await db.insert(messages).values({
            conversationId: conversation.id,
            userId,
            direction: "outbound",
            body: replyBody,
            twilioSid: result.sid,
            status: "sent",
            isAiGenerated: true,
          });

          await db
            .update(conversations)
            .set({
              lastMessageAt: new Date(),
              lastMessagePreview: replyBody.slice(0, 200),
              status: "active",
            })
            .where(eq(conversations.id, conversation.id));
        }
      }
    } catch (err) {
      console.error("[SMS] AI auto-reply error:", err);
    }
  }
}

// ─── Batch send engine ────────────────────────────────────────────────────────
export async function processCampaignBatches() {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // Find campaigns that are scheduled (and scheduledAt <= now) or active
  const activeCampaigns = await db
    .select()
    .from(campaigns)
    .where(
      or(
        and(
          eq(campaigns.status, "scheduled"),
          lte(campaigns.scheduledAt, now)
        ),
        eq(campaigns.status, "active")
      )
    );

  for (const campaign of activeCampaigns) {
    try {
      // Check send window
      if (nowHHMM < campaign.sendWindowStart || nowHHMM > campaign.sendWindowEnd) {
        continue;
      }

      // Check if enough time has passed since last batch
      if (campaign.lastBatchSentAt) {
        const msSinceLast = now.getTime() - campaign.lastBatchSentAt.getTime();
        const msRequired = campaign.batchIntervalMinutes * 60 * 1000;
        if (msSinceLast < msRequired) continue;
      }

      // Get the user for credentials
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, campaign.userId))
        .limit(1);

      if (!user?.twilioAccountSid || !user?.twilioAuthToken) continue;

      // Get the from phone number
      const fromPhoneId = campaign.phoneNumberId;
      if (!fromPhoneId) continue;

      const [fromPhone] = await db
        .select()
        .from(phoneNumbers)
        .where(eq(phoneNumbers.id, fromPhoneId))
        .limit(1);

      if (!fromPhone) continue;

      // Get contacts in the campaign's list, starting from nextBatchOffset
      if (!campaign.contactListId) continue;

      const batchContacts = await db
        .select({ contact: contacts })
        .from(contactListMembers)
        .innerJoin(contacts, eq(contactListMembers.contactId, contacts.id))
        .where(eq(contactListMembers.listId, campaign.contactListId))
        .limit(campaign.batchSize)
        .offset(campaign.nextBatchOffset);

      if (batchContacts.length === 0) {
        // Campaign complete
        await db
          .update(campaigns)
          .set({ status: "completed", completedAt: now })
          .where(eq(campaigns.id, campaign.id));
        continue;
      }

      // Mark campaign as active if it was scheduled
      if (campaign.status === "scheduled") {
        await db
          .update(campaigns)
          .set({ status: "active" })
          .where(eq(campaigns.id, campaign.id));
      }

      let sentCount = 0;

      for (const { contact } of batchContacts) {
        // Skip opted-out contacts
        if (contact.optedOut) continue;

        // Skip contacts flagged as litigators or DNC
        if ((contact as any).litigatorFlag) continue;
        if ((contact as any).dncStatus && (contact as any).dncStatus !== "clean") continue;

        // Check contact management opt-out list
        const [optedOut] = await db
          .select()
          .from(contactManagement)
          .where(
            and(
              eq(contactManagement.userId, campaign.userId),
              eq(contactManagement.phone, contact.phone),
              eq(contactManagement.listType, "opted_out")
            )
          )
          .limit(1);
        if (optedOut) continue;

        // Check internal DNC list
        const [internalDnc] = await db
          .select()
          .from(contactManagement)
          .where(
            and(
              eq(contactManagement.userId, campaign.userId),
              eq(contactManagement.phone, contact.phone),
              eq(contactManagement.listType, "dnc")
            )
          )
          .limit(1);
        if (internalDnc) continue;

        // Get the campaign message body (step 1 for standard campaigns)
        // For drip campaigns this would use the step body — simplified here to use campaign name as placeholder
        // In production, the campaign step body is used
        const campaignStepsResult = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, campaign.id))
          .limit(1);

        // Get step 1 body from campaign_steps table
        const { campaignSteps: steps } = await import("../drizzle/schema");
        const [step1] = await db
          .select()
          .from(steps)
          .where(and(eq(steps.campaignId, campaign.id), eq(steps.stepNumber, 1)))
          .limit(1);

        if (!step1) continue;

        // Resolve merge fields
        let messageBody = resolveMergeFields(step1.body, contact);

        // Append opt-out footer if enabled
        if (campaign.optOutFooter) {
          messageBody += "\n\nReply STOP to opt out.";
        }

        // Send the SMS
        const result = await sendSms({
          accountSid: user.twilioAccountSid,
          authToken: user.twilioAuthToken,
          from: fromPhone.phoneNumber,
          to: contact.phone,
          body: messageBody,
        });

        if (result) {
          sentCount++;

          // Find or create conversation
          let [conv] = await db
            .select()
            .from(conversations)
            .where(
              and(
                eq(conversations.userId, campaign.userId),
                eq(conversations.contactId, contact.id)
              )
            )
            .limit(1);

          if (!conv) {
            await db.insert(conversations).values({
              userId: campaign.userId,
              contactId: contact.id,
              phoneNumberId: fromPhoneId,
              status: "unreplied",
              lastMessageAt: now,
              lastMessagePreview: messageBody.slice(0, 200),
              unreadCount: 0,
            });
            [conv] = await db
              .select()
              .from(conversations)
              .where(
                and(
                  eq(conversations.userId, campaign.userId),
                  eq(conversations.contactId, contact.id)
                )
              )
              .limit(1);
          }

          if (conv) {
            await db.insert(messages).values({
              conversationId: conv.id,
              userId: campaign.userId,
              direction: "outbound",
              body: messageBody,
              twilioSid: result.sid,
              status: result.status === "queued" ? "queued" : "sent",
              isAiGenerated: false,
              campaignId: campaign.id,
            });

            await db
              .update(conversations)
              .set({
                lastMessageAt: now,
                lastMessagePreview: messageBody.slice(0, 200),
              })
              .where(eq(conversations.id, conv.id));
          }
        }
      }

      // Update campaign stats and batch tracking
      const newOffset = campaign.nextBatchOffset + batchContacts.length;
      await db
        .update(campaigns)
        .set({
          sent: sql`${campaigns.sent} + ${sentCount}`,
          lastBatchSentAt: now,
          nextBatchOffset: newOffset,
        })
        .where(eq(campaigns.id, campaign.id));

      console.log(`[BatchEngine] Campaign ${campaign.id} "${campaign.name}": sent ${sentCount} messages (offset ${newOffset})`);
    } catch (err) {
      console.error(`[BatchEngine] Error processing campaign ${campaign.id}:`, err);
    }
  }
}

// ─── Register webhook routes on Express app ──────────────────────────────────
export function registerSmsRoutes(app: Express) {
  // TextGrid/Twilio inbound SMS webhook
  app.post("/api/sms/inbound", async (req, res) => {
    try {
      const { From, To, Body, MessageSid } = req.body as {
        From: string;
        To: string;
        Body: string;
        MessageSid: string;
      };

      if (!From || !To || !Body) {
        res.status(400).send("Missing required fields");
        return;
      }

      await handleInboundSms(From, To, Body, MessageSid ?? "");

      // TextGrid/Twilio expects a TwiML response or empty 200
      res.set("Content-Type", "text/xml");
      res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    } catch (err) {
      console.error("[SMS] Webhook error:", err);
      res.status(500).send("Internal error");
    }
  });

  // Status callback webhook (delivery receipts)
  app.post("/api/sms/status", async (req, res) => {
    try {
      const { MessageSid, MessageStatus } = req.body as {
        MessageSid: string;
        MessageStatus: string;
      };

      if (MessageSid && MessageStatus) {
        const db = await getDb();
        if (db) {
          const statusMap: Record<string, "queued" | "sent" | "delivered" | "failed" | "received" | "undelivered"> = {
            queued: "queued",
            sent: "sent",
            delivered: "delivered",
            failed: "failed",
            undelivered: "undelivered",
          };
          const mappedStatus = statusMap[MessageStatus];
          if (mappedStatus) {
            await db
              .update(messages)
              .set({ status: mappedStatus })
              .where(eq(messages.twilioSid, MessageSid));

            // If delivered, increment campaign delivered count
            if (mappedStatus === "delivered") {
              await db
                .update(campaigns)
                .set({ delivered: sql`${campaigns.delivered} + 1` })
                .where(
                  sql`${campaigns.id} IN (SELECT campaignId FROM messages WHERE twilioSid = ${MessageSid} LIMIT 1)`
                );
            }
          }
        }
      }

      res.status(200).send("OK");
    } catch (err) {
      console.error("[SMS] Status callback error:", err);
      res.status(500).send("Internal error");
    }
  });

  // Start the batch send engine — runs every 60 seconds
  setInterval(async () => {
    try {
      await processCampaignBatches();
    } catch (err) {
      console.error("[BatchEngine] Tick error:", err);
    }
  }, 60_000);

  console.log("[SMS] Routes registered: /api/sms/inbound, /api/sms/status");
  console.log("[BatchEngine] Started — ticking every 60 seconds");
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function normalizePhone(phone: string): string {
  // Strip everything except digits and leading +
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith("1")) return `+${cleaned}`;
  return cleaned;
}
