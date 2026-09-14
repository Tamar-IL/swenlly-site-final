import { ChatMessage, runAnthropicAgent, anthropicConfigured } from "./anthropic";
import { runOpenAIAgent, openaiConfigured } from "./openai";

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
