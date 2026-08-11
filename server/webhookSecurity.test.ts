import { afterEach, describe, expect, it } from "vitest";
import { hasValidTextGridWebhookSecret } from "./webhookSecurity";

const originalSecret = process.env.TEXTGRID_WEBHOOK_SECRET;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.TEXTGRID_WEBHOOK_SECRET = originalSecret;
  process.env.NODE_ENV = originalNodeEnv;
});

describe("TextGrid webhook token validation", () => {
  it("accepts only the configured secret and rejects missing or incorrect tokens", () => {
    process.env.NODE_ENV = "production";
    process.env.TEXTGRID_WEBHOOK_SECRET = "test-webhook-token";

    expect(hasValidTextGridWebhookSecret({
      header: (name: string) => name === "x-textgrid-webhook-secret" ? "test-webhook-token" : undefined,
      query: {},
    } as any)).toBe(true);

    expect(hasValidTextGridWebhookSecret({
      header: () => undefined,
      query: { token: "wrong-token" },
    } as any)).toBe(false);

    expect(hasValidTextGridWebhookSecret({
      header: () => undefined,
      query: {},
    } as any)).toBe(false);
  });
});
