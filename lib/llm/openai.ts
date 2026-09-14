import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { TOOLS, runTool } from "./tools";
import { systemPrompt } from "./prompt";
import type { ChatMessage } from "./anthropic";

/** Override with OPENAI_MODEL. Kept small on purpose — this is a chat widget
 *  answering short questions, and it runs on every visitor message. */
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_STEPS = 5;

export function openaiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/** The shared TOOLS list is written in Anthropic's shape; OpenAI nests the same
 *  JSON Schema under function.parameters. Translated here so tools.ts stays the
 *  single source of truth for both providers. */
function toOpenAITools(): ChatCompletionTool[] {
  return TOOLS.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema as Record<string, unknown>,
    },
  }));
}

/**
 * Runs the visitor agent with a manual tool-call loop (streaming off).
 * Server-executes capture_lead / request_booking / get_pricing.
 *
 * Mirrors runAnthropicAgent: same tools, same system prompt, same step cap,
 * and the same Hebrew fallback line when the loop runs out.
 */
export async function runOpenAIAgent(
  history: ChatMessage[],
  locale: string
): Promise<string> {
  const client = new OpenAI(); // reads OPENAI_API_KEY

  // OpenAI takes the system prompt as the first message rather than a field.
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt(locale) },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await client.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 1024,
      tools: toOpenAITools(),
      messages,
    });

    const choice = response.choices[0];
    const message = choice?.message;
    if (!message) break;

    const calls = message.tool_calls ?? [];
    if (calls.length > 0) {
      // The assistant turn carrying the calls must be replayed before results.
      messages.push(message);

      for (const call of calls) {
        // Only function calls carry a name/arguments pair; ignore anything else.
        if (call.type !== "function") continue;

        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          // A malformed argument blob is the model's mistake, not a crash:
          // tell it so it can retry within the remaining steps.
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: "Invalid JSON arguments. Call the tool again with valid JSON.",
          });
          continue;
        }

        const out = await runTool(call.function.name, args, locale);
        messages.push({ role: "tool", tool_call_id: call.id, content: out });
      }
      continue;
    }

    const text = (message.content ?? "").trim();
    if (text) return text;
    break;
  }

  return "סליחה, נתקעתי רגע. אפשר לנסח מחדש או לפנות אלינו בוואטסאפ.";
}
