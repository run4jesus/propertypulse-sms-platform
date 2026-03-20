import { describe, it, expect } from "vitest";
import { callOpenAI } from "./openai";

describe("OpenAI GPT-4o mini integration", () => {
  it("should return a valid response from GPT-4o mini", async () => {
    const result = await callOpenAI({
      messages: [
        { role: "system", content: "You are a helpful assistant. Reply with exactly one word." },
        { role: "user", content: "Say the word: hello" },
      ],
      max_tokens: 10,
    });
    expect(result.choices).toBeDefined();
    expect(result.choices.length).toBeGreaterThan(0);
    const content = result.choices[0]?.message?.content;
    expect(typeof content).toBe("string");
    expect((content as string).length).toBeGreaterThan(0);
  }, 20000);

  it("should return structured JSON via response_format", async () => {
    const result = await callOpenAI({
      messages: [
        { role: "system", content: "You are a classifier. Return JSON only." },
        { role: "user", content: "Classify: 'I want to sell my house for $200k'" },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "intent_test",
          strict: true,
          schema: {
            type: "object",
            properties: {
              intent: { type: "string", enum: ["warm_lead", "not_interested", "neutral"] },
            },
            required: ["intent"],
            additionalProperties: false,
          },
        },
      },
      max_tokens: 50,
    });
    const content = result.choices[0]?.message?.content;
    expect(typeof content).toBe("string");
    const parsed = JSON.parse(content as string) as { intent: string };
    expect(["warm_lead", "not_interested", "neutral"]).toContain(parsed.intent);
  }, 20000);
});
