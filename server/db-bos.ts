import {
  deals, contracts, tasks, pullCadences, dispositions, goals,
  conversations,
} from "../drizzle/schema";
import type { Deal, Contract, Task, PullCadence, Disposition, Goal } from "../drizzle/schema";
import { eq, and, desc, asc, or } from "drizzle-orm";
import { getDb } from "./db";

// ─── Deals ────────────────────────────────────────────────────────────────────
export async function getDeals(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deals).where(eq(deals.userId, userId)).orderBy(desc(deals.updatedAt));
}

export async function getDealById(userId: number, id: number) {
  const db = await getDb();
  if (!db) return null;
  const [deal] = await db.select().from(deals).where(and(eq(deals.id, id), eq(deals.userId, userId)));
  return deal ?? null;
}

export async function createDeal(userId: number, data: {
  title: string;
  propertyAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  propertyType?: "sfr" | "land" | "multi_family" | "commercial" | "other";
  stage?: "new_lead" | "contact_attempted" | "qualified" | "appointment_set" | "offer_made" | "under_contract" | "dispo_marketing" | "buyer_found" | "closing_scheduled" | "closed_paid" | "dead_lost";
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  askingPrice?: number;
  offerPrice?: number;
  contractPrice?: number;
  assignmentFee?: number;
  closingDate?: Date;
  notes?: string;
  conversationId?: number;
  contactId?: number;
  isLead?: boolean;
}) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(deals).values({ userId, ...data });
  const insertId = (result as any).insertId;
  return getDealById(userId, insertId);
}

export async function updateDeal(userId: number, id: number, data: Partial<Omit<Deal, "id" | "userId" | "createdAt">>) {
  const db = await getDb();
  if (!db) return null;
  await db.update(deals).set({ ...data, updatedAt: new Date() }).where(and(eq(deals.id, id), eq(deals.userId, userId)));
  return getDealById(userId, id);
}

export async function deleteDeal(userId: number, id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(deals).where(and(eq(deals.id, id), eq(deals.userId, userId)));
}

export async function getDealStats(userId: number) {
  const allDeals = await getDeals(userId);
  const activeDeals = allDeals.filter((d: Deal) => !["closed_paid", "dead_lost"].includes(d.stage));
  const closedDeals = allDeals.filter((d: Deal) => d.stage === "closed_paid");
  const pipelineValue = activeDeals.reduce((sum: number, d: Deal) => sum + (d.contractPrice ?? d.offerPrice ?? d.askingPrice ?? 0), 0);
  const totalRevenue = closedDeals.reduce((sum: number, d: Deal) => sum + (d.assignmentFee ?? 0), 0);
  const avgFee = closedDeals.length > 0 ? Math.round(totalRevenue / closedDeals.length) : 0;
  return { activeDeals: activeDeals.length, closedDeals: closedDeals.length, pipelineValue, totalRevenue, avgFee };
}

// ─── Contracts ────────────────────────────────────────────────────────────────
export async function getContracts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contracts).where(eq(contracts.userId, userId)).orderBy(desc(contracts.updatedAt));
}

export async function getContractById(userId: number, id: number) {
  const db = await getDb();
  if (!db) return null;
  const [c] = await db.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
  return c ?? null;
}

export async function createContract(userId: number, data: {
  title: string;
  dealId?: number;
  contractType?: "purchase_agreement" | "assignment" | "double_close" | "other";
  sellerName?: string;
  buyerName?: string;
  propertyAddress?: string;
  contractPrice?: number;
  assignmentFee?: number;
  closingDate?: Date;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(contracts).values({ userId, ...data });
  const insertId = (result as any).insertId;
  return getContractById(userId, insertId);
}

export async function updateContract(userId: number, id: number, data: Partial<Omit<Contract, "id" | "userId" | "createdAt">>) {
  const db = await getDb();
  if (!db) return null;
  await db.update(contracts).set({ ...data, updatedAt: new Date() }).where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
  return getContractById(userId, id);
}

export async function deleteContract(userId: number, id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(contracts).where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
export async function getTasks(userId: number, statusFilter?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(tasks.userId, userId)];
  if (statusFilter && statusFilter !== "all") {
    conditions.push(eq(tasks.status, statusFilter as any));
  }
  return db.select().from(tasks).where(and(...conditions)).orderBy(asc(tasks.dueDate), desc(tasks.createdAt));
}

export async function getTaskById(userId: number, id: number) {
  const db = await getDb();
  if (!db) return null;
  const [t] = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  return t ?? null;
}

export async function createTask(userId: number, data: {
  title: string;
  description?: string;
  taskType?: "manual" | "needs_offer" | "follow_up" | "contract" | "dispo";
  priority?: "low" | "medium" | "high";
  dueDate?: Date;
  relatedDealId?: number;
  relatedConversationId?: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(tasks).values({ userId, ...data });
  const insertId = (result as any).insertId;
  return getTaskById(userId, insertId);
}

export async function updateTask(userId: number, id: number, data: Partial<Omit<Task, "id" | "userId" | "createdAt">>) {
  const db = await getDb();
  if (!db) return null;
  await db.update(tasks).set({ ...data, updatedAt: new Date() }).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  return getTaskById(userId, id);
}

export async function completeTask(userId: number, id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set({ status: "completed", completedAt: new Date(), updatedAt: new Date() }).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}

export async function deleteTask(userId: number, id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}

// Daily Zero: auto-populate from Needs Offer conversations + pending tasks
export async function getDailyZeroItems(userId: number) {
  const db = await getDb();
  if (!db) return { pendingTasks: [], needsOfferConvs: [] };

  const pendingTasks = await db.select().from(tasks).where(
    and(
      eq(tasks.userId, userId),
      or(eq(tasks.status, "pending"), eq(tasks.status, "in_progress")),
    )
  ).orderBy(asc(tasks.dueDate));

  const needsOfferConvs = await db.select().from(conversations).where(
    and(
      eq(conversations.userId, userId),
      eq(conversations.aiStage, "needs_offer"),
      eq(conversations.podioLeadPushed, false),
    )
  ).orderBy(desc(conversations.lastMessageAt));

  return { pendingTasks, needsOfferConvs };
}

// ─── Pull Cadences ────────────────────────────────────────────────────────────
export async function getPullCadences(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pullCadences).where(eq(pullCadences.userId, userId)).orderBy(asc(pullCadences.nextDueAt));
}

export async function getPullCadenceById(userId: number, id: number) {
  const db = await getDb();
  if (!db) return null;
  const [c] = await db.select().from(pullCadences).where(and(eq(pullCadences.id, id), eq(pullCadences.userId, userId)));
  return c ?? null;
}

export async function createPullCadence(userId: number, data: {
  name: string;
  market: string;
  propertyType: string;
  dataSource?: string;
  frequencyDays?: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const nextDueAt = new Date();
  nextDueAt.setDate(nextDueAt.getDate() + (data.frequencyDays ?? 7));
  const [result] = await db.insert(pullCadences).values({ userId, ...data, nextDueAt });
  const insertId = (result as any).insertId;
  return getPullCadenceById(userId, insertId);
}

export async function updatePullCadence(userId: number, id: number, data: Partial<Omit<PullCadence, "id" | "userId" | "createdAt">>) {
  const db = await getDb();
  if (!db) return null;
  await db.update(pullCadences).set(data).where(and(eq(pullCadences.id, id), eq(pullCadences.userId, userId)));
  return getPullCadenceById(userId, id);
}

export async function markPullCadencePulled(userId: number, id: number) {
  const cadence = await getPullCadenceById(userId, id);
  if (!cadence) return null;
  const db = await getDb();
  if (!db) return null;
  const now = new Date();
  const nextDueAt = new Date();
  nextDueAt.setDate(nextDueAt.getDate() + cadence.frequencyDays);
  await db.update(pullCadences).set({ lastPulledAt: now, nextDueAt }).where(and(eq(pullCadences.id, id), eq(pullCadences.userId, userId)));
  return getPullCadenceById(userId, id);
}

export async function deletePullCadence(userId: number, id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pullCadences).where(and(eq(pullCadences.id, id), eq(pullCadences.userId, userId)));
}

// ─── Dispositions ─────────────────────────────────────────────────────────────
export async function getDispositions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dispositions).where(eq(dispositions.userId, userId)).orderBy(desc(dispositions.updatedAt));
}

export async function getDispositionById(userId: number, id: number) {
  const db = await getDb();
  if (!db) return null;
  const [d] = await db.select().from(dispositions).where(and(eq(dispositions.id, id), eq(dispositions.userId, userId)));
  return d ?? null;
}

export async function createDisposition(userId: number, data: {
  dealId: number;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  listPrice?: number;
  salePrice?: number;
  assignmentFee?: number;
  marketingNotes?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(dispositions).values({ userId, ...data });
  const insertId = (result as any).insertId;
  return getDispositionById(userId, insertId);
}

export async function updateDisposition(userId: number, id: number, data: Partial<Omit<Disposition, "id" | "userId" | "createdAt">>) {
  const db = await getDb();
  if (!db) return null;
  await db.update(dispositions).set({ ...data, updatedAt: new Date() }).where(and(eq(dispositions.id, id), eq(dispositions.userId, userId)));
  return getDispositionById(userId, id);
}

// ─── Goals ────────────────────────────────────────────────────────────────────
export async function getGoal(userId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return null;
  const [g] = await db.select().from(goals).where(and(eq(goals.userId, userId), eq(goals.month, month), eq(goals.year, year)));
  return g ?? null;
}

export async function upsertGoal(userId: number, month: number, year: number, data: { targetDeals?: number; targetRevenue?: number }) {
  const existing = await getGoal(userId, month, year);
  const db = await getDb();
  if (!db) return null;
  if (existing) {
    await db.update(goals).set({ ...data, updatedAt: new Date() }).where(eq(goals.id, existing.id));
    return getGoal(userId, month, year);
  } else {
    await db.insert(goals).values({ userId, month, year, targetDeals: data.targetDeals ?? 0, targetRevenue: data.targetRevenue ?? 0 });
    return getGoal(userId, month, year);
  }
}
