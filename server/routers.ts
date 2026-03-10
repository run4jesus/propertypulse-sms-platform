import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addContactToGroup,
  addContactToList,
  addPhoneNumber,
  addToContactManagement,
  assignLabelToContact,
  assignLabelToConversation,
  bulkInsertContacts,
  createCallRecording,
  createCampaign,
  createCampaignStep,
  createCampaignTemplate,
  createCalendarEvent,
  createContact,
  createContactGroup,
  createContactList,
  createCustomField,
  createKeywordCampaign,
  createLabel,
  createMacro,
  createMessage,
  createWorkflow,
  createWorkflowStep,
  deleteCampaign,
  deleteCampaignSteps,
  deleteCampaignTemplate,
  deleteCalendarEvent,
  deleteContact,
  deleteContactGroup,
  deleteCustomField,
  deleteKeywordCampaign,
  deleteLabel,
  deleteMacro,
  deletePhoneNumber,
  deleteWorkflow,
  deleteWorkflowSteps,
  getCallRecordings,
  getCalendarEvents,
  getCampaignById,
  getCampaignSteps,
  getCampaignTemplates,
  getCampaigns,
  getContactById,
  getContactGroups,
  getContactLabels,
  getContactLists,
  getContactManagementList,
  getContacts,
  getConversationById,
  getConversationLabels,
  getConversations,
  getCustomFields,
  getDashboardStats,
  getGroupMembers,
  getKeywordCampaigns,
  getLabels,
  getLatestAiSuggestion,
  getMacros,
  getMessages,
  getOrCreateConversation,
  getPhoneNumbers,
  getUserByOpenId,
  getWorkflowById,
  getWorkflowSteps,
  getWorkflows,
  incrementMacroUsage,
  removeContactFromGroup,
  removeFromContactManagement,
  removeLabelFromContact,
  removeLabelFromConversation,
  saveAiSuggestion,
  updateCallRecordingTranscription,
  updateCalendarEvent,
  updateCampaign,
  updateCampaignTemplate,
  updateContact,
  updateContactGroup,
  updateConversation,
  updateKeywordCampaign,
  updateMacro,
  updateUserAiMode,
  updateUserTwilio,
  updateWorkflow,
} from "./db";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import { getDb } from "./db";
import { eq, sql } from "drizzle-orm";
import { contacts } from "../drizzle/schema";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Settings ──────────────────────────────────────────────────────────────
  settings: router({
    updateAiMode: protectedProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await updateUserAiMode(ctx.user.id, input.enabled);
        return { success: true };
      }),

    updateTwilio: protectedProcedure
      .input(z.object({ accountSid: z.string(), authToken: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await updateUserTwilio(ctx.user.id, input.accountSid, input.authToken);
        return { success: true };
      }),
  }),

  // ─── Phone Numbers ──────────────────────────────────────────────────────────
  phoneNumbers: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getPhoneNumbers(ctx.user.id);
    }),

    add: protectedProcedure
      .input(z.object({ phoneNumber: z.string(), friendlyName: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await addPhoneNumber({ userId: ctx.user.id, ...input });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deletePhoneNumber(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Labels ─────────────────────────────────────────────────────────────────
  labels: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getLabels(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string(), color: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await createLabel(ctx.user.id, input.name, input.color);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteLabel(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Contact Lists ───────────────────────────────────────────────────────────
  contactLists: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getContactLists(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string(), description: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await createContactList(ctx.user.id, input.name, input.description);
        return { success: true };
      }),
  }),

  // ─── Contacts ───────────────────────────────────────────────────────────────
  contacts: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional(), labelId: z.number().optional(), listId: z.number().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getContacts(ctx.user.id, input);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return getContactById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string(),
        email: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        propertyAddress: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createContact({ ...input, userId: ctx.user.id });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        propertyAddress: z.string().optional(),
        propertyCity: z.string().optional(),
        propertyState: z.string().optional(),
        propertyZip: z.string().optional(),
        notes: z.string().optional(),
        optedOut: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateContact(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteContact(input.id, ctx.user.id);
        return { success: true };
      }),

    bulkImport: protectedProcedure
      .input(z.object({
        contacts: z.array(z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          phone: z.string(),
          email: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zip: z.string().optional(),
          propertyAddress: z.string().optional(),
          propertyCity: z.string().optional(),
          propertyState: z.string().optional(),
          propertyZip: z.string().optional(),
        })),
        listId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Deduplication: fetch existing phone numbers for this user
        const db = await getDb();
        let skipped = 0;
        let deduped = input.contacts;
        if (db) {
          const existingContacts = await db
            .select({ phone: contacts.phone })
            .from(contacts)
            .where(eq(contacts.userId, ctx.user.id));
          const existingPhones = new Set(existingContacts.map((c) => c.phone));
          // Also deduplicate within the import batch itself
          const seenInBatch = new Set<string>();
          deduped = input.contacts.filter((c) => {
            const normalized = c.phone.replace(/[^\d+]/g, "");
            if (existingPhones.has(normalized) || existingPhones.has(c.phone) || seenInBatch.has(normalized)) {
              skipped++;
              return false;
            }
            seenInBatch.add(normalized);
            return true;
          });
        }
        const rows = deduped.map((c) => ({ ...c, userId: ctx.user.id }));
        if (rows.length > 0) await bulkInsertContacts(rows);
        // Add to list if provided
        if (input.listId && rows.length > 0 && db) {
          const inserted = await db
            .select({ id: contacts.id })
            .from(contacts)
            .where(eq(contacts.userId, ctx.user.id))
            .orderBy(sql`${contacts.id} DESC`)
            .limit(rows.length);
          for (const c of inserted) {
            await addContactToList(c.id, input.listId!);
          }
        }
        return { success: true, count: rows.length, skipped };
      }),

    assignLabel: protectedProcedure
      .input(z.object({ contactId: z.number(), labelId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assignLabelToContact(input.contactId, input.labelId);
        return { success: true };
      }),

    removeLabel: protectedProcedure
      .input(z.object({ contactId: z.number(), labelId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await removeLabelFromContact(input.contactId, input.labelId);
        return { success: true };
      }),

    getLabels: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getContactLabels(input.contactId);
      }),

    addToList: protectedProcedure
      .input(z.object({ contactId: z.number(), listId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await addContactToList(input.contactId, input.listId);
        return { success: true };
      }),
  }),

  // ─── Conversations ───────────────────────────────────────────────────────────
  conversations: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional(), labelId: z.number().optional(), search: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getConversations(ctx.user.id, input);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const conv = await getConversationById(input.id, ctx.user.id);
        if (!conv) return null;
        const convLabels = await getConversationLabels(input.id);
        const aiSuggestion = await getLatestAiSuggestion(input.id);
        return { ...conv, labels: convLabels, aiSuggestion };
      }),

    getOrCreate: protectedProcedure
      .input(z.object({ contactId: z.number(), phoneNumberId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        return getOrCreateConversation(ctx.user.id, input.contactId, input.phoneNumberId);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["active", "awaiting_reply", "unreplied", "opted_out", "closed"]).optional(),
        isStarred: z.boolean().optional(),
        aiEnabled: z.boolean().optional(),
        disposition: z.enum(["interested", "not_interested", "wrong_number", "callback_requested", "under_contract", "closed", "dnc", "no_answer"]).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateConversation(id, ctx.user.id, data);
        return { success: true };
      }),

    setDisposition: protectedProcedure
      .input(z.object({
        id: z.number(),
        disposition: z.enum(["interested", "not_interested", "wrong_number", "callback_requested", "under_contract", "closed", "dnc", "no_answer"]).nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateConversation(input.id, ctx.user.id, { disposition: input.disposition });
        return { success: true };
      }),

    assignLabel: protectedProcedure
      .input(z.object({ conversationId: z.number(), labelId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assignLabelToConversation(input.conversationId, input.labelId);
        return { success: true };
      }),

    removeLabel: protectedProcedure
      .input(z.object({ conversationId: z.number(), labelId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await removeLabelFromConversation(input.conversationId, input.labelId);
        return { success: true };
      }),
  }),

  // ─── Messages ────────────────────────────────────────────────────────────────
  messages: router({
    list: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getMessages(input.conversationId);
      }),

    send: protectedProcedure
      .input(z.object({ conversationId: z.number(), body: z.string(), isAiGenerated: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        await createMessage({
          conversationId: input.conversationId,
          userId: ctx.user.id,
          direction: "outbound",
          body: input.body,
          status: "sent",
          isAiGenerated: input.isAiGenerated ?? false,
        });
        return { success: true };
      }),
  }),

  // ─── Campaigns ───────────────────────────────────────────────────────────────
  campaigns: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getCampaigns(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const campaign = await getCampaignById(input.id, ctx.user.id);
        if (!campaign) return null;
        const steps = await getCampaignSteps(input.id);
        return { ...campaign, steps };
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        type: z.enum(["standard", "drip"]).default("standard"),
        contactListId: z.number().optional(),
        phoneNumberId: z.number().optional(),
        scheduledAt: z.string().optional(),
        batchSize: z.number().min(1).max(500).default(10),
        batchIntervalMinutes: z.number().min(1).max(1440).default(5),
        sendWindowStart: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
        sendWindowEnd: z.string().regex(/^\d{2}:\d{2}$/).default("20:00"),
        optOutFooter: z.boolean().default(true),
        steps: z.array(z.object({ stepNumber: z.number(), body: z.string(), delayDays: z.number(), delayHours: z.number() })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { steps, scheduledAt, ...campaignData } = input;
        const result = await createCampaign({
          ...campaignData,
          userId: ctx.user.id,
          status: scheduledAt ? "scheduled" : "draft",
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        });
        // Get the inserted id
        const campaigns = await getCampaigns(ctx.user.id);
        const newCampaign = campaigns[0];
        if (newCampaign && steps && steps.length > 0) {
          for (const step of steps) {
            await createCampaignStep({ campaignId: newCampaign.id, ...step });
          }
        }
        return { success: true, campaign: newCampaign };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        status: z.enum(["draft", "scheduled", "active", "paused", "completed", "cancelled"]).optional(),
        scheduledAt: z.string().optional(),
        aiEnabled: z.boolean().optional(),
        batchSize: z.number().min(1).max(500).optional(),
        batchIntervalMinutes: z.number().min(1).max(1440).optional(),
        sendWindowStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        sendWindowEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        optOutFooter: z.boolean().optional(),
        steps: z.array(z.object({ stepNumber: z.number(), body: z.string(), delayDays: z.number(), delayHours: z.number() })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, steps, scheduledAt, ...data } = input;
        await updateCampaign(id, ctx.user.id, {
          ...data,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        });
        if (steps) {
          await deleteCampaignSteps(id);
          for (const step of steps) {
            await createCampaignStep({ campaignId: id, ...step });
          }
        }
        return { success: true };
      }),

    toggleAi: protectedProcedure
      .input(z.object({ id: z.number(), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await updateCampaign(input.id, ctx.user.id, { aiEnabled: input.enabled });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteCampaign(input.id, ctx.user.id);
        return { success: true };
      }),

    templates: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        return getCampaignTemplates(ctx.user.id);
      }),

      create: protectedProcedure
        .input(z.object({ name: z.string(), body: z.string(), category: z.string().optional() }))
        .mutation(async ({ ctx, input }) => {
          await createCampaignTemplate(ctx.user.id, input.name, input.body, input.category);
          return { success: true };
        }),

      update: protectedProcedure
        .input(z.object({ id: z.number(), name: z.string().optional(), body: z.string().optional(), category: z.string().optional() }))
        .mutation(async ({ ctx, input }) => {
          const { id, ...data } = input;
          await updateCampaignTemplate(id, ctx.user.id, data);
          return { success: true };
        }),

      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          await deleteCampaignTemplate(input.id, ctx.user.id);
          return { success: true };
        }),
    }),
  }),

  // ─── Top-level templates alias (for Templates page) ──────────────────────────
  templates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getCampaignTemplates(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string(), body: z.string(), category: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await createCampaignTemplate(ctx.user.id, input.name, input.body, input.category);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), body: z.string().optional(), category: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateCampaignTemplate(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteCampaignTemplate(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── AI ──────────────────────────────────────────────────────────────────────
  ai: router({
    analyzeConversation: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const msgs = await getMessages(input.conversationId);
        const conv = await getConversationById(input.conversationId, ctx.user.id);
        if (!conv) throw new Error("Conversation not found");

        const transcript = msgs
          .slice(-20)
          .map((m) => `${m.direction === "outbound" ? "Agent" : "Seller"}: ${m.body}`)
          .join("\n");

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an expert real estate wholesaling AI assistant. Analyze this SMS conversation with a potential motivated seller and extract key information. Return JSON only.`,
            },
            {
              role: "user",
              content: `Analyze this conversation and return a JSON object with these fields:
- leadScore (1-10, where 10 is most motivated)
- motivationLevel ("low" | "medium" | "high")
- timeline (string, e.g. "ASAP", "3-6 months", "not sure")
- askingPrice (string or null)
- propertyAddress (string or null)
- keyInsights (string, 1-2 sentences)
- suggestedReply (string, the best next message to send)
- reasoning (string, brief explanation of score)

Conversation:
${transcript}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "lead_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  leadScore: { type: "integer" },
                  motivationLevel: { type: "string" },
                  timeline: { type: "string" },
                  askingPrice: { type: "string" },
                  propertyAddress: { type: "string" },
                  keyInsights: { type: "string" },
                  suggestedReply: { type: "string" },
                  reasoning: { type: "string" },
                },
                required: ["leadScore", "motivationLevel", "timeline", "askingPrice", "propertyAddress", "keyInsights", "suggestedReply", "reasoning"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        if (!content) throw new Error("No AI response");

        const parsed = JSON.parse(content);

        await saveAiSuggestion({
          conversationId: input.conversationId,
          suggestedReply: parsed.suggestedReply,
          leadScore: parsed.leadScore,
          motivationLevel: parsed.motivationLevel,
          extractedInfo: {
            timeline: parsed.timeline,
            askingPrice: parsed.askingPrice,
            propertyAddress: parsed.propertyAddress,
            keyInsights: parsed.keyInsights,
          },
          reasoning: parsed.reasoning,
        });

        // Update contact with extracted info
        await updateContact(conv.contact.id, ctx.user.id, {
          leadScore: parsed.leadScore,
          motivationLevel: parsed.motivationLevel as any,
          timeline: parsed.timeline,
          askingPrice: parsed.askingPrice || undefined,
          propertyAddress: parsed.propertyAddress || undefined,
        });

        return parsed;
      }),

    getLatestSuggestion: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getLatestAiSuggestion(input.conversationId);
      }),

    generateReply: protectedProcedure
      .input(z.object({ conversationId: z.number(), context: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const msgs = await getMessages(input.conversationId);
        const transcript = msgs
          .slice(-10)
          .map((m) => `${m.direction === "outbound" ? "Agent" : "Seller"}: ${m.body}`)
          .join("\n");

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a real estate wholesaler texting a motivated seller about their property. Be conversational, empathetic, and professional. Keep responses short (1-3 sentences). Your goal is to understand their situation and make an offer.`,
            },
            {
              role: "user",
              content: `Generate the next best reply to this conversation:\n\n${transcript}${input.context ? `\n\nAdditional context: ${input.context}` : ""}`,
            },
          ],
        });

        return { reply: response.choices[0]?.message?.content ?? "" };
      }),
  }),

  // ─── Call Recordings ─────────────────────────────────────────────────────────
  callRecordings: router({
    list: protectedProcedure
      .input(z.object({ contactId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getCallRecordings(ctx.user.id, input?.contactId);
      }),

    create: protectedProcedure
      .input(z.object({
        contactId: z.number(),
        conversationId: z.number().optional(),
        audioUrl: z.string().optional(),
        duration: z.number().optional(),
        notes: z.string().optional(),
        calledAt: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await createCallRecording({
          ...input,
          userId: ctx.user.id,
          calledAt: input.calledAt ? new Date(input.calledAt) : new Date(),
        });
        return { success: true };
      }),

    transcribe: protectedProcedure
      .input(z.object({ id: z.number(), audioUrl: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const result = await transcribeAudio({ audioUrl: input.audioUrl, language: "en" });
        if ('error' in result) {
          throw new Error(result.error);
        }
        await updateCallRecordingTranscription(input.id, result.text);
        return { success: true, transcription: result.text };
      }),
  }),

  // ─── Reporting ───────────────────────────────────────────────────────────────
  reporting: router({
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      return getDashboardStats(ctx.user.id);
    }),

    campaigns: protectedProcedure.query(async ({ ctx }) => {
      const all = await getCampaigns(ctx.user.id);
      return all.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        sent: c.sent,
        delivered: c.delivered,
        replied: c.replied,
        optedOut: c.optedOut,
        failed: c.failed,
        totalContacts: c.totalContacts,
        deliveryRate: c.sent > 0 ? Math.round((c.delivered / c.sent) * 100) : 0,
        replyRate: c.sent > 0 ? Math.round((c.replied / c.sent) * 100) : 0,
        createdAt: c.createdAt,
      }));
    }),
  }),

  // ─── Contact Groups ──────────────────────────────────────────────────────────
  contactGroups: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getContactGroups(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string(), description: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await createContactGroup(ctx.user.id, input.name, input.description);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), description: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateContactGroup(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteContactGroup(input.id, ctx.user.id);
        return { success: true };
      }),

    addContact: protectedProcedure
      .input(z.object({ groupId: z.number(), contactId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await addContactToGroup(input.contactId, input.groupId);
        return { success: true };
      }),

    removeContact: protectedProcedure
      .input(z.object({ groupId: z.number(), contactId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await removeContactFromGroup(input.contactId, input.groupId);
        return { success: true };
      }),

    members: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getGroupMembers(input.groupId);
      }),
  }),

  // ─── Contact Management Lists ────────────────────────────────────────────────
  contactManagement: router({
    list: protectedProcedure
      .input(z.object({ listType: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getContactManagementList(ctx.user.id, input?.listType);
      }),

    add: protectedProcedure
      .input(z.object({ contactId: z.number(), phone: z.string(), listType: z.string(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await addToContactManagement(ctx.user.id, input.contactId, input.phone, input.listType, input.reason);
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await removeFromContactManagement(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Macros ──────────────────────────────────────────────────────────────────
  macros: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getMacros(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string(), body: z.string(), shortcut: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await createMacro(ctx.user.id, input.name, input.body, input.shortcut);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), body: z.string().optional(), shortcut: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateMacro(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteMacro(input.id, ctx.user.id);
        return { success: true };
      }),

    use: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await incrementMacroUsage(input.id);
        return { success: true };
      }),
  }),

  // ─── Keyword Campaigns ───────────────────────────────────────────────────────
  keywordCampaigns: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getKeywordCampaigns(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string(), keyword: z.string(), replyMessage: z.string(), phoneNumberId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        await createKeywordCampaign({ ...input, userId: ctx.user.id });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), keyword: z.string().optional(), replyMessage: z.string().optional(), status: z.enum(["active", "paused", "draft"]).optional(), phoneNumberId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateKeywordCampaign(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteKeywordCampaign(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Workflows ───────────────────────────────────────────────────────────────
  workflows: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getWorkflows(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const workflow = await getWorkflowById(input.id, ctx.user.id);
        if (!workflow) return null;
        const steps = await getWorkflowSteps(input.id);
        return { ...workflow, steps };
      }),

    create: protectedProcedure
      .input(z.object({ name: z.string(), description: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await createWorkflow(ctx.user.id, input.name, input.description);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        steps: z.array(z.object({
          stepNumber: z.number(),
          body: z.string(),
          delayDays: z.number(),
          actionOnNoReply: z.boolean().optional(),
          noReplyHours: z.number().optional(),
          addToGroupId: z.number().optional(),
          addLabelId: z.number().optional(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, steps, ...data } = input;
        await updateWorkflow(id, ctx.user.id, { ...data, totalMessages: steps?.length, totalDays: steps ? Math.max(...steps.map(s => s.delayDays), 0) : undefined });
        if (steps) {
          await deleteWorkflowSteps(id);
          for (const step of steps) {
            await createWorkflowStep({ workflowId: id, ...step });
          }
        }
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteWorkflow(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Custom Fields ───────────────────────────────────────────────────────────
  customFields: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getCustomFields(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string(), fieldKey: z.string(), fieldType: z.enum(["text", "number", "date", "boolean"]).default("text") }))
      .mutation(async ({ ctx, input }) => {
        await createCustomField(ctx.user.id, input.name, input.fieldKey, input.fieldType);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteCustomField(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Calendar ────────────────────────────────────────────────────────────────
  calendar: router({
    list: protectedProcedure
      .input(z.object({ startAt: z.string().optional(), endAt: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getCalendarEvents(
          ctx.user.id,
          input?.startAt ? new Date(input.startAt) : undefined,
          input?.endAt ? new Date(input.endAt) : undefined,
        );
      }),

    create: protectedProcedure
      .input(z.object({
        contactId: z.number().optional(),
        title: z.string(),
        description: z.string().optional(),
        startAt: z.string(),
        endAt: z.string(),
        allDay: z.boolean().optional(),
        type: z.enum(["appointment", "follow_up", "call", "other"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createCalendarEvent({ ...input, userId: ctx.user.id, startAt: new Date(input.startAt), endAt: new Date(input.endAt) });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        startAt: z.string().optional(),
        endAt: z.string().optional(),
        allDay: z.boolean().optional(),
        type: z.enum(["appointment", "follow_up", "call", "other"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, startAt, endAt, ...data } = input;
        await updateCalendarEvent(id, ctx.user.id, {
          ...data,
          startAt: startAt ? new Date(startAt) : undefined,
          endAt: endAt ? new Date(endAt) : undefined,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteCalendarEvent(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Twilio Webhook (public) ──────────────────────────────────────────────────
  twilio: router({
    inboundWebhook: publicProcedure
      .input(z.object({ From: z.string(), To: z.string(), Body: z.string(), MessageSid: z.string() }))
      .mutation(async ({ input }) => {
        // Find user by phone number, create inbound message
        // This is handled by the Express route in index.ts for proper Twilio webhook validation
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
