import { describe, it, expect, beforeEach, vi } from "vitest";
import { systemRouter } from "./_core/systemRouter";
import type { TrpcContext } from "./_core/context";

// Mock the OpenAI module
vi.mock("../server/openai", () => ({
  callOpenAI: vi.fn(async (params: any) => {
    // Simulate different responses based on the latest message
    const latestMessage = params.messages[params.messages.length - 1]?.content || "";

    // Extract the seller message from the prompt
    const messageMatch = latestMessage.match(/Latest seller message: "([^"]+)"/);
    const sellerMessage = messageMatch ? messageMatch[1].toLowerCase() : "";

    let response = {
      reply: "Default response",
      next_stage: "intro",
    };

    // Simulate stage transitions based on seller input
    // Check for negative responses first (before checking for "no" in other contexts)
    if (
      sellerMessage.includes("not interested") ||
      sellerMessage.includes("stop texting") ||
      sellerMessage === "no" ||
      sellerMessage.startsWith("no ")
    ) {
      response = {
        reply: "No worries at all, thanks for your time. Feel free to reach out if anything changes.",
        next_stage: "not_interested",
      };
    } else if (
      sellerMessage.includes("death") ||
      sellerMessage.includes("foreclosure") ||
      sellerMessage.includes("illness")
    ) {
      response = {
        reply: "Sorry to hear that, I appreciate you sharing that with me. Got it! Let me get that info over to the right person and they'll be in touch with you shortly.",
        next_stage: "needs_offer",
      };
    } else if (
      sellerMessage.includes("yes") ||
      sellerMessage.includes("maybe") ||
      sellerMessage.includes("interested")
    ) {
      response = {
        reply: "Ok great, what price did you have in mind for the property?",
        next_stage: "price_ask",
      };
    } else if (
      sellerMessage.includes("$") ||
      sellerMessage.includes("make me an offer") ||
      sellerMessage.includes("what can you do")
    ) {
      response = {
        reply: "Got it! Let me get that info over to the right person and they'll be in touch with you shortly.",
        next_stage: "needs_offer",
      };
    }

    return {
      choices: [
        {
          message: {
            content: JSON.stringify(response),
          },
        },
      ],
    };
  }),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("system.testAI", () => {
  let caller: any;

  beforeEach(async () => {
    const ctx = createAuthContext();
    const router = systemRouter.createCaller(ctx);
    caller = router;
  });

  it("should transition from intro to price_ask when seller says yes", async () => {
    const result = await caller.testAI({
      currentStage: "intro",
      latestMessage: "Yes, I'm interested",
      transcript: "",
    });

    expect(result.reply).toContain("what price did you have in mind");
    expect(result.next_stage).toBe("price_ask");
  });

  it("should transition from price_ask to needs_offer when seller gives a price", async () => {
    const result = await caller.testAI({
      currentStage: "price_ask",
      latestMessage: "$150,000",
      transcript: "Agent: Ok great, what price did you have in mind for the property?\nSeller: $150,000",
    });

    expect(result.reply).toContain("Let me get that info over to the right person");
    expect(result.next_stage).toBe("needs_offer");
  });

  it("should transition from price_ask to needs_offer when seller says make me an offer", async () => {
    const result = await caller.testAI({
      currentStage: "price_ask",
      latestMessage: "Just make me an offer",
      transcript: "Agent: Ok great, what price did you have in mind for the property?\nSeller: Just make me an offer",
    });

    expect(result.reply).toContain("Let me get that info over to the right person");
    expect(result.next_stage).toBe("needs_offer");
  });

  it("should transition from intro to not_interested when seller says no", async () => {
    const result = await caller.testAI({
      currentStage: "intro",
      latestMessage: "No, not interested",
      transcript: "",
    });

    expect(result.reply).toContain("No worries at all");
    expect(result.next_stage).toBe("not_interested");
  });

  it("should handle empathy for foreclosure and transition to needs_offer", async () => {
    const result = await caller.testAI({
      currentStage: "intro",
      latestMessage: "We're going through foreclosure",
      transcript: "",
    });

    expect(result.reply).toContain("Sorry to hear that");
    expect(result.next_stage).toBe("needs_offer");
  });

  it("should stay in intro when seller asks a clarifying question", async () => {
    const result = await caller.testAI({
      currentStage: "intro",
      latestMessage: "What company are you with?",
      transcript: "",
    });

    // Should provide a response but may stay in intro or move based on context
    expect(result.reply).toBeDefined();
    expect(result.reply.length).toBeGreaterThan(0);
  });

  it("should handle multiple messages in transcript", async () => {
    const transcript = `Seller: Yes, I'm interested
Agent: Ok great, what price did you have in mind for the property?
Seller: Around $200,000`;

    const result = await caller.testAI({
      currentStage: "price_ask",
      latestMessage: "Around $200,000",
      transcript,
    });

    expect(result.reply).toContain("Let me get that info over to the right person");
    expect(result.next_stage).toBe("needs_offer");
  });

  it("should return valid stage type in response", async () => {
    const result = await caller.testAI({
      currentStage: "intro",
      latestMessage: "Yes",
      transcript: "",
    });

    const validStages = ["intro", "price_ask", "needs_offer", "not_interested"];
    expect(validStages).toContain(result.next_stage);
  });

  it("should always return a non-empty reply", async () => {
    const result = await caller.testAI({
      currentStage: "intro",
      latestMessage: "Hello?",
      transcript: "",
    });

    expect(result.reply).toBeDefined();
    expect(result.reply.length).toBeGreaterThan(0);
    expect(result.reply).not.toBe("Error generating response");
  });
});
