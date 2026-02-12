export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export interface Conversation {
  id: string;
  projectId: string;
  title: string;
  phase: ConversationPhase;
  messages: Message[];
  sandboxCode: string | null;
  specDocs: Partial<Record<ConversationPhase, string>>;
  createdAt: number;
  updatedAt: number;
}

export type ConversationPhase = "vision" | "design" | "stack" | "export";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}



// LLM providers for text chat and the ASR+TTS pipeline
export type LLMProvider = "openai" | "gemini" | "anthropic";

// Specific models
export type LLMModel =
  | "gpt-5.2-high"
  | "gpt-5.2-medium"
  | "gpt-5.2-xhigh"
  | "gemini-3-pro"
  | "gemini-3-flash"
  | "claude-opus-4.6"
  | "claude-sonnet-4.5";

export interface LLMModelConfig {
  id: LLMModel;
  name: string;
  provider: LLMProvider;
  maxTokens: number;
  /** The actual model ID sent to the API (if different from `id`) */
  apiModel?: string;
  /** Reasoning effort level for OpenAI reasoning models */
  reasoningEffort?: "medium" | "high" | "xhigh";
}

export const LLM_MODELS: LLMModelConfig[] = [
  {
    id: "gpt-5.2-high",
    name: "GPT-5.2 (High)",
    provider: "openai",
    maxTokens: 128000,
    apiModel: "gpt-5.2",
    reasoningEffort: "high",
  },
  {
    id: "gpt-5.2-medium",
    name: "GPT-5.2 (Medium)",
    provider: "openai",
    maxTokens: 128000,
    apiModel: "gpt-5.2",
    reasoningEffort: "medium",
  },
  {
    id: "gpt-5.2-xhigh",
    name: "GPT-5.2 (XHigh)",
    provider: "openai",
    maxTokens: 128000,
    apiModel: "gpt-5.2",
    reasoningEffort: "xhigh",
  },
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    provider: "gemini",
    maxTokens: 65000,
    apiModel: "gemini-3-pro-preview",
  },
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: "gemini",
    maxTokens: 65536,
    apiModel: "gemini-3-flash-preview",
  },
  {
    id: "claude-opus-4.6",
    name: "Claude Opus 4.6",
    provider: "anthropic",
    maxTokens: 128000,
    apiModel: "claude-opus-4-6",
  },
  {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    maxTokens: 64000,
    apiModel: "claude-sonnet-4-5-20250929",
  },
];

export function getModelConfig(id: LLMModel): LLMModelConfig {
  return LLM_MODELS.find((m) => m.id === id)!;
}
