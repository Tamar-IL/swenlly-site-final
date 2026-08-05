import { ChatMessage, runAnthropicAgent, anthropicConfigured } from "./anthropic";

export type { ChatMessage };

export function agentConfigured(): boolean {
  const provider = process.env.LLM_PROVIDER || "anthropic";
  // OpenAI provider is a stub for now; only Anthropic is implemented.
  return provider === "anthropic" && anthropicConfigured();
}

/** Provider-agnostic entry point. Selected by LLM_PROVIDER (default: anthropic). */
export async function runAgent(history: ChatMessage[], locale: string): Promise<string> {
  const provider = process.env.LLM_PROVIDER || "anthropic";
  if (provider === "anthropic") return runAnthropicAgent(history, locale);
  throw new Error(`LLM provider not implemented: ${provider}`);
}
