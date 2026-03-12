import { describe, expect, it } from "vitest";

describe("TextGrid credentials", () => {
  it("should have TEXTGRID_ACCOUNT_SID and TEXTGRID_AUTH_TOKEN set", () => {
    const sid = process.env.TEXTGRID_ACCOUNT_SID;
    const token = process.env.TEXTGRID_AUTH_TOKEN;
    expect(sid, "TEXTGRID_ACCOUNT_SID must be set").toBeTruthy();
    expect(token, "TEXTGRID_AUTH_TOKEN must be set").toBeTruthy();
  });

  it("should authenticate successfully with TextGrid API", async () => {
    const sid = process.env.TEXTGRID_ACCOUNT_SID!;
    const token = process.env.TEXTGRID_AUTH_TOKEN!;

    if (!sid || !token) {
      console.warn("Skipping live API test — credentials not set");
      return;
    }

    const credentials = Buffer.from(`${sid}:${token}`).toString("base64");
    const url = `https://api.textgrid.com/2010-04-01/Accounts/${sid}.json`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });

    // 200 = valid credentials, 401 = invalid
    expect(response.status, `TextGrid API returned ${response.status} — check credentials`).toBe(200);
  }, 15000);
});
