import { describe, expect, it } from "vitest";
import { parseCsv } from "../client/src/lib/csv";

describe("parseCsv", () => {
  it("normalizes blank and duplicate column headers into valid mapping values", () => {
    const parsed = parseCsv("First Name,,Phone,Phone\nJane,,2145550100,2145550101");

    expect(parsed.headers).toEqual([
      "First Name",
      "Unnamed Column 2",
      "Phone",
      "Phone (2)",
    ]);
    expect(parsed.headers.every(Boolean)).toBe(true);
  });
});
