import { describe, expect, it } from "vitest";
import { organizeImportPhones } from "../client/src/lib/contactImport";

describe("organizeImportPhones", () => {
  it("keeps Phone 1 primary and retains the remaining phones", () => {
    expect(organizeImportPhones("111", "222", "333")).toEqual({
      phone: "111", phone2: "222", phone3: "333", promotedFromFallback: false,
    });
  });

  it("promotes Phone 2 when Phone 1 is blank", () => {
    expect(organizeImportPhones(undefined, "222", "333")).toEqual({
      phone: "222", phone2: "333", phone3: undefined, promotedFromFallback: true,
    });
  });

  it("promotes Phone 3 when Phone 1 and Phone 2 are blank", () => {
    expect(organizeImportPhones(undefined, undefined, "333")).toEqual({
      phone: "333", phone2: undefined, phone3: undefined, promotedFromFallback: true,
    });
  });

  it("returns no primary phone only when all mapped phone fields are blank", () => {
    expect(organizeImportPhones()).toEqual({
      phone: undefined, phone2: undefined, phone3: undefined, promotedFromFallback: false,
    });
  });
});
