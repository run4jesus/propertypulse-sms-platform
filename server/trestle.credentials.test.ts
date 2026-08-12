import { describe, expect, it } from "vitest";

describe("Trestle Phone Intelligence credentials", () => {
  it("accepts the configured API key", async () => {
    const apiKey = process.env.TRESTLE_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.trestleiq.com/3.0/phone_intel?phone=2145551234", {
      headers: { "x-api-key": apiKey!, Accept: "application/json" },
    });

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    expect(response.ok).toBe(true);
  }, 20_000);
});
