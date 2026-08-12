/**
 * Production dispatcher for deterministic SMS work. It is called by the
 * platform scheduler every minute and is deliberately idempotent:
 * - campaign processing advances only eligible campaign offsets;
 * - durable AI replies are atomically claimed before sending;
 * - after-hours AI replies remain queued until business hours reopen.
 */
import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { processAiReplyQueue } from "./aiReplyQueue";
import { processCampaignBatches } from "./smsEngine";
import { processPhoneClassificationJobs } from "./phoneClassification";

export async function smsDispatchHandler(req: Request, res: Response) {
  try {
    const caller = await sdk.authenticateRequest(req);
    if (!(caller as any).isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    await processCampaignBatches();
    const aiReplies = await processAiReplyQueue();
    const classifications = await processPhoneClassificationJobs();

    return res.json({
      ok: true,
      aiReplies,
      classifications,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[SMS Dispatcher] Scheduled execution failed:", error);
    return res.status(500).json({
      error: error?.message ?? "Scheduled SMS dispatcher failed",
      context: { path: req.path },
      timestamp: new Date().toISOString(),
    });
  }
}
