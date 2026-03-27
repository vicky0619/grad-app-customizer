// shared/models.ts
export type ModelPreset = {
  label: string;
  provider: string;
  baseUrl: string;
  model: string;
};

export const MODEL_PRESETS: ModelPreset[] = [
  {
    label: "OpenAI GPT-4o",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o",
  },
  {
    label: "OpenAI GPT-4o Mini",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  {
    label: "OpenAI o3 Mini",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "o3-mini",
  },
  {
    label: "Google Gemini 2.5 Flash",
    provider: "google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
  },
  {
    label: "Google Gemini 2.0 Flash",
    provider: "google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.0-flash",
  },
  {
    label: "Groq Llama 3.3 70B（免費）",
    provider: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
  },
  {
    label: "OpenRouter（多模型）",
    provider: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o",
  },
  {
    label: "自訂",
    provider: "custom",
    baseUrl: "",
    model: "",
  },
];
