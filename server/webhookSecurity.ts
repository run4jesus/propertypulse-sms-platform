import { timingSafeEqual } from "crypto";
import type { Request } from "express";

type InboundPayload = { From: string; To: string; Body: string; MessageSid: string };
type StatusPayload = { MessageSid: string; MessageStatus: string };

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * Accept either an explicit request header or a token query parameter. The
 * query-token fallback is used because TextGrid's public documentation does not
 * currently document custom callback headers. Production fails closed when no
 * secret has been configured.
 */
export function hasValidTextGridWebhookSecret(req: Request): boolean {
  const expected = process.env.TEXTGRID_WEBHOOK_SECRET;
  if (!expected) {
    if (process.env.NODE_ENV === "production") return false;
    console.warn("[Webhook] TEXTGRID_WEBHOOK_SECRET is not set; allowing callback only in development");
    return true;
  }

  const headerToken = req.header("x-textgrid-webhook-secret");
  const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;
  const provided = headerToken ?? queryToken;
  return !!provided && safeEqual(provided, expected);
}

export function parseInboundSmsPayload(body: unknown): InboundPayload | null {
  if (!body || typeof body !== "object") return null;
  const candidate = body as Record<string, unknown>;
  if (
    !isNonEmptyString(candidate.From, 32) ||
    !isNonEmptyString(candidate.To, 32) ||
    !isNonEmptyString(candidate.Body, 10_000) ||
    !isNonEmptyString(candidate.MessageSid, 64)
  ) return null;
  return {
    From: candidate.From.trim(),
    To: candidate.To.trim(),
    Body: candidate.Body.trim(),
    MessageSid: candidate.MessageSid.trim(),
  };
}

export function parseDeliveryStatusPayload(body: unknown): StatusPayload | null {
  if (!body || typeof body !== "object") return null;
  const candidate = body as Record<string, unknown>;
  if (!isNonEmptyString(candidate.MessageSid, 64) || !isNonEmptyString(candidate.MessageStatus, 32)) return null;
  return {
    MessageSid: candidate.MessageSid.trim(),
    MessageStatus: candidate.MessageStatus.trim().toLowerCase(),
  };
}
