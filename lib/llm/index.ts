import { ChatMessage, runAnthropicAgent, anthropicConfigured, anthropicComplete } from "./anthropic";
import { runOpenAIAgent, openaiConfigured, openaiComplete } from "./openai";

export type { ChatMessage };

type Provider = "anthropic" | "openai";

function provider(): Provider {
  const raw = (process.env.LLM_PROVIDER || "anthropic").toLowerCase().trim();
  // Accept the names people actually type in a .env file.
  if (raw === "openai" || raw === "gpt" || raw === "chatgpt") return "openai";
  return "anthropic";
}

export function agentConfigured(): boolean {
  return provider() === "openai" ? openaiConfigured() : anthropicConfigured();
}

/** Provider-agnostic entry point. Selected by LLM_PROVIDER (default: anthropic). */
export async function runAgent(history: ChatMessage[], locale: string): Promise<string> {
  return provider() === "openai"
    ? runOpenAIAgent(history, locale)
    : runAnthropicAgent(history, locale);
}

/**
 * A single completion with no tools, on whichever provider is configured.
 * Returns null when no key is set so callers can degrade instead of throwing.
 */
export async function complete(system: string, user: string): Promise<string | null> {
  if (!agentConfigured()) return null;
  try {
    return provider() === "openai"
      ? await openaiComplete(system, user)
      : await anthropicComplete(system, user);
  } catch (err) {
    console.error("[llm] completion failed", err);
    return null;
  }
}
