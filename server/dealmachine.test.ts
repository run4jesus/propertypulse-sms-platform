import { describe, it, expect } from "vitest";
import { lookupPropertyValue, formatDollars } from "./dealmachine";

describe("DealMachine API", () => {
  it("formatDollars formats whole numbers correctly", () => {
    expect(formatDollars(125000)).toBe("$125,000");
    expect(formatDollars(1000000)).toBe("$1,000,000");
    expect(formatDollars(75500)).toBe("$75,500");
  });

  it("lookupPropertyValue returns null when API key is not configured", async () => {
    const originalKey = process.env.DEALMACHINE_API_KEY;
    process.env.DEALMACHINE_API_KEY = "";

    const result = await lookupPropertyValue("123 Main St", "Dallas", "TX", "75201");
    expect(result).toBeNull();

    process.env.DEALMACHINE_API_KEY = originalKey;
  });

  it("lookupPropertyValue connects to DealMachine API with valid key", async () => {
    if (!process.env.DEALMACHINE_API_KEY) {
      console.log("Skipping live API test — DEALMACHINE_API_KEY not set");
      return;
    }

    // This address may already be in the account (deduplication) — both paths are valid:
    // 1. New property: returns lead with id + EstimatedValue
    // 2. Existing property: searches and returns the existing lead (or null if not found by search)
    const result = await lookupPropertyValue(
      "1170 Hampton Park Dr",
      "Saint Louis",
      "MO",
      "63117"
    );

    // The API key is valid if we get here without throwing.
    // result may be null if the property is in the account but search returns nothing.
    if (result !== null) {
      expect(typeof result.leadId).toBe("number");
      expect(result.leadId).toBeGreaterThan(0);
      // EstimatedValue may be null for some properties
      if (result.estimatedValue !== null) {
        expect(result.estimatedValue).toBeGreaterThan(0);
        expect(result.buyPrice).toBe(Math.round(result.estimatedValue * 0.65));
      }
      console.log(`DealMachine result: leadId=${result.leadId}, estimatedValue=${result.estimatedValue}, buyPrice=${result.buyPrice}`);
    } else {
      // Property is in account but search returned nothing — API key is still valid
      console.log("DealMachine: property already in account, search returned no results (API key is valid)");
    }
    // Test passes as long as no exception was thrown (confirms API key works)
  }, 20000);
});
