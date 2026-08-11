import { describe, expect, it } from "vitest";
import { getRandomReplyDelayMs, isWithinBusinessHours } from "./aiReplyQueue";

const defaultUser = {
  id: 1,
  aiTimezone: "America/Chicago",
  aiHoursStart: 8,
  aiHoursEnd: 20,
  aiReplyDelayFirstMin: 2,
  aiReplyDelayFirstMax: 6,
  aiReplyDelayFollowMin: 2,
  aiReplyDelayFollowMax: 6,
} as any;

describe("durable AI reply queue timing", () => {
  it("uses the configured business-hours window in the user's timezone", () => {
    // 14:00 UTC is 8:00 AM Central during daylight saving time.
    expect(isWithinBusinessHours(defaultUser, new Date("2026-08-11T14:00:00.000Z"))).toBe(true);
    // 01:00 UTC is 8:00 PM Central, which is outside an 8 AM–8 PM window.
    expect(isWithinBusinessHours(defaultUser, new Date("2026-08-12T01:00:00.000Z"))).toBe(false);
  });

  it("keeps first and follow-up delays within the saved inclusive range", () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const firstDelay = getRandomReplyDelayMs(defaultUser, true);
      const followUpDelay = getRandomReplyDelayMs(defaultUser, false);
      expect(firstDelay).toBeGreaterThanOrEqual(2 * 60_000);
      expect(firstDelay).toBeLessThanOrEqual(6 * 60_000);
      expect(followUpDelay).toBeGreaterThanOrEqual(2 * 60_000);
      expect(followUpDelay).toBeLessThanOrEqual(6 * 60_000);
    }
  });

  it("supports a business window that crosses midnight", () => {
    const overnightUser = { ...defaultUser, aiHoursStart: 20, aiHoursEnd: 6 };
    expect(isWithinBusinessHours(overnightUser, new Date("2026-08-12T02:00:00.000Z"))).toBe(true);
    expect(isWithinBusinessHours(overnightUser, new Date("2026-08-12T14:00:00.000Z"))).toBe(false);
  });
});
