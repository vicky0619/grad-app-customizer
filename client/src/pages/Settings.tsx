import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROVIDERS } from "@shared/models";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────────

function findProvider(baseUrl: string) {
  return PROVIDERS.find((p) => p.id !== "custom" && p.baseUrl === baseUrl);
}

function findModel(providerId: string, model: string) {
  const p = PROVIDERS.find((p) => p.id === providerId);
  return p?.models.find((m) => m.model === model);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Settings() {
  const { data: settings, isLoading } = trpc.auth.getSettings.useQuery();
  const saveSettings = trpc.auth.saveSettings.useMutation({
    onSuccess: () => toast.success("設定已儲存"),
    onError: (e) => toast.error(`儲存失敗：${e.message}`),
  });

  const [selectedProviderId, setSelectedProviderId] = useState("openai");
  const [selectedModel, setSelectedModel] = useState("gpt-4.1");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [apiKey, setApiKey] = useState("");

  // Populate from saved settings
  useEffect(() => {
    if (!settings) return;
    const provider = findProvider(settings.llmBaseUrl);
    if (provider) {
      setSelectedProviderId(provider.id);
      const modelExists = findModel(provider.id, settings.llmModel);
      setSelectedModel(modelExists ? settings.llmModel : provider.models[0]?.model ?? "");
    } else {
      setSelectedProviderId("custom");
      setCustomBaseUrl(settings.llmBaseUrl);
      setCustomModel(settings.llmModel);
    }
  }, [settings]);

  const activeProvider = PROVIDERS.find((p) => p.id === selectedProviderId)!;
  const isCustom = selectedProviderId === "custom";

  function handleProviderChange(id: string) {
    setSelectedProviderId(id);
    const p = PROVIDERS.find((p) => p.id === id)!;
    if (p.models.length > 0) setSelectedModel(p.models[0].model);
  }

  function handleSave() {
    const baseUrl = isCustom ? customBaseUrl : activeProvider.baseUrl;
    const model = isCustom ? customModel : selectedModel;
    saveSettings.mutate({ apiKey, llmBaseUrl: baseUrl, llmModel: model });
  }

  const canSave =
    !saveSettings.isPending &&
    (settings?.hasApiKey || !!apiKey) &&
    (isCustom ? !!customBaseUrl && !!customModel : !!selectedModel);

  if (isLoading)
    return (
      <DashboardLayout>
        <div className="p-6 text-muted-foreground text-sm">載入中…</div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto py-8">
        {/* Page header */}
        <div className="pb-6 border-b border-border mb-8">
          <p className="label-editorial text-muted-foreground mb-2">偏好設定</p>
          <h1
            className="text-3xl font-medium text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            設定
          </h1>
        </div>

        <div className="border border-border rounded-sm p-6 space-y-6">
          <div className="pb-4 border-b border-border">
            <h2 className="text-base font-medium text-foreground mb-1">AI 模型設定</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              選擇 AI 服務商與模型，並填入對應的 API Key。Key 加密儲存，不會以明文方式保存。
            </p>
          </div>

          {/* Step 1 — Provider */}
          <div className="space-y-2">
            <Label className="label-editorial text-muted-foreground">服務商</Label>
            <div className="grid grid-cols-3 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderChange(p.id)}
                  className={`px-3 py-2.5 text-sm border rounded-sm transition-colors text-left ${
                    selectedProviderId === p.id
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border bg-background text-foreground hover:border-foreground/30"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 — Model (not shown for custom) */}
          {!isCustom && activeProvider.models.length > 0 && (
            <div className="space-y-2">
              <Label className="label-editorial text-muted-foreground">模型</Label>
              <div className="grid grid-cols-1 gap-1.5">
                {activeProvider.models.map((m) => (
                  <button
                    key={m.model}
                    type="button"
                    onClick={() => setSelectedModel(m.model)}
                    className={`flex items-center justify-between px-3 py-2.5 text-sm border rounded-sm transition-colors ${
                      selectedModel === m.model
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-background text-foreground hover:border-foreground/30"
                    }`}
                  >
                    <span className={selectedModel === m.model ? "font-medium" : ""}>
                      {m.label}
                    </span>
                    {m.note && (
                      <span
                        className={`label-editorial ml-2 ${
                          selectedModel === m.model ? "text-primary/70" : "text-muted-foreground"
                        }`}
                      >
                        {m.note}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom provider fields */}
          {isCustom && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="customBaseUrl" className="label-editorial text-muted-foreground">
                  API Base URL
                </Label>
                <Input
                  id="customBaseUrl"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customModel" className="label-editorial text-muted-foreground">
                  模型名稱
                </Label>
                <Input
                  id="customModel"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="gpt-4o"
                  className="bg-background"
                />
              </div>
            </div>
          )}

          {/* API Key */}
          <div className="space-y-1.5">
            <Label htmlFor="apiKey" className="label-editorial text-muted-foreground">
              API Key
              {settings?.hasApiKey && (
                <span className="normal-case font-normal text-muted-foreground ml-1">
                  （已設定，留空代表不更改）
                </span>
              )}
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                settings?.hasApiKey
                  ? "••••••••••••（留空保留現有 Key）"
                  : activeProvider.apiKeyPlaceholder
              }
              autoComplete="off"
              className="bg-background font-mono text-sm"
            />
          </div>

          {/* Current config summary */}
          {!isCustom && selectedModel && (
            <div className="rounded-sm bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground space-y-0.5">
              <div>
                <span className="label-editorial mr-2">Provider</span>
                {activeProvider.baseUrl}
              </div>
              <div>
                <span className="label-editorial mr-2">Model</span>
                {selectedModel}
              </div>
            </div>
          )}

          <Button onClick={handleSave} disabled={!canSave} className="w-full">
            {saveSettings.isPending ? "儲存中…" : "儲存設定"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
