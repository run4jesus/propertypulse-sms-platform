import { and, desc, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  aiSuggestions,
  callRecordings,
  campaignSteps,
  campaignTemplates,
  campaigns,
  contactGroupMembers,
  contactGroups,
  contactLabels,
  contactListMembers,
  contactLists,
  contactManagement,
  contacts,
  conversationLabels,
  conversations,
  customFields,
  calendarEvents,
  keywordCampaigns,
  labels,
  macros,
  messages,
  phoneNumbers,
  users,
  workflowSteps,
  workflows,
  type InsertCampaign,
  type InsertContact,
  type InsertMessage,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function updateUserAiMode(userId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ aiModeEnabled: enabled }).where(eq(users.id, userId));
}

export async function updateUserTwilio(userId: number, accountSid: string, authToken: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ twilioAccountSid: accountSid, twilioAuthToken: authToken }).where(eq(users.id, userId));
}

// ─── Phone Numbers ────────────────────────────────────────────────────────────
export async function getPhoneNumbers(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(phoneNumbers).where(eq(phoneNumbers.userId, userId));
}

export async function addPhoneNumber(data: { userId: number; phoneNumber: string; twilioSid?: string; friendlyName?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(phoneNumbers).values({ ...data, status: "active" });
}

export async function deletePhoneNumber(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(phoneNumbers).where(and(eq(phoneNumbers.id, id), eq(phoneNumbers.userId, userId)));
}

// ─── Labels ───────────────────────────────────────────────────────────────────
export async function getLabels(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(labels).where(eq(labels.userId, userId));
}

export async function updateLabel(id: number, userId: number, name: string, color: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(labels).set({ name, color }).where(and(eq(labels.id, id), eq(labels.userId, userId)));
}

const DEFAULT_LABELS = [
  { name: "Hot Lead", color: "#ef4444" },
  { name: "Interested", color: "#22c55e" },
  { name: "Not Interested", color: "#6b7280" },
  { name: "Wrong Number", color: "#f97316" },
  { name: "Callback Requested", color: "#3b82f6" },
  { name: "Under Contract", color: "#8b5cf6" },
  { name: "Closed", color: "#14b8a6" },
  { name: "DNC", color: "#dc2626" },
];

export async function seedDefaultLabels(userId: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(labels).where(eq(labels.userId, userId));
  if (existing.length > 0) return; // already has labels, skip
  await db.insert(labels).values(DEFAULT_LABELS.map((l) => ({ userId, name: l.name, color: l.color })));
}

export async function createLabel(userId: number, name: string, color: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(labels).values({ userId, name, color });
}

export async function deleteLabel(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(labels).where(and(eq(labels.id, id), eq(labels.userId, userId)));
}

// ─── Contact Lists ────────────────────────────────────────────────────────────
export async function getContactLists(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contactLists).where(eq(contactLists.userId, userId)).orderBy(desc(contactLists.createdAt));
}

export async function createContactList(userId: number, name: string, description?: string) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(contactLists).values({ userId, name, description });
  return result;
}

// ─── Contacts ─────────────────────────────────────────────────────────────────
export async function getContacts(userId: number, opts?: { search?: string; labelId?: number; listId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { contacts: [], total: 0 };

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  let query = db.select().from(contacts).where(eq(contacts.userId, userId));

  if (opts?.search) {
    const s = `%${opts.search}%`;
    query = db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.userId, userId),
          or(
            like(contacts.firstName, s),
            like(contacts.lastName, s),
            like(contacts.phone, s),
            like(contacts.propertyAddress, s)
          )
        )
      );
  }

  const rows = await query.limit(limit).offset(offset).orderBy(desc(contacts.createdAt));
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(contacts).where(eq(contacts.userId, userId));
  return { contacts: rows, total: countResult[0]?.count ?? 0 };
}

export async function getContactById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId))).limit(1);
  return result[0];
}

export async function createContact(data: InsertContact) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(contacts).values(data);
  return result;
}

export async function updateContact(id: number, userId: number, data: Partial<InsertContact>) {
  const db = await getDb();
  if (!db) return;
  await db.update(contacts).set(data).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
}

export async function deleteContact(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
}

export async function bulkInsertContacts(rows: InsertContact[]) {
  const db = await getDb();
  if (!db || rows.length === 0) return;
  // Insert in batches of 100
  for (let i = 0; i < rows.length; i += 100) {
    await db.insert(contacts).values(rows.slice(i, i + 100));
  }
}

export async function assignLabelToContact(contactId: number, labelId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(contactLabels).values({ contactId, labelId }).onDuplicateKeyUpdate({ set: { labelId } });
}

export async function removeLabelFromContact(contactId: number, labelId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(contactLabels).where(and(eq(contactLabels.contactId, contactId), eq(contactLabels.labelId, labelId)));
}

export async function getContactLabels(contactId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contactLabels).where(eq(contactLabels.contactId, contactId));
}

export async function addContactToList(contactId: number, listId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(contactListMembers).values({ contactId, listId }).onDuplicateKeyUpdate({ set: { listId } });
}

// ─── Conversations ────────────────────────────────────────────────────────────
export async function getConversations(userId: number, opts?: { status?: string; labelId?: number; search?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const rows = await db
    .select({
      conversation: conversations,
      contact: contacts,
    })
    .from(conversations)
    .innerJoin(contacts, eq(conversations.contactId, contacts.id))
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(limit)
    .offset(offset);

  return rows;
}

export async function getConversationById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ conversation: conversations, contact: contacts })
    .from(conversations)
    .innerJoin(contacts, eq(conversations.contactId, contacts.id))
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
    .limit(1);
  return result[0];
}

export async function getOrCreateConversation(userId: number, contactId: number, phoneNumberId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.contactId, contactId)))
    .limit(1);
  if (existing[0]) return existing[0];
  await db.insert(conversations).values({ userId, contactId, phoneNumberId, status: "active" });
  const created = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.contactId, contactId)))
    .limit(1);
  return created[0];
}

export async function updateConversation(id: number, userId: number, data: Partial<typeof conversations.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(conversations).set(data).where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
}

export async function assignLabelToConversation(conversationId: number, labelId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(conversationLabels).values({ conversationId, labelId }).onDuplicateKeyUpdate({ set: { labelId } });
}

export async function removeLabelFromConversation(conversationId: number, labelId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(conversationLabels).where(and(eq(conversationLabels.conversationId, conversationId), eq(conversationLabels.labelId, labelId)));
}

export async function getConversationLabels(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ label: labels })
    .from(conversationLabels)
    .innerJoin(labels, eq(conversationLabels.labelId, labels.id))
    .where(eq(conversationLabels.conversationId, conversationId));
}

// ─── Messages ─────────────────────────────────────────────────────────────────
export async function getMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
}

// ─── Unified thread: all messages for a contact phone across all conversations ──
export async function getMessagesByContactPhone(userId: number, contactPhone: string) {
  const db = await getDb();
  if (!db) return [];

  // Normalize phone to digits only for matching
  const normalizedPhone = contactPhone.replace(/\D/g, "");

  // Find all contacts for this user with this phone number (normalized)
  const matchingContacts = await db
    .select({ id: contacts.id, phone: contacts.phone })
    .from(contacts)
    .where(eq(contacts.userId, userId));

  const contactIds = matchingContacts
    .filter((c) => c.phone.replace(/\D/g, "") === normalizedPhone)
    .map((c) => c.id);

  if (contactIds.length === 0) return [];

  // Find all conversations for these contacts
  const convRows = await db
    .select({ id: conversations.id, phoneNumberId: conversations.phoneNumberId })
    .from(conversations)
    .where(and(eq(conversations.userId, userId), inArray(conversations.contactId, contactIds)));

  if (convRows.length === 0) return [];

  const convIds = convRows.map((c) => c.id);

  // Get all messages from all those conversations, with their conversation's phoneNumberId
  const rows = await db
    .select({
      message: messages,
      phoneNumberId: conversations.phoneNumberId,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(inArray(messages.conversationId, convIds))
    .orderBy(messages.createdAt);

  return rows;
}

export async function createMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(messages).values(data);
  // Update conversation last message
  await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(),
      lastMessagePreview: data.body.substring(0, 200),
      status: data.direction === "inbound" ? "awaiting_reply" : "active",
    })
    .where(eq(conversations.id, data.conversationId));
  return result;
}

export async function updateMessageStatus(twilioSid: string, status: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(messages).set({ status: status as any }).where(eq(messages.twilioSid, twilioSid));
}

// ─── Campaigns ────────────────────────────────────────────────────────────────
export async function getCampaigns(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.createdAt));
}

export async function getCampaignById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.userId, userId))).limit(1);
  return result[0];
}

export async function createCampaign(data: InsertCampaign) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(campaigns).values(data);
  return result;
}

export async function updateCampaign(id: number, userId: number, data: Partial<InsertCampaign>) {
  const db = await getDb();
  if (!db) return;
  await db.update(campaigns).set(data).where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
}

export async function deleteCampaign(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
}

export async function getCampaignSteps(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaignSteps).where(eq(campaignSteps.campaignId, campaignId)).orderBy(campaignSteps.stepNumber);
}

export async function createCampaignStep(data: { campaignId: number; stepNumber: number; body: string; delayDays: number; delayHours: number }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(campaignSteps).values(data);
}

export async function deleteCampaignSteps(campaignId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(campaignSteps).where(eq(campaignSteps.campaignId, campaignId));
}

// ─── Campaign Templates ───────────────────────────────────────────────────────
export async function getCampaignTemplates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaignTemplates).where(eq(campaignTemplates.userId, userId));
}

export async function createCampaignTemplate(userId: number, name: string, body: string, category?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(campaignTemplates).values({ userId, name, body, category });
}

export async function updateCampaignTemplate(
  id: number,
  userId: number,
  data: { name?: string; body?: string; category?: string }
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(campaignTemplates)
    .set(data)
    .where(and(eq(campaignTemplates.id, id), eq(campaignTemplates.userId, userId)));
}

export async function deleteCampaignTemplate(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(campaignTemplates)
    .where(and(eq(campaignTemplates.id, id), eq(campaignTemplates.userId, userId)));
}

// ─── AI Suggestions ───────────────────────────────────────────────────────────
export async function getLatestAiSuggestion(conversationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(aiSuggestions)
    .where(eq(aiSuggestions.conversationId, conversationId))
    .orderBy(desc(aiSuggestions.createdAt))
    .limit(1);
  return result[0];
}

export async function saveAiSuggestion(data: { conversationId: number; suggestedReply?: string; leadScore?: number; motivationLevel?: string; extractedInfo?: object; reasoning?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(aiSuggestions).values(data);
}

// ─── Call Recordings ──────────────────────────────────────────────────────────
export async function getCallRecordings(userId: number, contactId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (contactId) {
    return db.select().from(callRecordings).where(and(eq(callRecordings.userId, userId), eq(callRecordings.contactId, contactId))).orderBy(desc(callRecordings.calledAt));
  }
  return db.select().from(callRecordings).where(eq(callRecordings.userId, userId)).orderBy(desc(callRecordings.calledAt));
}

export async function createCallRecording(data: { userId: number; contactId: number; conversationId?: number; audioUrl?: string; duration?: number; notes?: string; calledAt?: Date }) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(callRecordings).values({ ...data, transcriptionStatus: "pending" });
  return result;
}

export async function updateCallRecordingTranscription(id: number, transcription: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(callRecordings).set({ transcription, transcriptionStatus: "completed" }).where(eq(callRecordings.id, id));
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export async function getDashboardStats(userId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return null;

  // Build date range condition for messages
  const dateFilter = startDate && endDate
    ? and(gte(messages.createdAt, startDate), lte(messages.createdAt, endDate))
    : undefined;

  const msgBase = and(eq(messages.userId, userId), dateFilter);

  const [totalSent] = await db.select({ count: sql<number>`count(*)` }).from(messages).where(and(msgBase, eq(messages.direction, "outbound")));
  const [totalReceived] = await db.select({ count: sql<number>`count(*)` }).from(messages).where(and(msgBase, eq(messages.direction, "inbound")));
  const [totalDelivered] = await db.select({ count: sql<number>`count(*)` }).from(messages).where(and(msgBase, eq(messages.status, "delivered")));
  const [totalContacts] = await db.select({ count: sql<number>`count(*)` }).from(contacts).where(eq(contacts.userId, userId));
  const [totalCampaigns] = await db.select({ count: sql<number>`count(*)` }).from(campaigns).where(eq(campaigns.userId, userId));
  const [activeCampaigns] = await db.select({ count: sql<number>`count(*)` }).from(campaigns).where(and(eq(campaigns.userId, userId), eq(campaigns.status, "active")));

  // Daily breakdown for chart — last 7 days or within range
  const chartStart = startDate ?? new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  const chartEnd = endDate ?? new Date();
  const days: { date: string; sent: number; received: number }[] = [];
  const cursor = new Date(chartStart);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= chartEnd) {
    const dayStart = new Date(cursor);
    const dayEnd = new Date(cursor);
    dayEnd.setHours(23, 59, 59, 999);
    const [s] = await db.select({ count: sql<number>`count(*)` }).from(messages).where(and(eq(messages.userId, userId), eq(messages.direction, "outbound"), gte(messages.createdAt, dayStart), lte(messages.createdAt, dayEnd)));
    const [r] = await db.select({ count: sql<number>`count(*)` }).from(messages).where(and(eq(messages.userId, userId), eq(messages.direction, "inbound"), gte(messages.createdAt, dayStart), lte(messages.createdAt, dayEnd)));
    days.push({
      date: cursor.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      sent: s?.count ?? 0,
      received: r?.count ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const sent = totalSent?.count ?? 0;
  const received = totalReceived?.count ?? 0;
  const delivered = totalDelivered?.count ?? 0;

  return {
    totalSent: sent,
    totalReceived: received,
    totalDelivered: delivered,
    deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
    replyRate: sent > 0 ? Math.round((received / sent) * 100) : 0,
    totalContacts: totalContacts?.count ?? 0,
    totalCampaigns: totalCampaigns?.count ?? 0,
    activeCampaigns: activeCampaigns?.count ?? 0,
    dailyBreakdown: days,
  };
}

// ─── Contact Groups ───────────────────────────────────────────────────────────
export async function getContactGroups(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contactGroups).where(eq(contactGroups.userId, userId)).orderBy(contactGroups.name);
}

export async function createContactGroup(userId: number, name: string, description?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(contactGroups).values({ userId, name, description });
}

export async function updateContactGroup(id: number, userId: number, data: { name?: string; description?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(contactGroups).set(data).where(and(eq(contactGroups.id, id), eq(contactGroups.userId, userId)));
}

export async function deleteContactGroup(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(contactGroups).where(and(eq(contactGroups.id, id), eq(contactGroups.userId, userId)));
}

export async function addContactToGroup(contactId: number, groupId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(contactGroupMembers).values({ contactId, groupId }).onDuplicateKeyUpdate({ set: { contactId } });
}

export async function removeContactFromGroup(contactId: number, groupId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(contactGroupMembers).where(and(eq(contactGroupMembers.contactId, contactId), eq(contactGroupMembers.groupId, groupId)));
}

export async function getGroupMembers(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ contact: contacts }).from(contactGroupMembers).innerJoin(contacts, eq(contactGroupMembers.contactId, contacts.id)).where(eq(contactGroupMembers.groupId, groupId));
}

// ─── Contact Management Lists ─────────────────────────────────────────────────
export async function getContactManagementList(userId: number, listType?: string) {
  const db = await getDb();
  if (!db) return [];
  if (listType) {
    return db.select().from(contactManagement).where(and(eq(contactManagement.userId, userId), eq(contactManagement.listType, listType as any))).orderBy(desc(contactManagement.addedAt));
  }
  return db.select().from(contactManagement).where(eq(contactManagement.userId, userId)).orderBy(desc(contactManagement.addedAt));
}

export async function addToContactManagement(userId: number, contactId: number, phone: string, listType: string, reason?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(contactManagement).values({ userId, contactId, phone, listType: listType as any, reason });
}

export async function removeFromContactManagement(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(contactManagement).where(and(eq(contactManagement.id, id), eq(contactManagement.userId, userId)));
}

// ─── Macros ───────────────────────────────────────────────────────────────────
export async function getMacros(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(macros).where(eq(macros.userId, userId)).orderBy(macros.name);
}

export async function createMacro(userId: number, name: string, body: string, shortcut?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(macros).values({ userId, name, body, shortcut });
}

export async function updateMacro(id: number, userId: number, data: { name?: string; body?: string; shortcut?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(macros).set(data).where(and(eq(macros.id, id), eq(macros.userId, userId)));
}

export async function deleteMacro(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(macros).where(and(eq(macros.id, id), eq(macros.userId, userId)));
}

export async function incrementMacroUsage(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(macros).set({ usageCount: sql<number>`usageCount + 1` }).where(eq(macros.id, id));
}

// ─── Keyword Campaigns ────────────────────────────────────────────────────────
export async function getKeywordCampaigns(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(keywordCampaigns).where(eq(keywordCampaigns.userId, userId)).orderBy(desc(keywordCampaigns.createdAt));
}

export async function createKeywordCampaign(data: { userId: number; name: string; keyword: string; replyMessage: string; phoneNumberId?: number }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(keywordCampaigns).values(data);
}

export async function updateKeywordCampaign(id: number, userId: number, data: { name?: string; keyword?: string; replyMessage?: string; status?: "active" | "paused" | "draft"; phoneNumberId?: number }) {
  const db = await getDb();
  if (!db) return;
  await db.update(keywordCampaigns).set(data).where(and(eq(keywordCampaigns.id, id), eq(keywordCampaigns.userId, userId)));
}

export async function deleteKeywordCampaign(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(keywordCampaigns).where(and(eq(keywordCampaigns.id, id), eq(keywordCampaigns.userId, userId)));
}

// ─── Workflows ────────────────────────────────────────────────────────────────
export async function getWorkflows(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflows).where(eq(workflows.userId, userId)).orderBy(desc(workflows.createdAt));
}

export async function getWorkflowById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workflows).where(and(eq(workflows.id, id), eq(workflows.userId, userId))).limit(1);
  return result[0];
}

export async function createWorkflow(userId: number, name: string, description?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(workflows).values({ userId, name, description });
}

export async function updateWorkflow(id: number, userId: number, data: { name?: string; description?: string; status?: "active" | "inactive"; totalMessages?: number; totalDays?: number }) {
  const db = await getDb();
  if (!db) return;
  await db.update(workflows).set(data).where(and(eq(workflows.id, id), eq(workflows.userId, userId)));
}

export async function deleteWorkflow(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(workflows).where(and(eq(workflows.id, id), eq(workflows.userId, userId)));
}

export async function getWorkflowSteps(workflowId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflowSteps).where(eq(workflowSteps.workflowId, workflowId)).orderBy(workflowSteps.stepNumber);
}

export async function createWorkflowStep(data: { workflowId: number; stepNumber: number; body: string; delayDays: number; actionOnNoReply?: boolean; noReplyHours?: number; addToGroupId?: number; addLabelId?: number }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(workflowSteps).values(data);
}

export async function deleteWorkflowSteps(workflowId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(workflowSteps).where(eq(workflowSteps.workflowId, workflowId));
}

// ─── Custom Fields ────────────────────────────────────────────────────────────
export async function getCustomFields(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customFields).where(eq(customFields.userId, userId)).orderBy(customFields.name);
}

export async function createCustomField(userId: number, name: string, fieldKey: string, fieldType: "text" | "number" | "date" | "boolean") {
  const db = await getDb();
  if (!db) return;
  await db.insert(customFields).values({ userId, name, fieldKey, fieldType });
}

export async function deleteCustomField(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(customFields).where(and(eq(customFields.id, id), eq(customFields.userId, userId)));
}

// ─── Calendar Events ──────────────────────────────────────────────────────────
export async function getCalendarEvents(userId: number, startAt?: Date, endAt?: Date) {
  const db = await getDb();
  if (!db) return [];
  if (startAt && endAt) {
    return db.select().from(calendarEvents).where(and(eq(calendarEvents.userId, userId), gte(calendarEvents.startAt, startAt), lte(calendarEvents.startAt, endAt))).orderBy(calendarEvents.startAt);
  }
  return db.select().from(calendarEvents).where(eq(calendarEvents.userId, userId)).orderBy(calendarEvents.startAt);
}

export async function createCalendarEvent(data: { userId: number; contactId?: number; title: string; description?: string; startAt: Date; endAt: Date; allDay?: boolean; type?: "appointment" | "follow_up" | "call" | "other" }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(calendarEvents).values(data);
}

export async function updateCalendarEvent(id: number, userId: number, data: { title?: string; description?: string; startAt?: Date; endAt?: Date; allDay?: boolean; type?: "appointment" | "follow_up" | "call" | "other" }) {
  const db = await getDb();
  if (!db) return;
  await db.update(calendarEvents).set(data).where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)));
}

export async function deleteCalendarEvent(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(calendarEvents).where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)));
}

// ─── Reporting Stats ──────────────────────────────────────────────────────────
export async function getReportingStats(
  userId: number,
  opts?: {
    startDate?: Date;
    endDate?: Date;
    campaignId?: number;
    templateId?: number;
  }
) {
  const db = await getDb();
  if (!db) return null;

  const { startDate, endDate, campaignId } = opts ?? {};

  // Build base date filter for messages
  const dateFilter =
    startDate && endDate
      ? and(gte(messages.createdAt, startDate), lte(messages.createdAt, endDate))
      : startDate
      ? gte(messages.createdAt, startDate)
      : endDate
      ? lte(messages.createdAt, endDate)
      : undefined;

  const msgBase = and(eq(messages.userId, userId), dateFilter);
  const outboundBase = and(msgBase, eq(messages.direction, "outbound"));
  const inboundBase = and(msgBase, eq(messages.direction, "inbound"));

  // SMS sent (outbound messages)
  const [smsSent] = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(outboundBase);

  // SMS segments sent (estimate: count chars / 160 per message, min 1)
  const [segmentData] = await db
    .select({ total: sql<number>`sum(ceil(length(body) / 160))` })
    .from(messages)
    .where(outboundBase);

  // Replies received (inbound messages)
  const [repliesReceived] = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(inboundBase);

  // Delivered messages
  const [delivered] = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(and(outboundBase, eq(messages.status, "delivered")));

  // Failed messages (carrier blocked)
  const [failed] = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(and(outboundBase, eq(messages.status, "failed")));

  // Opt-outs in period
  const convDateFilter =
    startDate && endDate
      ? and(gte(conversations.updatedAt, startDate), lte(conversations.updatedAt, endDate))
      : undefined;

  const [optOuts] = await db
    .select({ count: sql<number>`count(*)` })
    .from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.status, "opted_out"), convDateFilter));

  // Total contacts
  const contactDateFilter =
    startDate && endDate
      ? and(gte(contacts.createdAt, startDate), lte(contacts.createdAt, endDate))
      : undefined;

  const [totalContacts] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contacts)
    .where(and(eq(contacts.userId, userId), contactDateFilter));

  // Leads = conversations with disposition "interested" or "callback_requested"
  const [leads] = await db
    .select({ count: sql<number>`count(*)` })
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        or(
          eq(conversations.disposition, "interested"),
          eq(conversations.disposition, "callback_requested")
        ),
        convDateFilter
      )
    );

  // Standard campaigns count
  const campaignDateFilter =
    startDate && endDate
      ? and(gte(campaigns.createdAt, startDate), lte(campaigns.createdAt, endDate))
      : undefined;

  const [standardCampaigns] = await db
    .select({ count: sql<number>`count(*)` })
    .from(campaigns)
    .where(and(eq(campaigns.userId, userId), campaignDateFilter));

  // Keyword campaigns count
  const [kwCampaigns] = await db
    .select({ count: sql<number>`count(*)` })
    .from(keywordCampaigns)
    .where(eq(keywordCampaigns.userId, userId));

  const sent = smsSent?.count ?? 0;
  const recv = repliesReceived?.count ?? 0;
  const dlv = delivered?.count ?? 0;
  const fail = failed?.count ?? 0;
  const optOutCount = optOuts?.count ?? 0;
  const contactCount = totalContacts?.count ?? 0;
  const leadCount = leads?.count ?? 0;

  return {
    smsSent: sent,
    smsSegmentsSent: segmentData?.total ?? sent, // fallback to sent count
    carrierBlockRate: sent > 0 ? parseFloat(((fail / sent) * 100).toFixed(2)) : 0,
    repliesReceived: recv,
    deliveryRate: sent > 0 ? parseFloat(((dlv / sent) * 100).toFixed(2)) : 0,
    optOutRate: sent > 0 ? parseFloat(((optOutCount / sent) * 100).toFixed(2)) : 0,
    aiFilteringRate: 0, // placeholder — would need AI filter tracking
    replyRate: sent > 0 ? parseFloat(((recv / sent) * 100).toFixed(2)) : 0,
    medianResponseTime: 0, // placeholder — complex to compute
    leads: leadCount,
    contacts: contactCount,
    smsToLeadRate: sent > 0 ? parseFloat(((leadCount / sent) * 100).toFixed(2)) : 0,
    contactToLeadRate: contactCount > 0 ? parseFloat(((leadCount / contactCount) * 100).toFixed(2)) : 0,
    standardCampaigns: standardCampaigns?.count ?? 0,
    keywordCampaigns: kwCampaigns?.count ?? 0,
  };
}
