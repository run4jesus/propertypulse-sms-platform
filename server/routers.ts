import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addContactToList,
  addPhoneNumber,
  assignLabelToContact,
  assignLabelToConversation,
  bulkInsertContacts,
  createCallRecording,
  createCampaign,
  createCampaignStep,
  createCampaignTemplate,
  createContact,
  createContactList,
  createLabel,
  createMessage,
  deleteCampaign,
  deleteCampaignSteps,
  deleteContact,
  deleteLabel,
  deletePhoneNumber,
  getCallRecordings,
  getCampaignById,
  getCampaignSteps,
  getCampaignTemplates,
  getCampaigns,
  getContactById,
  getContactLabels,
  getContactLists,
  getContacts,
  getConversationById,
  getConversationLabels,
  getConversations,
  getDashboardStats,
  getLabels,
  getLatestAiSuggestion,
  getMessages,
  getOrCreateConversation,
  getPhoneNumbers,
  getUserByOpenId,
  removeLabelFromContact,
  removeLabelFromConversation,
  saveAiSuggestion,
  updateCallRecordingTranscription,
  updateCampaign,
  updateContact,
  updateConversation,
  updateUserAiMode,
  updateUserTwilio,
} from "./db";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";

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
        })),
        listId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const rows = input.contacts.map((c) => ({ ...c, userId: ctx.user.id }));
        await bulkInsertContacts(rows);
        return { success: true, count: rows.length };
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
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateConversation(id, ctx.user.id, data);
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
