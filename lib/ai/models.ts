// Curated list of models available through OpenRouter
// Full list: https://openrouter.ai/models
export const DEFAULT_CHAT_MODEL = "google/gemini-2.0-flash-001";

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  // Anthropic
  {
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku",
    provider: "anthropic",
    description: "Fast and affordable, great for everyday tasks",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    description: "Best balance of speed, intelligence, and cost",
  },
  {
    id: "anthropic/claude-3-opus",
    name: "Claude 3 Opus",
    provider: "anthropic",
    description: "Most capable Anthropic model",
  },
  // OpenAI
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    description: "Fast and cost-effective for simple tasks",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    description: "Most capable OpenAI model",
  },
  {
    id: "openai/o1-mini",
    name: "o1-mini",
    provider: "openai",
    description: "Reasoning model optimized for speed",
  },
  // Google
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    provider: "google",
    description: "Ultra fast and affordable",
  },
  {
    id: "google/gemini-pro-1.5",
    name: "Gemini Pro 1.5",
    provider: "google",
    description: "1M context window, great for long documents",
  },
  // Meta
  {
    id: "meta-llama/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B",
    provider: "meta",
    description: "Open source, great performance",
  },
  {
    id: "meta-llama/llama-3.1-8b-instruct",
    name: "Llama 3.1 8B",
    provider: "meta",
    description: "Fast open source model",
  },
  // Mistral
  {
    id: "mistralai/mistral-large",
    name: "Mistral Large",
    provider: "mistral",
    description: "Mistral's flagship model",
  },
  {
    id: "mistralai/mixtral-8x7b-instruct",
    name: "Mixtral 8x7B",
    provider: "mistral",
    description: "Fast mixture of experts model",
  },
  // DeepSeek
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek Chat",
    provider: "deepseek",
    description: "Great coding and reasoning capabilities",
  },
  // Reasoning models (extended thinking)
  {
    id: "anthropic/claude-3.5-sonnet-thinking",
    name: "Claude 3.5 Sonnet (Thinking)",
    provider: "reasoning",
    description: "Extended thinking for complex problems",
  },
];

// Group models by provider for UI
export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);
