export type ModelOption = {
  model: string;
  label: string;
  /** Optional note shown in the UI (e.g. "最快", "免費") */
  note?: string;
};

export type ProviderConfig = {
  id: string;
  label: string;
  baseUrl: string;
  apiKeyPlaceholder: string;
  models: ModelOption[];
};

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    apiKeyPlaceholder: "sk-ant-api03-...",
    models: [
      { model: "claude-opus-4-6", label: "Claude Opus 4.6" },
      { model: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", note: "推薦" },
      { model: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", note: "最快" },
      { model: "claude-3-7-sonnet-latest", label: "Claude 3.7 Sonnet" },
      { model: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
      { model: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKeyPlaceholder: "sk-...",
    models: [
      { model: "gpt-4.1", label: "GPT-4.1", note: "推薦" },
      { model: "gpt-4.1-mini", label: "GPT-4.1 Mini", note: "最快" },
      { model: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
      { model: "o3", label: "o3" },
      { model: "o4-mini", label: "o4-mini" },
      { model: "gpt-4o", label: "GPT-4o" },
    ],
  },
  {
    id: "google",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKeyPlaceholder: "AIza...",
    models: [
      { model: "gemini-2.5-flash-preview-04-17", label: "Gemini 2.5 Flash", note: "推薦" },
      { model: "gemini-2.5-pro-preview-03-25", label: "Gemini 2.5 Pro" },
      { model: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { model: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", note: "最快" },
    ],
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyPlaceholder: "gsk_...",
    models: [
      { model: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", note: "推薦" },
      { model: "llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B" },
      { model: "llama-3.1-8b-instant", label: "Llama 3.1 8B", note: "最快" },
      { model: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 Distill 70B" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyPlaceholder: "sk-or-v1-...",
    models: [
      { model: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6", note: "推薦" },
      { model: "anthropic/claude-opus-4-6", label: "Claude Opus 4.6" },
      { model: "openai/gpt-4.1", label: "GPT-4.1" },
      { model: "openai/o3", label: "o3" },
      { model: "google/gemini-2.5-flash-preview", label: "Gemini 2.5 Flash" },
      { model: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick" },
      { model: "deepseek/deepseek-r1", label: "DeepSeek R1" },
    ],
  },
  {
    id: "custom",
    label: "自訂",
    baseUrl: "",
    apiKeyPlaceholder: "...",
    models: [],
  },
];

// ── Backward-compat flat list (used by server-side preset matching) ──────────
export type ModelPreset = {
  label: string;
  provider: string;
  baseUrl: string;
  model: string;
};

export const MODEL_PRESETS: ModelPreset[] = PROVIDERS.flatMap((p) =>
  p.models.length > 0
    ? p.models.map((m) => ({
        label: `${p.label} ${m.label}`,
        provider: p.id,
        baseUrl: p.baseUrl,
        model: m.model,
      }))
    : [{ label: p.label, provider: p.id, baseUrl: p.baseUrl, model: "" }]
);
