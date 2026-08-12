import { describe, expect, it } from "vitest";
import { classifyPhoneWithTrestle } from "./trestle";

describe("Trestle Phone Intelligence client", () => {
  it("returns a normalized line type and phone metadata", async () => {
    const result = await classifyPhoneWithTrestle("6014547513");
    expect(["mobile", "landline", "voip", "unknown"]).toContain(result.lineType);
    expect(result.phone).toMatch(/^\+?1?\d{10,11}$/);
    expect(typeof result.isValid === "boolean" || result.isValid === null).toBe(true);
  }, 20_000);
});
