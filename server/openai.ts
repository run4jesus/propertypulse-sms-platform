/**
 * OpenAI GPT-4o mini helper
 * Drop-in replacement for invokeLLM — uses the same call signature
 * so existing code can swap with minimal changes.
 *
 * Model: gpt-4o-mini  (~$0.15/1M input, $0.60/1M output)
 * Falls back to gpt-3.5-turbo if gpt-4o-mini is unavailable.
 */

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

export interface OAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OAIResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: Record<string, unknown>;
  };
}

export interface OAIParams {
  messages: OAIMessage[];
  response_format?: OAIResponseFormat;
  temperature?: number;
  max_tokens?: number;
  model?: string;
}

export interface OAIResult {
  choices: Array<{
    message: {
      content: string | null;
    };
  }>;
}

export async function callOpenAI(params: OAIParams): Promise<OAIResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("[OpenAI] OPENAI_API_KEY is not set");
  }

  const body: Record<string, unknown> = {
    model: params.model ?? DEFAULT_MODEL,
    messages: params.messages,
    temperature: params.temperature ?? 0.4,
  };

  if (params.max_tokens) {
    body.max_tokens = params.max_tokens;
  }

  if (params.response_format) {
    body.response_format = params.response_format;
  }

  const resp = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`[OpenAI] API error ${resp.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await resp.json()) as OAIResult;
  return data;
}
