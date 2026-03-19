import { describe, it, expect } from "vitest";
import { lookupPropertyValue, formatDollars } from "./dealmachine";

describe("DealMachine API", () => {
  it("formatDollars formats whole numbers correctly", () => {
    expect(formatDollars(125000)).toBe("$125,000");
    expect(formatDollars(1000000)).toBe("$1,000,000");
    expect(formatDollars(75500)).toBe("$75,500");
  });

  it("lookupPropertyValue returns null when API key is not configured", async () => {
    // Temporarily clear the key to test the no-key path
    const originalKey = process.env.DEALMACHINE_API_KEY;
    process.env.DEALMACHINE_API_KEY = "";

    const result = await lookupPropertyValue("123 Main St", "Dallas", "TX", "75201");
    expect(result).toBeNull();

    process.env.DEALMACHINE_API_KEY = originalKey;
  });

  it("lookupPropertyValue returns property data when API key is configured", async () => {
    if (!process.env.DEALMACHINE_API_KEY) {
      console.log("Skipping live API test — DEALMACHINE_API_KEY not set");
      return;
    }

    const result = await lookupPropertyValue(
      "1170 Hampton Park Dr",
      "Saint Louis",
      "MO",
      "63117"
    );

    // Should return an object (not null) when key is valid
    expect(result).not.toBeNull();
    if (result) {
      expect(typeof result.leadId).toBe("number");
      // EstimatedValue may be null for some properties but the call should succeed
      if (result.estimatedValue !== null) {
        expect(result.estimatedValue).toBeGreaterThan(0);
        expect(result.buyPrice).toBe(Math.round(result.estimatedValue * 0.65));
      }
    }
  }, 15000); // 15s timeout for live API call
});
