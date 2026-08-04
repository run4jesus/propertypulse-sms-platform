import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./trpc";
import { callOpenAI } from "../openai";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  testAI: protectedProcedure
    .input(
      z.object({
        currentStage: z.enum(["intro", "price_ask", "needs_offer", "not_interested"]),
        latestMessage: z.string().min(1, "message is required"),
        transcript: z.string().default(""),
      })
    )
    .mutation(async ({ input }) => {
      const { currentStage, latestMessage, transcript } = input;
      type StageType = "intro" | "price_ask" | "needs_offer" | "not_interested";

      // Build stage context
      let stageContext: string;
      if (currentStage === "intro") {
        stageContext = `CURRENT STAGE: intro — the seller just replied to your opening text asking if they'd consider selling.
- If they mention a death, illness, divorce, foreclosure, financial hardship, or any emotionally sensitive situation: acknowledge it with genuine warmth first (1 short sentence), then gently transition. If they seem open to selling, set next_stage to "price_ask". If the situation is urgent (e.g. "we need to sell fast", "going through foreclosure"), set next_stage to "needs_offer".
- If they say YES or are open to selling, ask what price they have in mind and set next_stage to "price_ask".
- If they say NO or decline clearly, reply with the not-interested goodbye and set next_stage to "not_interested".
- If they ask a clarifying question or are unclear, answer briefly (1 sentence) and keep next_stage as "intro".`;
      } else if (currentStage === "price_ask") {
        stageContext = `CURRENT STAGE: price_ask — you already asked the seller what price they have in mind.
BRANCHING RULES:
1. If seller gives ANY specific price or dollar amount: reply with the needs-offer handoff message and set next_stage to "needs_offer".
2. If seller says "make me an offer", "you tell me", "what can you do", "what are you paying", or any variation of refusing to name a price but still being open: reply with the needs-offer handoff message and set next_stage to "needs_offer".
3. If seller mentions a death, illness, divorce, foreclosure, financial hardship, or any urgent/sensitive situation: acknowledge it warmly in 1 sentence first, then send the needs-offer handoff message and set next_stage to "needs_offer".
4. If seller says NO or declines clearly: reply with the not-interested goodbye and set next_stage to "not_interested".
5. If seller asks a clarifying question or is still unclear: answer briefly and keep next_stage as "price_ask".`;
      } else {
        stageContext = `CURRENT STAGE: ${currentStage} — keep next_stage as "${currentStage}" and do not reply.`;
      }

      const aiResponse = await callOpenAI({
        messages: [
          {
            role: "system",
            content: `You are texting a property owner on behalf of a real estate investor who buys properties.

${stageContext}

EXACT REPLY TEMPLATES — use these word-for-word when the rule applies:
- Not interested goodbye: "No worries at all, thanks for your time. Feel free to reach out if anything changes."
- Ask for price: "Ok great, what price did you have in mind for the property?"
- Needs-offer handoff (seller gives a price OR says make me an offer): "Got it! Let me get that info over to the right person and they'll be in touch with you shortly."
- Empathy acknowledgment (use BEFORE the handoff message when seller shares something emotional): "Sorry to hear that, I appreciate you sharing that with me."

CRITICAL RULES — never break these:
- NEVER mention a company name, your name, or your partner's name
- NEVER say you are an AI or a bot
- NEVER use corporate or formal language
- NEVER skip past an emotional disclosure — always acknowledge before pivoting
- Use ONLY whole dollar amounts — no cents, no ranges
- Keep every reply SHORT — 1 to 2 sentences maximum
- Sound like a real person texting from their phone — casual, warm, direct`,
          },
          {
            role: "user",
            content: `Conversation so far:\n${transcript}\n\nLatest seller message: "${latestMessage}"\n\nReply with a JSON object:\n- "reply": the exact SMS text to send\n- "next_stage": one of "intro", "price_ask", "needs_offer", "not_interested"`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ai_reply",
            strict: true,
            schema: {
              type: "object",
              properties: {
                reply: { type: "string", description: "The SMS reply to send" },
                next_stage: { type: "string", enum: ["intro", "price_ask", "needs_offer", "not_interested"] },
              },
              required: ["reply", "next_stage"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = aiResponse.choices[0]?.message?.content;
      let reply = "Error generating response";
      let nextStage: StageType = currentStage;

      if (rawContent && typeof rawContent === "string") {
        try {
          const parsed = JSON.parse(rawContent) as { reply: string; next_stage: string };
          reply = parsed.reply?.trim() ?? reply;
          const validStages: StageType[] = ["intro", "price_ask", "needs_offer", "not_interested"];
          if (validStages.includes(parsed.next_stage as StageType)) {
            nextStage = parsed.next_stage as StageType;
          }
        } catch (_err) {
          reply = rawContent.trim();
        }
      }

      return {
        reply,
        next_stage: nextStage,
      };
    }),
});
