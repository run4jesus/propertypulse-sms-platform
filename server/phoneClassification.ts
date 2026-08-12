import { and, asc, eq, inArray } from "drizzle-orm";
import { contactListMembers, contacts, phoneClassificationJobs, phoneIntelligenceCache } from "../drizzle/schema";
import { getDb } from "./db";
import { classifyPhoneWithTrestle, type TrestlePhoneResult } from "./trestle";

export const TRESTLE_LOOKUP_COST = 0.015;

type Slot = 1 | 2 | 3;
type PhoneReference = { contactId: number; slot: Slot; rawPhone: string };

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits.length === 10 ? digits : "";
}

function getPhoneReferences(rows: Array<{ id: number; phone: string; phone2: string | null; phone3: string | null }>) {
  const references = new Map<string, PhoneReference[]>();
  for (const contact of rows) {
    ([
      [1, contact.phone],
      [2, contact.phone2],
      [3, contact.phone3],
    ] as Array<[Slot, string | null]>).forEach(([slot, rawPhone]) => {
      if (!rawPhone) return;
      const phone = normalizePhone(rawPhone);
      if (!phone) return;
      const existing = references.get(phone) ?? [];
      existing.push({ contactId: contact.id, slot, rawPhone });
      references.set(phone, existing);
    });
  }
  return references;
}

async function getListContacts(userId: number, listId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({
    id: contacts.id, phone: contacts.phone, phone2: contacts.phone2, phone3: contacts.phone3,
  }).from(contactListMembers)
    .innerJoin(contacts, eq(contactListMembers.contactId, contacts.id))
    .where(and(eq(contactListMembers.listId, listId), eq(contacts.userId, userId)));
  return getPhoneReferences(rows);
}

export async function getClassificationEstimate(userId: number, listId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const references = await getListContacts(userId, listId);
  const phones = Array.from(references.keys());
  if (!phones.length) return { totalPhones: 0, alreadyClassified: 0, phonesToClassify: 0, estimatedCost: 0 };
  const cached = await db.select({ phone: phoneIntelligenceCache.phone })
    .from(phoneIntelligenceCache)
    .where(and(eq(phoneIntelligenceCache.userId, userId), inArray(phoneIntelligenceCache.phone, phones)));
  const alreadyClassified = new Set(cached.map((entry) => entry.phone)).size;
  const phonesToClassify = phones.length - alreadyClassified;
  return {
    totalPhones: phones.length,
    alreadyClassified,
    phonesToClassify,
    estimatedCost: Number((phonesToClassify * TRESTLE_LOOKUP_COST).toFixed(2)),
  };
}

export async function startClassificationJob(userId: number, listId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [activeJob] = await db.select().from(phoneClassificationJobs)
    .where(and(eq(phoneClassificationJobs.userId, userId), eq(phoneClassificationJobs.listId, listId), inArray(phoneClassificationJobs.status, ["pending", "processing"])))
    .limit(1);
  if (activeJob) return activeJob;

  const estimate = await getClassificationEstimate(userId, listId);
  const [job] = await db.insert(phoneClassificationJobs).values({
    userId, listId, status: estimate.phonesToClassify ? "pending" : "completed",
    totalPhones: estimate.phonesToClassify, processedPhones: 0, estimatedCost: estimate.estimatedCost,
    completedAt: estimate.phonesToClassify ? undefined : new Date(),
  }).$returningId();
  return { id: job.id, ...estimate, status: estimate.phonesToClassify ? "pending" : "completed" };
}

function contactUpdateForSlot(slot: Slot, result: TrestlePhoneResult) {
  const prefix = `phone${slot}`;
  return {
    [`${prefix}LineType`]: result.lineType,
    [`${prefix}ActivityScore`]: result.activityScore,
    [`${prefix}Carrier`]: result.carrier,
    [`${prefix}IsValid`]: result.isValid,
    [`${prefix}ClassifiedAt`]: new Date(),
  } as Record<string, unknown>;
}

export async function processPhoneClassificationJobs(limit = 30) {
  const db = await getDb();
  if (!db) return { processed: 0, completedJobs: 0 };
  const [job] = await db.select().from(phoneClassificationJobs)
    .where(inArray(phoneClassificationJobs.status, ["pending", "processing"]))
    .orderBy(asc(phoneClassificationJobs.createdAt)).limit(1);
  if (!job) return { processed: 0, completedJobs: 0 };

  await db.update(phoneClassificationJobs).set({ status: "processing", error: null }).where(eq(phoneClassificationJobs.id, job.id));
  const references = await getListContacts(job.userId, job.listId);
  const phones = Array.from(references.keys());
  const cached = phones.length ? await db.select({ phone: phoneIntelligenceCache.phone })
    .from(phoneIntelligenceCache)
    .where(and(eq(phoneIntelligenceCache.userId, job.userId), inArray(phoneIntelligenceCache.phone, phones))) : [];
  const cachedPhones = new Set(cached.map((entry) => entry.phone));
  const pendingPhones = phones.filter((phone) => !cachedPhones.has(phone));
  const batch = pendingPhones.slice(0, limit);

  await Promise.all(batch.map(async (phone) => {
    let result: TrestlePhoneResult;
    try {
      result = await classifyPhoneWithTrestle(phone);
    } catch {
      result = { phone, lineType: "unknown", activityScore: null, carrier: null, isValid: null };
    }
    await db.insert(phoneIntelligenceCache).values({
      userId: job.userId, phone, lineType: result.lineType, activityScore: result.activityScore,
      carrier: result.carrier, isValid: result.isValid,
    }).onDuplicateKeyUpdate({ set: { lineType: result.lineType, activityScore: result.activityScore, carrier: result.carrier, isValid: result.isValid, classifiedAt: new Date() } });
    await Promise.all((references.get(phone) ?? []).map((reference) =>
      db.update(contacts).set(contactUpdateForSlot(reference.slot, result) as any).where(eq(contacts.id, reference.contactId))
    ));
  }));

  const processedPhones = Math.min(job.totalPhones, job.processedPhones + batch.length);
  const completed = pendingPhones.length <= batch.length;
  await db.update(phoneClassificationJobs).set({
    processedPhones,
    status: completed ? "completed" : "processing",
    completedAt: completed ? new Date() : undefined,
  }).where(eq(phoneClassificationJobs.id, job.id));
  return { processed: batch.length, completedJobs: completed ? 1 : 0, jobId: job.id, processedPhones, totalPhones: job.totalPhones };
}

export async function getClassificationJob(userId: number, listId: number) {
  const db = await getDb();
  if (!db) return null;
  const [job] = await db.select().from(phoneClassificationJobs)
    .where(and(eq(phoneClassificationJobs.userId, userId), eq(phoneClassificationJobs.listId, listId)))
    .orderBy(asc(phoneClassificationJobs.createdAt)).limit(1);
  return job ?? null;
}
