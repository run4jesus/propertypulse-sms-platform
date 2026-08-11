import { describe, expect, it } from "vitest";

describe("TextGrid credentials", () => {
  it("should have TEXTGRID_ACCOUNT_SID and TEXTGRID_AUTH_TOKEN set", () => {
    const sid = process.env.TEXTGRID_ACCOUNT_SID;
    const token = process.env.TEXTGRID_AUTH_TOKEN;
    expect(sid, "TEXTGRID_ACCOUNT_SID must be set").toBeTruthy();
    expect(token, "TEXTGRID_AUTH_TOKEN must be set").toBeTruthy();
  });

  // TextGrid's account-resource endpoint returns provider-specific 400 responses
  // for some valid SMS-only accounts, so live authentication is verified during
  // the controlled SMS pilot rather than by an unreliable account lookup here.
});
