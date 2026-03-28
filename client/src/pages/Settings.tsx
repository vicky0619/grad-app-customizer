import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MODEL_PRESETS } from "@shared/models";
import { toast } from "sonner";

export default function Settings() {
  const { data: settings, isLoading } = trpc.auth.getSettings.useQuery();
  const saveSettings = trpc.auth.saveSettings.useMutation({
    onSuccess: () => toast.success("設定已儲存"),
    onError: (e) => toast.error(`儲存失敗：${e.message}`),
  });

  const [selectedPreset, setSelectedPreset] = useState("custom:");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    if (!settings) return;
    setBaseUrl(settings.llmBaseUrl);
    setModel(settings.llmModel);
    const match = MODEL_PRESETS.find(
      (p) => p.baseUrl === settings.llmBaseUrl && p.model === settings.llmModel
    );
    setSelectedPreset(match ? `${match.provider}:${match.model}` : "custom:");
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

  if (isLoading) return <DashboardLayout><div className="p-6 text-muted-foreground text-sm">載入中…</div></DashboardLayout>;

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

        {/* Section */}
        <div className="border border-border rounded-sm p-6 space-y-5">
          <div className="pb-4 border-b border-border">
            <h2 className="text-base font-medium text-foreground mb-1">AI 模型設定</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              填入你自己的 API Key，系統會用你的 Key 呼叫 AI 模型。Key 加密儲存，不會以明文方式保存。
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="preset" className="label-editorial text-muted-foreground">模型預設</Label>
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger id="preset" className="bg-background">
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

          <div className="space-y-1.5">
            <Label htmlFor="baseUrl" className="label-editorial text-muted-foreground">
              API Base URL
            </Label>
            <Input
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="model" className="label-editorial text-muted-foreground">
              模型名稱
            </Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o"
              className="bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apiKey" className="label-editorial text-muted-foreground">
              API Key{" "}
              {settings?.hasApiKey && (
                <span className="normal-case font-normal text-muted-foreground">
                  （已設定，留空代表不更改）
                </span>
              )}
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={settings?.hasApiKey ? "••••••••••••（留空保留現有 Key）" : "sk-..."}
              autoComplete="off"
              className="bg-background"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saveSettings.isPending || (!settings?.hasApiKey && !apiKey)}
            className="w-full"
          >
            {saveSettings.isPending ? "儲存中…" : "儲存設定"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
