import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  aiSuggestions,
  callRecordings,
  campaignSteps,
  campaignTemplates,
  campaigns,
  contactLabels,
  contactListMembers,
  contactLists,
  contacts,
  conversationLabels,
  conversations,
  labels,
  messages,
  phoneNumbers,
  users,
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
export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const [totalSent] = await db.select({ count: sql<number>`count(*)` }).from(messages).where(and(eq(messages.userId, userId), eq(messages.direction, "outbound")));
  const [totalReceived] = await db.select({ count: sql<number>`count(*)` }).from(messages).where(and(eq(messages.userId, userId), eq(messages.direction, "inbound")));
  const [totalDelivered] = await db.select({ count: sql<number>`count(*)` }).from(messages).where(and(eq(messages.userId, userId), eq(messages.status, "delivered")));
  const [totalContacts] = await db.select({ count: sql<number>`count(*)` }).from(contacts).where(eq(contacts.userId, userId));
  const [totalCampaigns] = await db.select({ count: sql<number>`count(*)` }).from(campaigns).where(eq(campaigns.userId, userId));
  const [activeCampaigns] = await db.select({ count: sql<number>`count(*)` }).from(campaigns).where(and(eq(campaigns.userId, userId), eq(campaigns.status, "active")));

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
  };
}
