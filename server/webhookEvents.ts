import { eq } from "drizzle-orm";
import { webhookEvents } from "../drizzle/schema";
import { getDb } from "./db";

/** Claims a provider callback exactly once. False means it was already handled. */
export async function claimWebhookEvent(
  eventId: string,
  eventType: "inbound_sms" | "delivery_status",
  providerMessageSid: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable while claiming webhook event");
  try {
    await db.insert(webhookEvents).values({ eventId, eventType, providerMessageSid });
    return true;
  } catch (error: any) {
    if (String(error?.message ?? "").toLowerCase().includes("duplicate")) return false;
    throw error;
  }
}

export async function getWebhookEvent(eventId: string) {
  const db = await getDb();
  if (!db) return null;
  const [event] = await db.select().from(webhookEvents).where(eq(webhookEvents.eventId, eventId)).limit(1);
  return event ?? null;
}

/** Remove a claim only when processing failed, allowing the provider to retry. */
export async function releaseWebhookEvent(eventId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(webhookEvents).where(eq(webhookEvents.eventId, eventId));
}
