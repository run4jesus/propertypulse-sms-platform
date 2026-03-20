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
  litigatorNumbers,
  messages,
  phoneNumbers,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";
import { invokeLLM } from "./_core/llm";
import { lookupPropertyValue, formatDollars } from "./dealmachine";

// ─── Opt-out keywords ────────────────────────────────────────────────────────
const OPT_OUT_KEYWORDS = ["stop", "unsubscribe", "quit", "cancel", "end", "stopall", "remove"];
const OPT_IN_KEYWORDS = ["start", "unstop"];

// ─── LLM-based intent classification ────────────────────────────────────────
// Framework: intro → yes/no → price extraction → warm lead handoff
// Hot Lead is DISABLED — all qualified leads go to Warm Lead only.
// Returns: 'warm_lead' | 'not_interested' | 'neutral'
async function classifyInboundIntent(
  transcript: string,
  latestMessage: string
): Promise<"hot_lead" | "warm_lead" | "not_interested" | "neutral"> {
  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a real estate wholesaling lead classifier. Analyze the seller's latest reply and classify their intent.

Conversation framework context:
- The agent texted the seller asking if they'd consider selling their house.
- If the seller says YES or is open to it, the agent asks what price they have in mind.
- If the seller gives a price OR says "make me an offer" / refuses to give a price but is still open, they are a WARM LEAD.
- If the seller says NO, not interested, wrong number, or any clear decline, they are NOT INTERESTED.
- If the seller asks a question, is unclear, or hasn't committed either way, classify as NEUTRAL.

Return ONLY a JSON object with one field: "intent"
Allowed values:
- "warm_lead": seller gave a price, asked for an offer, or is open to selling (even if they haven't given a price yet)
- "not_interested": seller explicitly declines, says no, wrong number, stop texting, or any clear rejection
- "neutral": seller asked a question, is unclear, or hasn't committed either way

NEVER return "hot_lead" — all qualified leads are warm_lead.
When in doubt between warm_lead and neutral, use neutral.
When in doubt between not_interested and neutral, use not_interested only if the decline is explicit and clear.`,
        },
        {
          role: "user",
          content: `Conversation so far:\n${transcript}\n\nLatest seller message: "${latestMessage}"`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "intent_classification",
          strict: true,
          schema: {
            type: "object",
            properties: {
              intent: { type: "string", enum: ["warm_lead", "not_interested", "neutral"] },
            },
            required: ["intent"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = result.choices[0]?.message?.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content) as { intent: string };
      if (["warm_lead", "not_interested", "neutral"].includes(parsed.intent)) {
        // hot_lead is disabled — map to warm_lead if ever returned
        return parsed.intent as "hot_lead" | "warm_lead" | "not_interested" | "neutral";
      }
    }
  } catch (err) {
    console.error("[SMS] LLM classification error, falling back to neutral:", err);
  }
  return "neutral";
}

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

  // ─── LLM-based intent classification + auto-labeling ────────────────────────
  if (!OPT_OUT_KEYWORDS.includes(bodyLower)) {
    try {
      const recentForClassify = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(sql`${messages.createdAt} DESC`)
        .limit(8);
      const classifyTranscript = recentForClassify
        .reverse()
        .map((m) => `${m.direction === "outbound" ? "Agent" : "Seller"}: ${m.body}`)
        .join("\n");

      const intent = await classifyInboundIntent(classifyTranscript, Body);
      const isHotLead = intent === "hot_lead";
      const isWarmLead = intent === "warm_lead";
      const isNotInterested = intent === "not_interested";

      if (isHotLead || isWarmLead || isNotInterested) {
        const { labels, conversationLabels } = await import("../drizzle/schema");
        const targetLabelName = isHotLead ? "Hot Lead" : isWarmLead ? "Warm Lead" : "Not Interested";
        const labelColor = isHotLead ? "#ef4444" : isWarmLead ? "#f97316" : "#6b7280";

        let [targetLabel] = await db
          .select()
          .from(labels)
          .where(and(eq(labels.userId, userId), eq(labels.name, targetLabelName)))
          .limit(1);

        if (!targetLabel) {
          await db.insert(labels).values({ userId, name: targetLabelName, color: labelColor });
          [targetLabel] = await db
            .select()
            .from(labels)
            .where(and(eq(labels.userId, userId), eq(labels.name, targetLabelName)))
            .limit(1);
        }

        if (targetLabel && conversation) {
          const [existing] = await db
            .select()
            .from(conversationLabels)
            .where(and(
              eq(conversationLabels.conversationId, conversation.id),
              eq(conversationLabels.labelId, targetLabel.id)
            ))
            .limit(1);

          if (!existing) {
            await db.insert(conversationLabels).values({
              conversationId: conversation.id,
              labelId: targetLabel.id,
            });
            console.log(`[SMS] LLM classified "${intent}" -> auto-labeled conversation ${conversation.id} as "${targetLabelName}"`);

            if (isHotLead || isWarmLead) {
              try {
                const { notifyOwner } = await import("./_core/notification");
                const contactName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.phone;
                const propAddr = contact.propertyAddress || contact.address || "Address not on file";
                const convUrl = `https://lotpulsesms-zmwera2y.manus.space/messenger?conversationId=${conversation.id}`;
                await notifyOwner({
                  title: `${isHotLead ? "HOT Lead" : "Warm Lead"}: ${contactName}`,
                  content: `Contact: ${contactName}\nPhone: ${contact.phone}\nProperty: ${propAddr}\nLast message: "${Body.slice(0, 120)}"\n\nOpen conversation: ${convUrl}`,
                });
              } catch (notifErr) {
                console.error("[SMS] Lead notification error:", notifErr);
              }
              try {
                const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
                if ((userRow as any)?.podioEnabled) {
                  const { pushLeadToPodio, buildConversationThread } = await import("./podioIntegration");
                  const allMsgs = await db
                    .select()
                    .from(messages)
                    .where(eq(messages.conversationId, conversation.id))
                    .orderBy(messages.createdAt);
                  const thread = buildConversationThread(allMsgs);
                  await pushLeadToPodio({
                    firstName: contact.firstName || "",
                    lastName: contact.lastName || "",
                    phone: contact.phone,
                    propertyAddress: contact.propertyAddress || contact.address || "",
                    temperature: isHotLead ? "HOT" : "Warm",
                    conversationThread: thread,
                    webformUrl: (userRow as any)?.podioWebformUrl || undefined,
                  });
                }
              } catch (podioErr) {
                console.error("[SMS] Podio push error:", podioErr);
              }
            }

            if (isNotInterested) {
              try {
                const { followUpQueue } = await import("../drizzle/schema");
                const [firstOutbound] = await db
                  .select({ campaignId: messages.campaignId })
                  .from(messages)
                  .where(and(
                    eq(messages.conversationId, conversation.id),
                    eq(messages.direction, "outbound")
                  ))
                  .orderBy(messages.id)
                  .limit(1);

                const campaignIdForFollowUp = firstOutbound?.campaignId;
                if (campaignIdForFollowUp) {
                  const [camp] = await db
                    .select()
                    .from(campaigns)
                    .where(eq(campaigns.id, campaignIdForFollowUp))
                    .limit(1);

                  if (camp && (camp as any).followUpEnabled && (camp as any).followUpMessage) {
                    const delayHours = (camp as any).followUpDelayHours ?? 24;
                    const scheduledAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);
                    const [existingFollowUp] = await db
                      .select()
                      .from(followUpQueue)
                      .where(and(
                        eq(followUpQueue.conversationId, conversation.id),
                        eq(followUpQueue.status, "pending")
                      ))
                      .limit(1);

                    if (!existingFollowUp) {
                      await db.insert(followUpQueue).values({
                        userId,
                        campaignId: campaignIdForFollowUp,
                        conversationId: conversation.id,
                        contactId: contact.id,
                        phoneNumberId: conversation.phoneNumberId ?? null,
                        message: (camp as any).followUpMessage,
                        scheduledAt,
                        status: "pending",
                      });
                      console.log(`[SMS] Queued follow-up for conversation ${conversation.id} at ${scheduledAt.toISOString()}`);
                    }
                  }
                }
              } catch (fuErr) {
                console.error("[SMS] Follow-up queue error:", fuErr);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("[SMS] Auto-labeling error:", err);
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
      // ─── Stage-aware playbook ────────────────────────────────────────────────
      // Unified playbook for all campaign types (house and land).
      // Stages: intro → price_ask → needs_offer | not_interested
      // Once we reach 'needs_offer', 'handoff', or 'not_interested', the AI stops.
      const currentStage = (conversation as any).aiStage ?? "intro";

      // If already handed off or marked not-interested, do NOT send another reply
      if (currentStage === "handoff" || currentStage === "not_interested" || currentStage === "needs_offer") {
        console.log(`[SMS] AI skipping reply — conversation ${conversation.id} is in stage "${currentStage}"`);
        return;
      }

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

      // ─── DealMachine property lookup (price_ask stage only) ─────────────────
      // Look up the property value when we're in price_ask or offer_made stage
      // so the AI can make / evaluate offers using real data.
      let propertyInfo: { estimatedValue: number | null; buyPrice: number | null } | null = null;
      if (currentStage === "price_ask" &&
          contact.propertyAddress && contact.propertyCity && contact.propertyState) {
        propertyInfo = await lookupPropertyValue(
          contact.propertyAddress,
          contact.propertyCity,
          contact.propertyState,
          contact.propertyZip ?? ""
        );
        if (propertyInfo) {
          console.log(`[DealMachine] Property lookup for conversation ${conversation.id}: estimatedValue=${propertyInfo.estimatedValue}, buyPrice=${propertyInfo.buyPrice}`);
        }
      }

      const buyPriceFormatted = propertyInfo?.buyPrice ? formatDollars(propertyInfo.buyPrice) : null;

      // ─── Build stage-aware system prompt ────────────────────────────────────
      // Unified playbook — works for both house and land campaigns.
      // AI handles intro → price_ask, then marks needs_offer and stops for VA.
      let stageContext: string;
      if (currentStage === "intro") {
        stageContext = `CURRENT STAGE: intro — the seller just replied to your opening text asking if they'd consider selling.
- If they say YES or are open to selling (even without a price), ask what price they have in mind and set next_stage to "price_ask".
- If they say NO or decline clearly (wrong number, not interested, stop, remove me, etc.), reply with the not-interested goodbye and set next_stage to "not_interested".
- If they ask a clarifying question or are unclear, answer briefly (1 sentence) and keep next_stage as "intro".
- If they ask if you are a bot or real person, deflect naturally (e.g. "Haha just texting around") and redirect back to the question, keep next_stage as "intro".`;
      } else if (currentStage === "price_ask") {
        stageContext = `CURRENT STAGE: price_ask — you already asked the seller what price they have in mind.
BRANCHING RULES:
1. If seller gives ANY specific price or dollar amount: reply with the needs-offer handoff message and set next_stage to "needs_offer". The VA will take over from here to make the actual offer.
2. If seller says "make me an offer", "you tell me", or refuses to name a price but is still open: reply with the needs-offer handoff message and set next_stage to "needs_offer".
3. If seller says NO or declines clearly: reply with the not-interested goodbye and set next_stage to "not_interested".
4. If seller asks a clarifying question or is still unclear: answer briefly and keep next_stage as "price_ask".
5. If seller asks if you are a bot: deflect naturally and redirect back to price, keep next_stage as "price_ask".`;
      } else {
        // Fallback — should not reach here since needs_offer/handoff/not_interested stop the AI
        stageContext = `CURRENT STAGE: ${currentStage} — keep next_stage as "${currentStage}" and do not reply.`;
      }
            const aiResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are texting a homeowner on behalf of a real estate investor who buys houses.

${stageContext}

EXACT REPLY TEMPLATES — use these word-for-word when the rule applies:
- Not interested goodbye: "No worries at all, thanks for your time. Feel free to reach out if anything changes."
- Ask for price: "Ok great, what price did you have in mind for the property?"
- Needs-offer handoff (seller gives a price OR says make me an offer): "Got it! Let me get that info over to the right person and they'll be in touch with you shortly."

CRITICAL RULES — never break these:
- NEVER mention a company name, your name, or your partner's name
- NEVER say you are an AI or a bot
- NEVER use corporate or formal language
- Use ONLY whole dollar amounts — no cents, no ranges
- Keep every reply SHORT — 1 to 2 sentences maximum
- Sound like a real person texting from their phone — casual, direct, friendly`,
          },
          {
            role: "user",
            content: `Conversation so far:\n${transcript}\n\nLatest seller message: "${Body}"\n\nReply with a JSON object:\n- "reply": the exact SMS text to send\n- "next_stage": one of "intro", "price_ask", "needs_offer", "handoff", "not_interested"`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ai_reply",
            strict: true,
            schema: {
              type: "object",
              properties: {
                reply: { type: "string", description: "The SMS reply to send" },
                next_stage: { type: "string", enum: ["intro", "price_ask", "needs_offer", "handoff", "not_interested"] },
              },
              required: ["reply", "next_stage"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = aiResponse.choices[0]?.message?.content;
      let replyBody: string | null = null;
      let nextStage: string = currentStage;

      if (rawContent && typeof rawContent === "string") {
        try {
          const parsed = JSON.parse(rawContent) as { reply: string; next_stage: string };
          replyBody = parsed.reply?.trim() ?? null;
          nextStage = parsed.next_stage ?? currentStage;
        } catch (_parseErr) {
          replyBody = rawContent.trim();
        }
      }

      if (replyBody) {
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

          // Advance the stage in the database
          await db
            .update(conversations)
            .set({
              lastMessageAt: new Date(),
              lastMessagePreview: replyBody.slice(0, 200),
              status: "active",
              aiStage: nextStage as "intro" | "price_ask" | "needs_offer" | "handoff" | "not_interested",
            } as any)
            .where(eq(conversations.id, conversation.id));

          console.log(`[SMS] AI reply sent for conversation ${conversation.id} — stage: ${currentStage} → ${nextStage}`);
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

      // Get the from phone number(s) — support rotation across up to 3 numbers
      const rotationIds: number[] = Array.isArray((campaign as any).phoneNumberIds) && (campaign as any).phoneNumberIds.length > 0
        ? (campaign as any).phoneNumberIds
        : campaign.phoneNumberId ? [campaign.phoneNumberId] : [];

      if (rotationIds.length === 0) continue;

      // Load all rotation phone numbers
      const rotationPhones = await db
        .select()
        .from(phoneNumbers)
        .where(sql`${phoneNumbers.id} IN (${sql.join(rotationIds.map(id => sql`${id}`), sql`, `)})`);

      if (rotationPhones.length === 0) continue;

      // We'll rotate per-contact below; keep fromPhoneId for conversation tracking
      const fromPhoneId = rotationIds[0];

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
        // Always skip opted-out contacts (hard block, not a user toggle)
        if (contact.optedOut) continue;

        // Scrub TCPA litigators — check contact litigatorFlag AND manually uploaded litigator_numbers table
        if (campaign.scrubLitigators) {
          if ((contact as any).litigatorFlag) continue;
          const [manualLitigator] = await db
            .select({ id: litigatorNumbers.id })
            .from(litigatorNumbers)
            .where(and(eq(litigatorNumbers.userId, campaign.userId), eq(litigatorNumbers.phone, contact.phone)))
            .limit(1);
          if (manualLitigator) continue;
        }

        // Scrub federal/national DNC — only if campaign has scrubFederalDnc enabled
        if (campaign.scrubFederalDnc && (contact as any).dncStatus === "federal_dnc") continue;

        // Scrub internal DNC status flags (state_dnc, dnc_complainers) — only if scrubInternalDnc is enabled
        if (campaign.scrubInternalDnc && (contact as any).dncStatus && !(["clean", "federal_dnc"].includes((contact as any).dncStatus))) continue;

        // Always check opt-out list (hard block — TCPA compliance, not a user toggle)
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

        // Scrub internal DNC list — only if campaign has scrubInternalDnc enabled
        if (campaign.scrubInternalDnc) {
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
        }

        // Scrub existing contacts — skip if this contact's phone already exists in another contact list
        // Only if campaign has scrubExistingContacts enabled
        if (campaign.scrubExistingContacts) {
          const [existingContact] = await db
            .select({ id: contacts.id })
            .from(contacts)
            .where(
              and(
                eq(contacts.userId, campaign.userId),
                eq(contacts.phone, contact.phone),
                // Exclude the contact itself — only skip if it exists in a DIFFERENT list
                sql`${contacts.id} != ${contact.id}`
              )
            )
            .limit(1);
          if (existingContact) continue;
        }

        // Skip manual-mode campaigns — those are handled by the Send Queue UI, not the batch engine
        if ((campaign as any).sendMode === "manual") continue;

        // Get the campaign message body — rotate through templateIds if set, otherwise use step 1
        const tplIds: number[] = Array.isArray((campaign as any).templateIds) && (campaign as any).templateIds.length > 0
          ? (campaign as any).templateIds
          : [];
        let messageBody: string;
        if (tplIds.length > 0) {
          // Rotate through selected templates by absolute contact index
          const tplIndex = ((campaign.nextBatchOffset ?? 0) + sentCount) % tplIds.length;
          const tplId = tplIds[tplIndex];
          const { campaignTemplates: tplTable } = await import("../drizzle/schema");
          const [tpl] = await db
            .select()
            .from(tplTable)
            .where(eq(tplTable.id, tplId))
            .limit(1);
          if (!tpl) continue;
          messageBody = resolveMergeFields(tpl.body, contact);
        } else {
          // Fall back to step 1 body
          const { campaignSteps: steps } = await import("../drizzle/schema");
          const [step1] = await db
            .select()
            .from(steps)
            .where(and(eq(steps.campaignId, campaign.id), eq(steps.stepNumber, 1)))
            .limit(1);
          if (!step1) continue;
          messageBody = resolveMergeFields(step1.body, contact);
        }

        // Append opt-out footer if enabled
        if (campaign.optOutFooter) {
          messageBody += "\n\nReply STOP to opt out.";
        }

        // Pick the phone number to send from — rotate across rotationPhones by contact index
        const rotationIndex = sentCount % rotationPhones.length;
        const fromPhone = rotationPhones[rotationIndex];

        // Send the SMS
        const result = await sendSms({
          accountSid: user.twilioAccountSid,
          authToken: user.twilioAuthToken,
          from: fromPhone.phoneNumber,
          to: contact.phone,
          body: messageBody,
        });

        if (!result) {
          // Send failed — increment failed counter on campaign
          console.warn(`[BatchEngine] Send failed for contact ${contact.id} (${contact.phone}) in campaign ${campaign.id}`);
          try {
            await db
              .update(campaigns)
              .set({ failed: sql`COALESCE(${campaigns.failed}, 0) + 1` })
              .where(eq(campaigns.id, campaign.id));
          } catch (_e) { /* ignore */ }
          continue;
        }

        sentCount++;

        {
           // Find or create conversation — scoped to this campaign so each campaign
          // gets its own fresh thread with aiStage = intro, even if the contact
          // was texted in a previous campaign from a different number.
          let [conv] = await db
            .select()
            .from(conversations)
            .where(
              and(
                eq(conversations.userId, campaign.userId),
                eq(conversations.contactId, contact.id),
                eq(conversations.campaignId, campaign.id)
              )
            )
            .limit(1);
          if (!conv) {
            await db.insert(conversations).values({
              userId: campaign.userId,
              contactId: contact.id,
              campaignId: campaign.id,
              phoneNumberId: fromPhoneId,
              status: "unreplied",
              lastMessageAt: now,
              lastMessagePreview: messageBody.slice(0, 200),
              unreadCount: 0,
              aiStage: "intro",
            });
            [conv] = await db
              .select()
              .from(conversations)
              .where(
                and(
                  eq(conversations.userId, campaign.userId),
                  eq(conversations.contactId, contact.id),
                  eq(conversations.campaignId, campaign.id)
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

  // ─── Process follow-up queue ───────────────────────────────────────────────────────────────
  try {
    const db2 = await getDb();
    if (!db2) return;
    const { followUpQueue } = await import("../drizzle/schema");

    // Find all pending follow-ups that are due
    const dueFollowUps = await db2
      .select()
      .from(followUpQueue)
      .where(
        and(
          eq(followUpQueue.status, "pending"),
          sql`${followUpQueue.scheduledAt} <= NOW()`
        )
      )
      .limit(50);

    for (const item of dueFollowUps) {
      try {
        // Get user credentials
        const [itemUser] = await db2.select().from(users).where(eq(users.id, item.userId)).limit(1);
        if (!itemUser?.twilioAccountSid || !itemUser?.twilioAuthToken) {
          await db2.update(followUpQueue).set({ status: "failed" }).where(eq(followUpQueue.id, item.id));
          continue;
        }

        // Get the from phone number
        let fromPhoneNum: string | null = null;
        if (item.phoneNumberId) {
          const [ph] = await db2.select().from(phoneNumbers).where(eq(phoneNumbers.id, item.phoneNumberId)).limit(1);
          fromPhoneNum = ph?.phoneNumber ?? null;
        }
        if (!fromPhoneNum) {
          await db2.update(followUpQueue).set({ status: "failed" }).where(eq(followUpQueue.id, item.id));
          continue;
        }

        // Get contact phone
        const [itemContact] = await db2.select().from(contacts).where(eq(contacts.id, item.contactId)).limit(1);
        if (!itemContact || itemContact.optedOut) {
          await db2.update(followUpQueue).set({ status: "cancelled" }).where(eq(followUpQueue.id, item.id));
          continue;
        }

        const result = await sendSms({
          accountSid: itemUser.twilioAccountSid,
          authToken: itemUser.twilioAuthToken,
          from: fromPhoneNum,
          to: itemContact.phone,
          body: item.message,
        });

        if (result) {
          // Log the message
          await db2.insert(messages).values({
            conversationId: item.conversationId,
            userId: item.userId,
            direction: "outbound",
            body: item.message,
            twilioSid: result.sid,
            status: "sent",
            isAiGenerated: false,
            campaignId: item.campaignId,
          });
          await db2.update(followUpQueue).set({ status: "sent", sentAt: new Date() }).where(eq(followUpQueue.id, item.id));
          console.log(`[BatchEngine] Follow-up sent for conversation ${item.conversationId}`);
        } else {
          await db2.update(followUpQueue).set({ status: "failed" }).where(eq(followUpQueue.id, item.id));
        }
      } catch (fuErr) {
        console.error(`[BatchEngine] Follow-up send error for item ${item.id}:`, fuErr);
        await db2.update(followUpQueue).set({ status: "failed" }).where(eq(followUpQueue.id, item.id));
      }
    }
  } catch (fuQueueErr) {
    console.error("[BatchEngine] Follow-up queue processor error:", fuQueueErr);
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

            // Update campaign delivery counters
            if (mappedStatus === "delivered") {
              await db
                .update(campaigns)
                .set({ delivered: sql`${campaigns.delivered} + 1` })
                .where(
                  sql`${campaigns.id} IN (SELECT campaignId FROM messages WHERE twilioSid = ${MessageSid} LIMIT 1)`
                );
            } else if (mappedStatus === "failed" || mappedStatus === "undelivered") {
              // Increment failed count (uses the 'failed' column if it exists, otherwise log)
              try {
                await db
                  .update(campaigns)
                  .set({ failed: sql`COALESCE(${campaigns.failed}, 0) + 1` })
                  .where(
                    sql`${campaigns.id} IN (SELECT campaignId FROM messages WHERE twilioSid = ${MessageSid} LIMIT 1)`
                  );
              } catch (_colErr) {
                // Column may not exist yet — log and continue
                console.warn("[SMS] Could not increment failed count (column may be missing):", _colErr);
              }
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
