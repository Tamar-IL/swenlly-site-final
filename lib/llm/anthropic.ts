import Anthropic from "@anthropic-ai/sdk";
import { TOOLS, runTool } from "./tools";
import { systemPrompt } from "./prompt";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
const MAX_STEPS = 5;

export function anthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Runs the visitor agent with a manual tool-use loop (streaming off).
 * Server-executes capture_lead / request_booking / get_pricing.
 */
export async function runAnthropicAgent(
  history: ChatMessage[],
  locale: string
): Promise<string> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY

  // Build the running message list (SDK content-block form).
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt(locale),
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const out = await runTool(
            block.name,
            block.input as Record<string, unknown>,
            locale
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: out,
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Normal completion — collect text blocks.
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return text || "…";
  }

  return "סליחה, נתקעתי רגע. אפשר לנסח מחדש או לפנות אלינו בוואטסאפ.";
}
