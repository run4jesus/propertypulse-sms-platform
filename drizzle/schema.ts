import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // AI global toggle
  aiModeEnabled: boolean("aiModeEnabled").default(false).notNull(),
  // Twilio config
  twilioAccountSid: varchar("twilioAccountSid", { length: 64 }),
  twilioAuthToken: varchar("twilioAuthToken", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Phone Numbers ────────────────────────────────────────────────────────────
export const phoneNumbers = mysqlTable("phone_numbers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  twilioSid: varchar("twilioSid", { length: 64 }),
  friendlyName: varchar("friendlyName", { length: 100 }),
  status: mysqlEnum("status", ["active", "inactive", "pending"]).default("active").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  smsSent: int("smsSent").default(0).notNull(),
  blockRate: float("blockRate").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PhoneNumber = typeof phoneNumbers.$inferSelect;

// ─── Labels ───────────────────────────────────────────────────────────────────
export const labels = mysqlTable("labels", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  color: varchar("color", { length: 20 }).notNull().default("#6366f1"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Label = typeof labels.$inferSelect;

// ─── Contact Lists ────────────────────────────────────────────────────────────
export const contactLists = mysqlTable("contact_lists", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  contactCount: int("contactCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContactList = typeof contactLists.$inferSelect;

// ─── Contacts ─────────────────────────────────────────────────────────────────
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  propertyAddress: text("propertyAddress"),
  notes: text("notes"),
  optedOut: boolean("optedOut").default(false).notNull(),
  // AI-extracted fields
  motivationLevel: mysqlEnum("motivationLevel", ["low", "medium", "high", "unknown"]).default("unknown"),
  timeline: varchar("timeline", { length: 100 }),
  askingPrice: varchar("askingPrice", { length: 50 }),
  leadScore: int("leadScore").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

// ─── Contact ↔ Label (many-to-many) ──────────────────────────────────────────
export const contactLabels = mysqlTable("contact_labels", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId").notNull(),
  labelId: int("labelId").notNull(),
});

// ─── Contact ↔ List (many-to-many) ───────────────────────────────────────────
export const contactListMembers = mysqlTable("contact_list_members", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId").notNull(),
  listId: int("listId").notNull(),
});

// ─── Conversations ────────────────────────────────────────────────────────────
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contactId: int("contactId").notNull(),
  phoneNumberId: int("phoneNumberId"),
  // AI per-conversation toggle
  aiEnabled: boolean("aiEnabled").default(false).notNull(),
  // Lead scoring
  leadScore: int("leadScore").default(0),
  // Extracted info
  extractedInfo: json("extractedInfo"),
  lastMessageAt: timestamp("lastMessageAt").defaultNow(),
  lastMessagePreview: varchar("lastMessagePreview", { length: 200 }),
  unreadCount: int("unreadCount").default(0).notNull(),
  isStarred: boolean("isStarred").default(false).notNull(),
  status: mysqlEnum("status", ["active", "awaiting_reply", "unreplied", "opted_out", "closed"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;

// ─── Conversation ↔ Label ─────────────────────────────────────────────────────
export const conversationLabels = mysqlTable("conversation_labels", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  labelId: int("labelId").notNull(),
});

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  userId: int("userId").notNull(),
  direction: mysqlEnum("direction", ["outbound", "inbound"]).notNull(),
  body: text("body").notNull(),
  twilioSid: varchar("twilioSid", { length: 64 }),
  status: mysqlEnum("status", ["queued", "sent", "delivered", "failed", "received", "undelivered"]).default("queued").notNull(),
  isAiGenerated: boolean("isAiGenerated").default(false).notNull(),
  campaignId: int("campaignId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ─── Campaign Templates ───────────────────────────────────────────────────────
export const campaignTemplates = mysqlTable("campaign_templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  body: text("body").notNull(),
  category: varchar("category", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CampaignTemplate = typeof campaignTemplates.$inferSelect;

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["standard", "drip"]).default("standard").notNull(),
  status: mysqlEnum("status", ["draft", "scheduled", "active", "paused", "completed", "cancelled"]).default("draft").notNull(),
  contactListId: int("contactListId"),
  phoneNumberId: int("phoneNumberId"),
  scheduledAt: timestamp("scheduledAt"),
  completedAt: timestamp("completedAt"),
  // AI toggle for this campaign
  aiEnabled: boolean("aiEnabled").default(false).notNull(),
  // Batch throttling — how many messages per batch and how many minutes between batches
  batchSize: int("batchSize").default(10).notNull(),
  batchIntervalMinutes: int("batchIntervalMinutes").default(5).notNull(),
  // Stats
  totalContacts: int("totalContacts").default(0).notNull(),
  sent: int("sent").default(0).notNull(),
  delivered: int("delivered").default(0).notNull(),
  replied: int("replied").default(0).notNull(),
  optedOut: int("optedOut").default(0).notNull(),
  failed: int("failed").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

// ─── Campaign Steps (drip sequences) ─────────────────────────────────────────
export const campaignSteps = mysqlTable("campaign_steps", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  stepNumber: int("stepNumber").notNull(),
  body: text("body").notNull(),
  delayDays: int("delayDays").default(0).notNull(),
  delayHours: int("delayHours").default(0).notNull(),
  sent: int("sent").default(0).notNull(),
  delivered: int("delivered").default(0).notNull(),
  replied: int("replied").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CampaignStep = typeof campaignSteps.$inferSelect;

// ─── Call Recordings ──────────────────────────────────────────────────────────
export const callRecordings = mysqlTable("call_recordings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contactId: int("contactId").notNull(),
  conversationId: int("conversationId"),
  audioUrl: text("audioUrl"),
  transcription: text("transcription"),
  duration: int("duration"), // seconds
  calledAt: timestamp("calledAt").defaultNow().notNull(),
  transcriptionStatus: mysqlEnum("transcriptionStatus", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CallRecording = typeof callRecordings.$inferSelect;

// ─── AI Suggestions ───────────────────────────────────────────────────────────
export const aiSuggestions = mysqlTable("ai_suggestions", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  suggestedReply: text("suggestedReply"),
  leadScore: int("leadScore"),
  motivationLevel: varchar("motivationLevel", { length: 20 }),
  extractedInfo: json("extractedInfo"),
  reasoning: text("reasoning"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiSuggestion = typeof aiSuggestions.$inferSelect;
