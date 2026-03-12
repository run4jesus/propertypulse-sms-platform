import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
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
  getReportingStats,
  getGroupMembers,
  getKeywordCampaigns,
  getLabels,
  seedDefaultLabels,
  updateLabel,
  getLatestAiSuggestion,
  getMacros,
  getMessages,
  getMessagesByContactPhone,
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
  markConversationRead,
  updateKeywordCampaign,
  updateMacro,
  updateUserAiMode,
  updateUserTwilio,
  updateUserPodio,
  updateWorkflow,
} from "./db";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import { getDb } from "./db";
import { and, eq, sql } from "drizzle-orm";
import { contacts, contactManagement as contactManagementTable, contactListMembers, contactLists, phoneNumbers as phoneNumbersTable } from "../drizzle/schema";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(async (opts) => {
      // Auto-seed TextGrid credentials from env vars if not yet stored for this user
      if (opts.ctx.user && ENV.textgridAccountSid && ENV.textgridAuthToken) {
        const dbUser = await getUserByOpenId(opts.ctx.user.openId);
        if (dbUser && (!dbUser.twilioAccountSid || !dbUser.twilioAuthToken)) {
          await updateUserTwilio(opts.ctx.user.id, ENV.textgridAccountSid, ENV.textgridAuthToken);
        }
      }
      return opts.ctx.user;
    }),
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

    updatePodio: protectedProcedure
      .input(z.object({ enabled: z.boolean(), webformUrl: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await updateUserPodio(ctx.user.id, input.enabled, input.webformUrl);
        return { success: true };
      }),

    testPodio: protectedProcedure
      .input(z.object({ webformUrl: z.string().optional() }))
      .mutation(async ({ ctx }) => {
        const { pushLeadToPodio } = await import("./podioIntegration");
        const result = await pushLeadToPodio({
          firstName: "Test",
          lastName: "Lead",
          phone: "+10000000000",
          propertyAddress: "123 Test St, Fort Worth TX 76101",
          temperature: "HOT",
          conversationThread: "[LotPulse SMS Test Push]\n[Agent]: Hey, are you interested in selling?\n[Seller]: Yes I'm interested, how much?",
        });
        return result;
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

    // Search available numbers via TextGrid API
    searchAvailable: protectedProcedure
      .input(z.object({
        areaCode: z.string().optional(),
        contains: z.string().optional(),
        country: z.string().default("US"),
        limit: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        const user = await getUserByOpenId(ctx.user.openId);
        if (!user?.twilioAccountSid || !user?.twilioAuthToken) {
          throw new Error("TextGrid credentials not configured. Please add your Account SID and Auth Token in Settings.");
        }
        const params = new URLSearchParams();
        if (input.areaCode) params.set("AreaCode", input.areaCode);
        if (input.contains) params.set("Contains", input.contains);
        params.set("SmsEnabled", "true");
        params.set("PageSize", String(input.limit));
        const url = `https://api.textgrid.com/2010-04-01/Accounts/${user.twilioAccountSid}/AvailablePhoneNumbers/${input.country}/Local.json?${params.toString()}`;
        const resp = await fetch(url, {
          headers: {
            Authorization: "Basic " + Buffer.from(`${user.twilioAccountSid}:${user.twilioAuthToken}`).toString("base64"),
          },
        });
        if (!resp.ok) {
          const err = await resp.text();
          throw new Error(`TextGrid API error: ${err}`);
        }
        const data = await resp.json() as { available_phone_numbers: Array<{ phone_number: string; friendly_name: string; locality: string; region: string; postal_code: string; iso_country: string }> };
        return data.available_phone_numbers ?? [];
      }),

    // Purchase a number via TextGrid API
    purchase: protectedProcedure
      .input(z.object({
        phoneNumber: z.string(),
        friendlyName: z.string().optional(),
        webhookUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByOpenId(ctx.user.openId);
        if (!user?.twilioAccountSid || !user?.twilioAuthToken) {
          throw new Error("TextGrid credentials not configured.");
        }
        const body = new URLSearchParams();
        body.set("PhoneNumber", input.phoneNumber);
        if (input.friendlyName) body.set("FriendlyName", input.friendlyName);
        // Always set webhooks to LotPulse so no manual setup is needed
        const lotpulseBase = "https://lotpulsesms-zmwera2y.manus.space";
        body.set("SmsUrl", input.webhookUrl || `${lotpulseBase}/api/sms/inbound`);
        body.set("SmsMethod", "POST");
        body.set("StatusCallback", `${lotpulseBase}/api/sms/status`);
        body.set("StatusCallbackMethod", "POST");
        const url = `https://api.textgrid.com/2010-04-01/Accounts/${user.twilioAccountSid}/IncomingPhoneNumbers.json`;
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: "Basic " + Buffer.from(`${user.twilioAccountSid}:${user.twilioAuthToken}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        });
        if (!resp.ok) {
          const err = await resp.text();
          throw new Error(`TextGrid API error: ${err}`);
        }
        const data = await resp.json() as { sid: string; phone_number: string; friendly_name: string };
        // Save to our DB
        await addPhoneNumber({
          userId: ctx.user.id,
          phoneNumber: data.phone_number,
          friendlyName: input.friendlyName || data.friendly_name || data.phone_number,
          twilioSid: data.sid,
        });
        return { success: true, phoneNumber: data.phone_number, sid: data.sid };
      }),

    // Release (delete) a number from TextGrid and our DB
    release: protectedProcedure
      .input(z.object({ id: z.number(), twilioSid: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByOpenId(ctx.user.openId);
        if (user?.twilioAccountSid && user?.twilioAuthToken && input.twilioSid) {
          // Release from TextGrid
          const url = `https://api.textgrid.com/2010-04-01/Accounts/${user.twilioAccountSid}/IncomingPhoneNumbers/${input.twilioSid}.json`;
          await fetch(url, {
            method: "DELETE",
            headers: {
              Authorization: "Basic " + Buffer.from(`${user.twilioAccountSid}:${user.twilioAuthToken}`).toString("base64"),
            },
          });
        }
        await deletePhoneNumber(input.id, ctx.user.id);
        return { success: true };
      }),

    // List numbers owned in TextGrid account (sync from TextGrid)
    syncFromTextGrid: protectedProcedure
      .mutation(async ({ ctx }) => {
        const user = await getUserByOpenId(ctx.user.openId);
        if (!user?.twilioAccountSid || !user?.twilioAuthToken) {
          throw new Error("TextGrid credentials not configured.");
        }
        const url = `https://api.textgrid.com/2010-04-01/Accounts/${user.twilioAccountSid}/IncomingPhoneNumbers.json?PageSize=100`;
        const resp = await fetch(url, {
          headers: {
            Authorization: "Basic " + Buffer.from(`${user.twilioAccountSid}:${user.twilioAuthToken}`).toString("base64"),
          },
        });
        if (!resp.ok) {
          const err = await resp.text();
          throw new Error(`TextGrid API error: ${err}`);
        }
        const data = await resp.json() as { incoming_phone_numbers: Array<{ sid: string; phone_number: string; friendly_name: string }> };
        const numbers = data.incoming_phone_numbers ?? [];
        const dbConn = await getDb();
        let added = 0;
        for (const num of numbers) {
          // Check if already in our DB by twilioSid using direct select
          const existing = dbConn ? await dbConn
            .select()
            .from(phoneNumbersTable)
            .where(and(eq(phoneNumbersTable.userId, ctx.user.id), eq(phoneNumbersTable.twilioSid, num.sid)))
            .limit(1) : [];
          if (!existing.length) {
            await addPhoneNumber({ userId: ctx.user.id, phoneNumber: num.phone_number, friendlyName: num.friendly_name, twilioSid: num.sid });
            added++;
          }
        }
        return { synced: numbers.length, added };
      }),
  }),

  // ─── Labels ─────────────────────────────────────────────────────────────────
  labels: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await seedDefaultLabels(ctx.user.id);
      return getLabels(ctx.user.id);
    }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string(), color: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await updateLabel(input.id, ctx.user.id, input.name, input.color);
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
        // Auto-mark as read when conversation is opened
        if (conv.conversation.unreadCount > 0) {
          await markConversationRead(input.id, ctx.user.id);
          conv.conversation.unreadCount = 0;
        }
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

    // Unified thread: all messages for a contact's phone number across all sender numbers
    listByContactPhone: protectedProcedure
      .input(z.object({ contactPhone: z.string() }))
      .query(async ({ ctx, input }) => {
        return getMessagesByContactPhone(ctx.user.id, input.contactPhone);
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
        scrubInternalDnc: z.boolean().default(true),
        scrubLitigators: z.boolean().default(true),
        scrubFederalDnc: z.boolean().default(false),
        scrubExistingContacts: z.boolean().default(false),
        phoneNumberIds: z.array(z.number()).max(3).default([]),
        templateIds: z.array(z.number()).max(8).default([]),
        followUpEnabled: z.boolean().default(false),
        followUpDelayHours: z.number().min(1).max(720).default(24),
        followUpMessage: z.string().optional(),
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
        scrubInternalDnc: z.boolean().optional(),
        scrubLitigators: z.boolean().optional(),
        scrubFederalDnc: z.boolean().optional(),
        scrubExistingContacts: z.boolean().optional(),
        phoneNumberIds: z.array(z.number()).max(3).optional(),
        templateIds: z.array(z.number()).max(8).optional(),
        followUpEnabled: z.boolean().optional(),
        followUpDelayHours: z.number().min(1).max(720).optional(),
        followUpMessage: z.string().optional(),
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

    // Scrub preview: count how many contacts each filter would remove for a given list
    scrubPreview: protectedProcedure
      .input(z.object({
        contactListId: z.number(),
        scrubInternalDnc: z.boolean().default(true),
        scrubLitigators: z.boolean().default(true),
        scrubFederalDnc: z.boolean().default(false),
        scrubExistingContacts: z.boolean().default(false),
      }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        // Get all contacts in this list
        const listContacts = await db
          .select({ contact: contacts })
          .from(contactListMembers)
          .innerJoin(contacts, eq(contactListMembers.contactId, contacts.id))
          .where(and(
            eq(contactListMembers.listId, input.contactListId),
            eq(contacts.userId, ctx.user.id)
          ));

        const total = listContacts.length;
        let removedOptedOut = 0;
        let removedInternalDnc = 0;
        let removedLitigators = 0;
        let removedFederalDnc = 0;
        let removedExisting = 0;

        for (const { contact } of listContacts) {
          // Always count opted-out
          if (contact.optedOut) { removedOptedOut++; continue; }

          if (input.scrubLitigators && (contact as any).litigatorFlag) { removedLitigators++; continue; }
          if (input.scrubFederalDnc && (contact as any).dncStatus === "federal_dnc") { removedFederalDnc++; continue; }

          // Internal DNC: check dncStatus column
          if (input.scrubInternalDnc && (contact as any).dncStatus && !(["clean", "federal_dnc"].includes((contact as any).dncStatus))) {
            removedInternalDnc++; continue;
          }

          // Internal DNC: check contactManagement table
          if (input.scrubInternalDnc) {
            const [inDnc] = await db.select({ id: contactManagementTable.id })
              .from(contactManagementTable)
              .where(and(
                eq(contactManagementTable.userId, ctx.user.id),
                eq(contactManagementTable.phone, contact.phone),
                eq(contactManagementTable.listType, "dnc")
              )).limit(1);
            if (inDnc) { removedInternalDnc++; continue; }
          }

          // Opted-out list
          const [optedOut] = await db.select({ id: contactManagementTable.id })
            .from(contactManagementTable)
            .where(and(
              eq(contactManagementTable.userId, ctx.user.id),
              eq(contactManagementTable.phone, contact.phone),
              eq(contactManagementTable.listType, "opted_out")
            )).limit(1);
          if (optedOut) { removedOptedOut++; continue; }

          // Existing contacts in other lists
          if (input.scrubExistingContacts) {
            const [existing] = await db.select({ id: contacts.id })
              .from(contacts)
              .where(and(
                eq(contacts.userId, ctx.user.id),
                eq(contacts.phone, contact.phone),
                sql`${contacts.id} != ${contact.id}`
              )).limit(1);
            if (existing) { removedExisting++; continue; }
          }
        }

        const totalRemoved = removedOptedOut + removedInternalDnc + removedLitigators + removedFederalDnc + removedExisting;
        return {
          total,
          sendable: total - totalRemoved,
          removedOptedOut,
          removedInternalDnc,
          removedLitigators,
          removedFederalDnc,
          removedExisting,
        };
      }),

    getSendQueue: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const campaign = await getCampaignById(input.campaignId, ctx.user.id);
        if (!campaign) throw new Error("Campaign not found");
        // Load templates for this campaign
        const tplIds: number[] = (campaign as any).templateIds ?? [];
        let templates: { id: number; name: string; body: string }[] = [];
        if (tplIds.length > 0) {
          const { campaignTemplates: tplTable } = await import("../drizzle/schema");
          const allTpls = await db.select({ id: tplTable.id, name: tplTable.name, body: tplTable.body })
            .from(tplTable)
            .where(sql`${tplTable.id} IN (${sql.join(tplIds.map((id: number) => sql`${id}`), sql`, `)})`);
          // Sort by templateIds order
          templates = allTpls.sort((a, b) => tplIds.indexOf(a.id) - tplIds.indexOf(b.id));
        }
        // Get all contacts in the campaign list
        if (!campaign.contactListId) return { contacts: [], templates, campaign };
        const { resolveMergeFields } = await import("./smsEngine");
        const allContacts = await db
          .select({ contact: contacts })
          .from(contactListMembers)
          .innerJoin(contacts, eq(contactListMembers.contactId, contacts.id))
          .where(eq(contactListMembers.listId, campaign.contactListId));
        // Filter out opted-out contacts
        const sendable = allContacts.map(r => r.contact).filter(c => !c.optedOut);
        // For each contact, pre-populate the rotated message body
        const queueItems = sendable.map((contact, idx) => {
          const tpl = templates.length > 0 ? templates[idx % templates.length] : null;
          const rawBody = tpl?.body ?? "";
          const resolvedBody = resolveMergeFields(rawBody, contact);
          return {
            contact,
            templateId: tpl?.id ?? null,
            templateName: tpl?.name ?? null,
            templateIndex: templates.length > 0 ? (idx % templates.length) + 1 : null,
            templateCount: templates.length,
            resolvedBody,
          };
        });
        return { contacts: queueItems, templates, campaign };
      }),

    sendQueueItem: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        contactId: z.number(),
        body: z.string(),
        fromPhoneNumberId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const user = await getUserByOpenId(ctx.user.openId);
        if (!user?.twilioAccountSid || !user?.twilioAuthToken) throw new Error("TextGrid credentials not configured");
        const { phoneNumbers: phoneNumbersSchema } = await import("../drizzle/schema");
        const [fromPhone] = await db.select().from(phoneNumbersSchema).where(and(eq(phoneNumbersSchema.id, input.fromPhoneNumberId), eq(phoneNumbersSchema.userId, ctx.user.id))).limit(1);
        if (!fromPhone) throw new Error("Phone number not found");
        const contact = await getContactById(input.contactId, ctx.user.id);
        if (!contact) throw new Error("Contact not found");
        const { sendSms } = await import("./smsEngine");
        const result = await sendSms({
          accountSid: user.twilioAccountSid,
          authToken: user.twilioAuthToken,
          from: fromPhone.phoneNumber,
          to: contact.phone,
          body: input.body,
        });
        const conv = await getOrCreateConversation(ctx.user.id, contact.id, fromPhone.id);
        if (!conv) throw new Error("Could not create conversation");
        const success = result !== null;
        await createMessage({
          conversationId: conv.id,
          userId: ctx.user.id,
          direction: "outbound",
          body: input.body,
          twilioSid: result?.sid ?? undefined,
          status: success ? "sent" : "failed",
          campaignId: input.campaignId,
        });
        const { campaigns: campaignsTable } = await import("../drizzle/schema");
        await db.update(campaignsTable).set({ sent: sql`${campaignsTable.sent} + 1` }).where(eq(campaignsTable.id, input.campaignId));
        return { success, sid: result?.sid ?? null };
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
    dashboard: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return getDashboardStats(ctx.user.id, input?.startDate, input?.endDate);
      }),

    stats: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        campaignId: z.number().optional(),
        templateId: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return getReportingStats(ctx.user.id, {
          startDate: input?.startDate,
          endDate: input?.endDate,
          campaignId: input?.campaignId,
          templateId: input?.templateId,
        });
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

    // Bulk import phone numbers to internal DNC list from CSV
    bulkImportDnc: protectedProcedure
      .input(z.object({
        phones: z.array(z.string()).min(1).max(50000),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const normalizePhone = (p: string) => {
          const digits = p.replace(/\D/g, "");
          if (digits.length === 10) return `+1${digits}`;
          if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
          return digits.length >= 10 ? `+${digits}` : "";
        };
        let added = 0;
        let skipped = 0;
        for (const rawPhone of input.phones) {
          const phone = normalizePhone(rawPhone);
          if (!phone || phone.length < 10) { skipped++; continue; }
          // Check if already on DNC list
          const [existing] = await db
            .select({ id: contactManagementTable.id })
            .from(contactManagementTable)
            .where(and(
              eq(contactManagementTable.userId, ctx.user.id),
              eq(contactManagementTable.phone, phone),
              eq(contactManagementTable.listType, "dnc")
            ))
            .limit(1);
          if (existing) { skipped++; continue; }
          // Find matching contact if exists
          const [matchedContact] = await db
            .select({ id: contacts.id })
            .from(contacts)
            .where(and(eq(contacts.userId, ctx.user.id), eq(contacts.phone, phone)))
            .limit(1);
          await db.insert(contactManagementTable).values({
            userId: ctx.user.id,
            contactId: matchedContact?.id ?? 0,
            phone,
            listType: "dnc",
            reason: input.reason ?? "Bulk DNC import",
          });
          // Also update dncStatus on the contact record if found
          if (matchedContact) {
            await db.update(contacts).set({ dncStatus: "internal_dnc" })
              .where(and(eq(contacts.id, matchedContact.id), eq(contacts.userId, ctx.user.id)));
          }
          added++;
        }
        return { added, skipped, total: input.phones.length };
      }),

    // Convenience: mark a contact as internal DNC from any screen
    markDnc: protectedProcedure
      .input(z.object({ contactId: z.number(), phone: z.string(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        // Add to contactManagement DNC list
        await addToContactManagement(ctx.user.id, input.contactId, input.phone, "dnc", input.reason ?? "Marked DNC from messenger");
        // Also update the contact's dncStatus column
        await db
          .update(contacts)
          .set({ dncStatus: "internal_dnc" })
          .where(and(eq(contacts.id, input.contactId), eq(contacts.userId, ctx.user.id)));
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

  // ─── DNC Scrubbing ─────────────────────────────────────────────────────────
  dnc: router({
    // Scrub a single phone number against internal DNC + TCPA Litigator API
    scrubPhone: protectedProcedure
      .input(z.object({ phone: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const normalized = input.phone.replace(/[^\d]/g, "");

        // 1. Check internal DNC list
        const internalDnc = await db
          .select()
          .from(contactManagementTable)
          .where(eq(contactManagementTable.phone, input.phone))
          .limit(1);

        if (internalDnc.length > 0 && internalDnc[0].listType === "dnc") {
          return { phone: input.phone, clean: false, reason: "internal_dnc", status: "Internal DNC" };
        }

        // 2. Check TCPA Litigator API if credentials are set
        const apiKey = process.env.TCPA_LITIGATOR_API_KEY;
        const apiPassword = process.env.TCPA_LITIGATOR_API_PASSWORD;

        if (apiKey && apiPassword) {
          try {
            const url = `https://api.tcpalitigatorlist.com/scrub/phone/all/${normalized}`;
            const credentials = Buffer.from(`${apiKey}:${apiPassword}`).toString("base64");
            const response = await fetch(url, {
              headers: { Authorization: `Basic ${credentials}` },
            });
            if (response.ok) {
              const data = await response.json() as any;
              const result = data?.results;
              if (result && result.clean === 0) {
                const statusArr: string[] = result.status_array || [];
                const isLitigator = statusArr.some((s: string) =>
                  s.toLowerCase().includes("tcpa") || s.toLowerCase().includes("troll")
                );
                const isFederalDnc = statusArr.some((s: string) =>
                  s.toLowerCase().includes("federal") || s.toLowerCase().includes("national")
                );
                const isStateDnc = statusArr.some((s: string) =>
                  s.toLowerCase().includes("state")
                );
                const isDncComplainer = statusArr.some((s: string) =>
                  s.toLowerCase().includes("complainer")
                );

                return {
                  phone: input.phone,
                  clean: false,
                  reason: isLitigator ? "litigator" : isFederalDnc ? "federal_dnc" : isStateDnc ? "state_dnc" : "dnc_complainers",
                  status: result.status || statusArr.join(", "),
                  litigatorFlag: isLitigator,
                };
              }
            }
          } catch (e) {
            console.error("[DNC Scrub] API error:", e);
          }
        }

        return { phone: input.phone, clean: true, reason: "clean", status: "Clean", litigatorFlag: false };
      }),

    // Bulk scrub a list of contact IDs — updates dncStatus and litigatorFlag on each contact
    scrubContacts: protectedProcedure
      .input(z.object({
        contactIds: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const apiKey = process.env.TCPA_LITIGATOR_API_KEY;
        const apiPassword = process.env.TCPA_LITIGATOR_API_PASSWORD;
        const credentials = apiKey && apiPassword
          ? Buffer.from(`${apiKey}:${apiPassword}`).toString("base64")
          : null;

        let clean = 0, internalDncCount = 0, litigatorCount = 0, federalDncCount = 0, errors = 0;

        // Fetch contacts
        const contactRows = await db
          .select({ id: contacts.id, phone: contacts.phone })
          .from(contacts)
          .where(eq(contacts.userId, ctx.user.id));

        const targetContacts = contactRows.filter((c) => input.contactIds.includes(c.id));

        for (const contact of targetContacts) {
          const normalized = contact.phone.replace(/[^\d]/g, "");

          // Check internal DNC
          const internalDnc = await db
            .select()
            .from(contactManagementTable)
            .where(eq(contactManagementTable.phone, contact.phone))
            .limit(1);

          if (internalDnc.length > 0 && internalDnc[0].listType === "dnc") {
            await db.update(contacts)
              .set({ dncStatus: "internal_dnc", litigatorFlag: false, lastScrubbedAt: new Date() })
              .where(eq(contacts.id, contact.id));
            internalDncCount++;
            continue;
          }

          // Check TCPA Litigator API
          if (credentials) {
            try {
              const url = `https://api.tcpalitigatorlist.com/scrub/phone/all/${normalized}`;
              const response = await fetch(url, {
                headers: { Authorization: `Basic ${credentials}` },
              });
              if (response.ok) {
                const data = await response.json() as any;
                const result = data?.results;
                if (result && result.clean === 0) {
                  const statusArr: string[] = result.status_array || [];
                  const isLitigator = statusArr.some((s: string) =>
                    s.toLowerCase().includes("tcpa") || s.toLowerCase().includes("troll")
                  );
                  const isFederalDnc = statusArr.some((s: string) =>
                    s.toLowerCase().includes("federal") || s.toLowerCase().includes("national")
                  );
                  const isStateDnc = statusArr.some((s: string) =>
                    s.toLowerCase().includes("state")
                  );
                  const dncStatusVal = isLitigator ? "internal_dnc" : isFederalDnc ? "federal_dnc" : isStateDnc ? "state_dnc" : "dnc_complainers";
                  await db.update(contacts)
                    .set({ dncStatus: dncStatusVal as any, litigatorFlag: isLitigator, lastScrubbedAt: new Date() })
                    .where(eq(contacts.id, contact.id));
                  if (isLitigator) litigatorCount++;
                  else federalDncCount++;
                  continue;
                }
              }
            } catch (e) {
              errors++;
            }
          }

          // Mark as clean
          await db.update(contacts)
            .set({ dncStatus: "clean", litigatorFlag: false, lastScrubbedAt: new Date() })
            .where(eq(contacts.id, contact.id));
          clean++;
        }

        return { total: targetContacts.length, clean, internalDnc: internalDncCount, litigator: litigatorCount, federalDnc: federalDncCount, errors };
      }),

    // Get DNC summary for current user's contacts
    summary: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { total: 0, clean: 0, internalDnc: 0, federalDnc: 0, stateDnc: 0, dncComplainers: 0, litigators: 0, neverScrubbed: 0 };

      const rows = await db
        .select({ dncStatus: contacts.dncStatus, litigatorFlag: contacts.litigatorFlag, lastScrubbedAt: contacts.lastScrubbedAt })
        .from(contacts)
        .where(eq(contacts.userId, ctx.user.id));

      return {
        total: rows.length,
        clean: rows.filter((r) => r.dncStatus === "clean").length,
        internalDnc: rows.filter((r) => r.dncStatus === "internal_dnc").length,
        federalDnc: rows.filter((r) => r.dncStatus === "federal_dnc").length,
        stateDnc: rows.filter((r) => r.dncStatus === "state_dnc").length,
        dncComplainers: rows.filter((r) => r.dncStatus === "dnc_complainers").length,
        litigators: rows.filter((r) => r.litigatorFlag === true).length,
        neverScrubbed: rows.filter((r) => !r.lastScrubbedAt).length,
      };
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
