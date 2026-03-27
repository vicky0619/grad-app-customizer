# User LLM Settings & Hosted Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any user sign up, enter their own LLM API key + choose their model, and use the app without any self-deployment.

**Architecture:** Per-user LLM config (API key, base URL, model) stored in the DB. API keys are encrypted at rest with AES-256-GCM using a server-held `ENCRYPTION_KEY`. File uploads are migrated from Manus Forge to AWS S3. The system falls back to server-wide env vars if the user hasn't configured their own key.

**Tech Stack:** Express + tRPC, Drizzle ORM (MySQL), Node.js `crypto` (AES-256-GCM), `@aws-sdk/client-s3` (already in package.json), React 19, shadcn/ui components.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `shared/models.ts` | Model preset definitions shared by client + server |
| Create | `server/_core/crypto.ts` | AES-256-GCM encrypt/decrypt for API keys |
| Modify | `server/_core/env.ts` | Add `ENCRYPTION_KEY`, S3 vars |
| Modify | `server/_core/llm.ts` | Accept per-user `{ apiKey, baseUrl, model }` config |
| Rewrite | `server/storage.ts` | Replace Manus Forge with AWS S3 |
| Modify | `server/db.ts` | Support `llmApiKey`, `llmBaseUrl`, `llmModel` in upsertUser |
| Modify | `server/routers.ts` | Add `auth.saveSettings` + `auth.getSettings`; inject user LLM config in all `invokeLLM` calls |
| Modify | `drizzle/schema.ts` | Add `llmApiKey`, `llmBaseUrl`, `llmModel` columns to users |
| Modify | `client/src/App.tsx` | Add `/settings` route |
| Modify | `client/src/components/DashboardLayout.tsx` | Add Settings nav item; add "請設定 API Key" banner |
| Create | `client/src/pages/Settings.tsx` | Settings page: provider preset picker, API key input, model input |

---

## Task 1: Install Dependencies and Run Initial DB Migration

**Files:** none (shell commands only)

- [ ] **Step 1: Install dependencies**

```bash
cd /path/to/grad-app-customizer
pnpm install
```

Expected: packages installed, no errors.

- [ ] **Step 2: Run DB migration to apply `passwordHash` column**

```bash
pnpm db:push
```

Expected output includes: `passwordHash` column added to `users` table.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm check
```

Expected: no errors. If errors appear, fix them before continuing.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: install deps and apply initial DB migration"
```

---

## Task 2: Add Shared Model Presets

**Files:**
- Create: `shared/models.ts`

- [ ] **Step 1: Create the file**

```ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add shared/models.ts
git commit -m "feat: add shared LLM model presets"
```

---

## Task 3: Create Encryption Utility

**Files:**
- Create: `server/_core/crypto.ts`

- [ ] **Step 1: Create the file**

```ts
// server/_core/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY ?? "";
  if (hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be set to 64 hex characters (32 bytes). " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts a plaintext string. Returns "ivHex:authTagHex:ciphertextHex".
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Decrypts a value produced by `encrypt()`.
 */
export function decrypt(stored: string): string {
  const key = getKey();
  const parts = stored.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value format");
  }
  const [ivHex, tagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/_core/crypto.ts
git commit -m "feat: add AES-256-GCM encryption utility for API key storage"
```

---

## Task 4: Update Schema and Run DB Migration

**Files:**
- Modify: `drizzle/schema.ts` (users table only)

- [ ] **Step 1: Add three columns to the users table in `drizzle/schema.ts`**

Find the `passwordHash` line and add the three new columns after it:

```ts
  passwordHash: text("passwordHash"),
  llmApiKey: text("llmApiKey"),           // encrypted, see server/_core/crypto.ts
  llmBaseUrl: varchar("llmBaseUrl", { length: 500 }),
  llmModel: varchar("llmModel", { length: 100 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
```

- [ ] **Step 2: Run DB migration**

```bash
pnpm db:push
```

Expected: `llmApiKey`, `llmBaseUrl`, `llmModel` columns added to `users` table.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm check
```

Expected: no errors. The `User` and `InsertUser` types are auto-derived so they update automatically.

- [ ] **Step 4: Commit**

```bash
git add drizzle/schema.ts
git commit -m "feat: add per-user LLM config columns to users table"
```

---

## Task 5: Update ENV and crypto helper

**Files:**
- Modify: `server/_core/env.ts`

- [ ] **Step 1: Add `ENCRYPTION_KEY` and S3 vars to `server/_core/env.ts`**

Replace the entire file with:

```ts
export const ENV = {
  appId: process.env.APP_ID ?? "grad-app",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Server-wide LLM fallback (used if user hasn't set their own key)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  llmModel: process.env.LLM_MODEL ?? "gemini-2.5-flash",
  // Encryption key for user API keys stored in DB (64 hex chars = 32 bytes)
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  // AWS S3 for file storage
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3Region: process.env.S3_REGION ?? "us-east-1",
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm check
```

- [ ] **Step 3: Commit**

```bash
git add server/_core/env.ts
git commit -m "feat: add ENCRYPTION_KEY and S3 env vars"
```

---

## Task 6: Update invokeLLM to Accept Per-User Config

**Files:**
- Modify: `server/_core/llm.ts`

- [ ] **Step 1: Add `LLMConfig` type and update `invokeLLM` signature**

Find the `export async function invokeLLM` line and replace the function signature and API URL/key logic:

```ts
export type LLMConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

export async function invokeLLM(params: InvokeParams, config?: LLMConfig): Promise<InvokeResult> {
  const apiKey = config?.apiKey ?? ENV.forgeApiKey;
  const baseUrl = config?.baseUrl ?? ENV.forgeApiUrl;
  const model = config?.model ?? ENV.llmModel;

  if (!apiKey) {
    throw new Error("LLM API key is not configured. Please set your API key in Settings.");
  }

  const apiUrl = baseUrl && baseUrl.trim().length > 0
    ? `${baseUrl.replace(/\/$/, "")}/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const payload: Record<string, unknown> = {
    model,
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(toolChoice || tool_choice, tools);
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = 32768;
  payload.thinking = { budget_tokens: 128 };

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}
```

Also **delete** the old `resolveApiUrl` and `assertApiKey` functions (they're replaced by the inline logic above).

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/_core/llm.ts
git commit -m "feat: invokeLLM accepts per-user LLM config override"
```

---

## Task 7: Rewrite Storage with AWS S3

**Files:**
- Rewrite: `server/storage.ts`

- [ ] **Step 1: Replace the entire `server/storage.ts` with S3 implementation**

```ts
// server/storage.ts
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

const SIGNED_URL_EXPIRES_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getClient() {
  return new S3Client({ region: ENV.s3Region });
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (!ENV.s3Bucket) {
    throw new Error("S3_BUCKET is not configured");
  }

  const key = normalizeKey(relKey);
  const client = getClient();
  const body =
    typeof data === "string" ? Buffer.from(data, "utf8") : (data as Buffer);

  await client.send(
    new PutObjectCommand({
      Bucket: ENV.s3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }),
    { expiresIn: SIGNED_URL_EXPIRES_SECONDS }
  );

  return { key, url };
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  if (!ENV.s3Bucket) {
    throw new Error("S3_BUCKET is not configured");
  }

  const key = normalizeKey(relKey);
  const client = getClient();
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }),
    { expiresIn: SIGNED_URL_EXPIRES_SECONDS }
  );

  return { key, url };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/storage.ts
git commit -m "feat: replace Manus Forge storage with AWS S3"
```

---

## Task 8: Update db.ts for New User Fields

**Files:**
- Modify: `server/db.ts`

- [ ] **Step 1: Add the three new fields to the `textFields` array in `upsertUser`**

Find the `textFields` line and replace it:

```ts
const textFields = ["name", "email", "loginMethod", "passwordHash", "llmApiKey", "llmBaseUrl", "llmModel"] as const;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm check
```

- [ ] **Step 3: Commit**

```bash
git add server/db.ts
git commit -m "feat: support llmApiKey, llmBaseUrl, llmModel in upsertUser"
```

---

## Task 9: Add Settings Endpoints and Inject User Config in LLM Calls

**Files:**
- Modify: `server/routers.ts`

- [ ] **Step 1: Add imports at the top of `server/routers.ts`**

After the existing imports, add:

```ts
import { encrypt, decrypt } from "./_core/crypto";
import type { LLMConfig } from "./_core/llm";
```

- [ ] **Step 2: Add a helper function to extract user's LLM config**

Add this function right after the imports, before `export const appRouter`:

```ts
function getUserLLMConfig(user: { llmApiKey?: string | null; llmBaseUrl?: string | null; llmModel?: string | null }): LLMConfig {
  return {
    apiKey: user.llmApiKey ? decrypt(user.llmApiKey) : undefined,
    baseUrl: user.llmBaseUrl ?? undefined,
    model: user.llmModel ?? undefined,
  };
}
```

- [ ] **Step 3: Add `auth.saveSettings` and `auth.getSettings` to the auth router**

Inside the `auth: router({...})` block, add after the `register` mutation:

```ts
    getSettings: protectedProcedure.query(async ({ ctx }) => {
      return {
        hasApiKey: !!ctx.user.llmApiKey,
        llmBaseUrl: ctx.user.llmBaseUrl ?? "",
        llmModel: ctx.user.llmModel ?? "",
      };
    }),
    saveSettings: protectedProcedure
      .input(z.object({
        apiKey: z.string().optional(), // empty string means "don't change"
        llmBaseUrl: z.string(),
        llmModel: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const update: Parameters<typeof db.upsertUser>[0] = {
          openId: ctx.user.openId,
          llmBaseUrl: input.llmBaseUrl || null,
          llmModel: input.llmModel || null,
        };
        if (input.apiKey && input.apiKey.trim().length > 0) {
          update.llmApiKey = encrypt(input.apiKey.trim());
        }
        await db.upsertUser(update);
        return { success: true } as const;
      }),
```

- [ ] **Step 4: Update all five `invokeLLM` calls to pass user config**

For every call to `invokeLLM` in `routers.ts` that is inside a `protectedProcedure`, pass `getUserLLMConfig(ctx.user)` as the second argument.

Find each occurrence of:
```ts
const response = await invokeLLM({
```
or
```ts
const selectionResponse = await invokeLLM({
```
or
```ts
const generateResponse = await invokeLLM({
```

And change it to:
```ts
const response = await invokeLLM({
  // ... existing params unchanged ...
}, getUserLLMConfig(ctx.user));
```

```ts
const selectionResponse = await invokeLLM({
  // ... existing params unchanged ...
}, getUserLLMConfig(ctx.user));
```

```ts
const generateResponse = await invokeLLM({
  // ... existing params unchanged ...
}, getUserLLMConfig(ctx.user));
```

There are 5 calls total — lines 270, 409, 594, 738, 899 in the original file (line numbers may shift after edits). Search for `invokeLLM({` and add `, getUserLLMConfig(ctx.user)` before the closing `});` of each call.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add server/routers.ts
git commit -m "feat: add auth.saveSettings, auth.getSettings; inject per-user LLM config"
```

---

## Task 10: Create Settings Page UI

**Files:**
- Create: `client/src/pages/Settings.tsx`

- [ ] **Step 1: Create the file**

```tsx
// client/src/pages/Settings.tsx
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MODEL_PRESETS } from "@shared/models";
import { toast } from "sonner";

export default function Settings() {
  const { data: settings, isLoading } = trpc.auth.getSettings.useQuery();
  const saveSettings = trpc.auth.saveSettings.useMutation({
    onSuccess: () => toast.success("設定已儲存"),
    onError: (e) => toast.error(`儲存失敗：${e.message}`),
  });

  const [selectedPreset, setSelectedPreset] = useState("custom");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    if (!settings) return;
    setBaseUrl(settings.llmBaseUrl);
    setModel(settings.llmModel);
    // Try to match a preset
    const match = MODEL_PRESETS.find(
      (p) => p.baseUrl === settings.llmBaseUrl && p.model === settings.llmModel
    );
    setSelectedPreset(match ? `${match.provider}:${match.model}` : "custom");
  }, [settings]);

  function handlePresetChange(value: string) {
    setSelectedPreset(value);
    const preset = MODEL_PRESETS.find((p) => `${p.provider}:${p.model}` === value);
    if (preset && preset.provider !== "custom") {
      setBaseUrl(preset.baseUrl);
      setModel(preset.model);
    }
  }

  function handleSave() {
    saveSettings.mutate({ apiKey, llmBaseUrl: baseUrl, llmModel: model });
  }

  if (isLoading) return <DashboardLayout><div className="p-6">載入中…</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto space-y-6 p-6">
        <h1 className="text-xl font-semibold">設定</h1>

        <Card>
          <CardHeader>
            <CardTitle>AI 模型設定</CardTitle>
            <CardDescription>
              填入你自己的 API Key，系統會用你的 Key 呼叫 AI 模型。Key 加密儲存，不會以明文方式保存。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>模型預設</Label>
              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇模型" />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_PRESETS.map((p) => (
                    <SelectItem
                      key={`${p.provider}:${p.model}`}
                      value={`${p.provider}:${p.model}`}
                    >
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="baseUrl">API Base URL</Label>
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="model">模型名稱</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="apiKey">
                API Key{" "}
                {settings?.hasApiKey && (
                  <span className="text-xs text-muted-foreground ml-1">（已設定，留空代表不更改）</span>
                )}
              </Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={settings?.hasApiKey ? "••••••••••••（留空保留現有 Key）" : "sk-..."}
                autoComplete="off"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={saveSettings.isPending || (!settings?.hasApiKey && !apiKey)}
              className="w-full"
            >
              {saveSettings.isPending ? "儲存中…" : "儲存設定"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Add `/settings` route to `client/src/App.tsx`**

Add the import and route:

```tsx
import Settings from "./pages/Settings";
```

Add to the Switch:

```tsx
<Route path={"/settings"} component={Settings} />
```

Place it after the `/login` route.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm check
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Settings.tsx client/src/App.tsx
git commit -m "feat: add Settings page for API key and model configuration"
```

---

## Task 11: Update DashboardLayout — Settings Nav + API Key Banner

**Files:**
- Modify: `client/src/components/DashboardLayout.tsx`

- [ ] **Step 1: Add Settings nav item**

Find the `menuItems` array:

```ts
const menuItems = [
  { icon: LayoutDashboard, label: "Page 1", path: "/" },
  { icon: Users, label: "Page 2", path: "/some-path" },
];
```

Replace it with the actual app pages plus Settings:

```ts
import { LayoutDashboard, FileText, Settings, LogOut, PanelLeft } from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "首頁", path: "/" },
  { icon: FileText, label: "我的學校", path: "/programs" },
  { icon: FileText, label: "我的模板", path: "/templates" },
  { icon: Settings, label: "設定", path: "/settings" },
];
```

Also update the import line at the top of the file — replace `LayoutDashboard, LogOut, PanelLeft, Users` with `LayoutDashboard, FileText, Settings, LogOut, PanelLeft`.

- [ ] **Step 2: Add "Sign in" button navigation fix**

Find the `window.location.href = getLoginUrl()` in the unauthenticated view and replace with:

```tsx
import { useLocation } from "wouter";
// inside the component that renders the sign-in button:
const [, navigate] = useLocation();
// ...
<Button
  onClick={() => navigate(getLoginUrl())}
  size="lg"
  className="w-full shadow-lg hover:shadow-xl transition-all"
>
  登入
</Button>
```

Note: `DashboardLayout` already imports `useLocation` from wouter (line 26). Just add `navigate` to the destructure in `DashboardLayoutContent`:

```ts
const [location, setLocation] = useLocation();
```
→ change to:
```ts
const [location, navigate] = useLocation();
// setLocation is the same function as navigate; alias for clarity
const setLocation = navigate;
```

And in the unauthenticated block (around line 80):
```tsx
<Button
  onClick={() => navigate(getLoginUrl())}
  size="lg"
  className="w-full shadow-lg hover:shadow-xl transition-all"
>
  登入
</Button>
```

- [ ] **Step 3: Add API key banner**

Add a new tRPC query call in `DashboardLayoutContent`. Add after the existing hooks (around line 120):

```tsx
const settingsQuery = trpc.auth.getSettings.useQuery(undefined, {
  enabled: !!user,
  retry: false,
  refetchOnWindowFocus: false,
});
const needsApiKey = user && settingsQuery.data && !settingsQuery.data.hasApiKey;
```

Then in the `<SidebarInset>` block, before `<main>`, add the banner:

```tsx
{needsApiKey && location !== "/settings" && (
  <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-sm text-amber-800">
    <span>請先設定 API Key 才能使用 AI 功能</span>
    <button
      onClick={() => setLocation("/settings")}
      className="font-medium underline hover:no-underline"
    >
      前往設定
    </button>
  </div>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm check
```

- [ ] **Step 5: Start dev server and manually verify**

```bash
pnpm dev
```

Checklist:
- [ ] Open `http://localhost:3000` — see login page
- [ ] Register with email + password
- [ ] After login, see the amber banner "請先設定 API Key"
- [ ] Click banner → navigate to `/settings`
- [ ] Select "Google Gemini 2.5 Flash" preset — base URL and model auto-fill
- [ ] Enter a valid API key → save → toast "設定已儲存"
- [ ] Reload page — banner is gone
- [ ] Navigate to a program and generate a document — verify LLM uses the saved key

- [ ] **Step 6: Commit**

```bash
git add client/src/components/DashboardLayout.tsx
git commit -m "feat: add Settings nav item and API key missing banner"
```

---

## Environment Variables Reference

Add these to your `.env` file (create from `.env.example`):

```bash
# Auth
JWT_SECRET=<random 64-char string>
APP_ID=grad-app

# Encryption (for API keys stored in DB)
ENCRYPTION_KEY=<output of: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Database
DATABASE_URL=mysql://user:pass@host:3306/dbname

# AWS S3 (for file uploads)
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
# AWS credentials via env or IAM role:
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Server-wide LLM fallback (optional — used if user hasn't set their own key)
BUILT_IN_FORGE_API_URL=https://api.openai.com/v1
BUILT_IN_FORGE_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```

## Security Notes

- `ENCRYPTION_KEY` is the single most sensitive env var. Rotate it only during maintenance windows (existing encrypted keys in DB will need re-encryption).
- API keys are **never** returned to the client — `getSettings` only returns `hasApiKey: boolean`.
- Signed S3 URLs expire after 7 days. If a user revisits an old document after 7 days, call `storageGet(fileKey)` to refresh the URL before displaying.
