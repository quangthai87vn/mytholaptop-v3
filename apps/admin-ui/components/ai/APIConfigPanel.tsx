"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ShieldCheck,
  Zap,
  RefreshCw,
  Eye,
  EyeOff,
  Globe,
  Cpu,
  AlertTriangle,
  Server,
  Layers,
} from "lucide-react";
import type { ProviderType, ProviderModel, ModelFamily, LocalRuntime } from "@/types/ai-operating";
import { MODEL_FAMILY_META, LOCAL_RUNTIME_META, PROVIDER_CONFIG } from "@/types/ai-operating";

const PROVIDER_LABELS: Record<ProviderType, string> = {
  openai: "OpenAI",
  gemini: "Google Gemini",
  deepseek: "DeepSeek Cloud",
  huggingface: "HuggingFace",
  ollama: "Ollama",
  lmstudio: "LM Studio",
  "openai-compatible": "OpenAI-Compatible",
  openrouter: "OpenRouter",
  groq: "Groq",
};

const LOCAL_RUNTIMES: LocalRuntime[] = ["ollama", "lmstudio", "openai-compatible"];
const MODEL_FAMILIES: ModelFamily[] = ["general", "deepseek", "qwen", "llama", "gemma", "mistral"];

interface APIConfigPanelProps {
  providerType: string;
  config: {
    base_url?: string;
    api_key?: string;
    model_name?: string;
    model_family?: ModelFamily;
    local_runtime?: LocalRuntime;
    timeout_ms?: number;
    retry_count?: number;
    enable_streaming?: boolean;
    temperature?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    max_output_tokens?: number;
  };
  availableModels: ProviderModel[];
  loadingModels: boolean;
  onChange: (field: string, value: string | number | boolean) => void;
  onRefreshModels?: () => void;
  onTest?: () => void;
  testResult?: { success: boolean; message: string; latency_ms?: number } | null;
}

export function APIConfigPanel({
  providerType,
  config,
  availableModels,
  loadingModels,
  onChange,
  onRefreshModels,
  onTest,
  testResult,
}: APIConfigPanelProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const isDirty = false; // handled globally via SaveButton
  const isSaving = false; // handled globally

  const cfg = PROVIDER_CONFIG[providerType as ProviderType] || { tier: "cloud" as const, requiresApiKey: true, defaultUrl: "" };

  const isLocal = cfg.tier === "local";
  const requiresKey = cfg.requiresApiKey;

  const tempVal = typeof config.temperature === "number" ? config.temperature : 0.7;

  // API Key warning
  const apiKeyMissing = requiresKey && !config.api_key;

  // Get suggested models for Ollama
  const suggestedModelsForFamily = config.model_family
    ? MODEL_FAMILY_META[config.model_family]?.suggestedModels || []
    : [];

  return (
    <div className="space-y-5">
      {/* Connection Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            Kết nối
            <Badge variant="outline" className="text-[10px] ml-auto font-normal">
              {PROVIDER_LABELS[providerType as ProviderType]}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Local runtime selector */}
          {isLocal && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Local Runtime</Label>
              <div className="grid grid-cols-3 gap-2">
                {LOCAL_RUNTIMES.map((rt) => {
                  const rtMeta = LOCAL_RUNTIME_META[rt];
                  const isSelected = config.local_runtime === rt;
                  return (
                    <button
                      key={rt}
                      onClick={() => {
                        onChange("local_runtime", rt);
                        onChange("base_url", `http://localhost:${rtMeta.defaultPort}${rt === "openai-compatible" ? "/v1" : ""}`);
                      }}
                      className={`p-2 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border hover:border-muted-foreground/50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Server className="size-3 text-orange-500" />
                        <span className="text-xs font-semibold">{rtMeta.label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        Port {rtMeta.defaultPort}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Base URL */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Base URL</Label>
            <div className="flex gap-2">
              <Input
                value={config.base_url || cfg.defaultUrl}
                onChange={(e) => onChange("base_url", e.target.value)}
                placeholder={cfg.defaultUrl}
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => onChange("base_url", cfg.defaultUrl)}
                title="Reset về mặc định"
              >
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </div>

          {/* API Key */}
          {requiresKey ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">API Key</Label>
                {apiKeyMissing && (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <AlertTriangle className="size-3" />
                    Bắt buộc
                  </Badge>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={config.api_key || ""}
                  onChange={(e) => onChange("api_key", e.target.value)}
                  placeholder={providerType === "deepseek" ? "sk-..." : "sk-..."}
                  className="pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                API key được mã hóa AES-256-GCM trước khi lưu.
              </p>
            </div>
          ) : isLocal ? (
            <div className="rounded-lg bg-orange-50 dark:bg-orange-950/20 p-3 border border-orange-200 dark:border-orange-800">
              <p className="text-xs text-orange-700 dark:text-orange-300 flex items-start gap-1.5">
                <Cpu className="size-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Local Runtime</strong> — Không cần API Key.
                  Đảm bảo {config.local_runtime === "ollama" ? "Ollama" : config.local_runtime === "lmstudio" ? "LM Studio" : "server"} đang chạy.
                  Chi phí API = 0đ, nhưng vẫn tốn tài nguyên GPU/CPU máy.
                </span>
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <Layers className="size-3 shrink-0" />
                HuggingFace Inference API — Dùng HF Token để truy cập private models.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Timeout (ms)</Label>
              <Input
                type="number"
                value={config.timeout_ms || 30000}
                onChange={(e) => onChange("timeout_ms", parseInt(e.target.value) || 30000)}
                min={5000}
                max={120000}
                step={5000}
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Số lần thử lại</Label>
              <Input
                type="number"
                value={config.retry_count || 3}
                onChange={(e) => onChange("retry_count", parseInt(e.target.value) || 3)}
                min={0}
                max={10}
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="streaming"
                checked={config.enable_streaming ?? false}
                onCheckedChange={(v) => onChange("enable_streaming", v)}
              />
              <Label htmlFor="streaming" className="text-xs cursor-pointer">Bật Streaming</Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onTest}
              className="gap-1.5 text-xs h-8"
            >
              <Zap className="size-3" />
              Test Connection
            </Button>
          </div>

          {testResult && (
            <div className={`rounded-lg p-3 text-xs flex items-center gap-2 ${
              testResult.success
                ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
            }`}>
              <ShieldCheck className="size-4 shrink-0" />
              <span className="flex-1">{testResult.message}</span>
              {testResult.latency_ms && (
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {testResult.latency_ms}ms
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            Model Runtime
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model Family (Ollama only) */}
          {providerType === "ollama" && (
            <>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Model Family</Label>
                <Select
                  value={config.model_family || "general"}
                  onValueChange={(v) => {
                    onChange("model_family", v as ModelFamily);
                    // Auto-suggest first model for the selected family
                    const family = MODEL_FAMILY_META[v as ModelFamily];
                    if (family?.suggestedModels[0]) {
                      onChange("model_name", family.suggestedModels[0]);
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_FAMILIES.map((family) => {
                      const meta = MODEL_FAMILY_META[family];
                      return (
                        <SelectItem key={family} value={family} className="text-xs">
                          <div className="flex items-center gap-2">
                            <span>{meta.label}</span>
                            <span className="text-muted-foreground text-[10px]">
                              ({meta.suggestedModels.length} models)
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {config.model_family ? (
                  <p className="text-[10px] text-muted-foreground">
                    {MODEL_FAMILY_META[config.model_family]?.description}
                  </p>
                ) : null}
              </div>

              {/* Suggested models from selected family */}
              {config.model_family ? (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Gợi ý {MODEL_FAMILY_META[config.model_family]?.label} Models
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedModelsForFamily.length > 0 ? (
                      suggestedModelsForFamily.map((modelId) => (
                        <button
                          key={modelId}
                          onClick={() => onChange("model_name", modelId)}
                          className={`px-2 py-1 rounded-md border text-[11px] font-mono transition-all ${
                            config.model_name === modelId
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50 text-muted-foreground"
                          }`}
                        >
                          {modelId}
                        </button>
                      ))
                    ) : (
                      <p className="text-[10px] text-orange-500">
                        Không có gợi ý cho family này
                      </p>
                    )}
                  </div>
                  <p className="text-[10px] text-orange-600 dark:text-orange-400">
                    Cần download trong Ollama: <code className="font-mono">ollama pull {config.model_name}</code>
                  </p>
                </div>
              ) : null}
            </>
          )}

          {/* Model selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Model</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefreshModels}
                disabled={loadingModels || !onRefreshModels}
                className="gap-1 text-[10px] h-6 px-2"
              >
                {loadingModels ? <RefreshCw className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                {loadingModels ? "Đang tải..." : "Refresh"}
              </Button>
            </div>

            {isLocal && providerType !== "ollama" && !availableModels.length ? (
              <div className="space-y-2">
                <Input
                  value={config.model_name || ""}
                  onChange={(e) => onChange("model_name", e.target.value)}
                  placeholder="Nhập tên model..."
                  className="font-mono text-xs h-9"
                />
                <p className="text-[10px] text-orange-600 dark:text-orange-400">
                  Nhấn <strong>Refresh</strong> để tìm models đang chạy trên {cfg.label}
                </p>
              </div>
            ) : availableModels.length > 0 ? (
              <Select
                value={config.model_name || ""}
                onValueChange={(v) => onChange("model_name", v)}
              >
                <SelectTrigger className="font-mono text-xs h-9">
                  <SelectValue placeholder="Chọn model..." />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.display_name || m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={config.model_name || ""}
                onChange={(e) => onChange("model_name", e.target.value)}
                placeholder={
                  providerType === "deepseek"
                    ? "deepseek-chat"
                    : providerType === "huggingface"
                    ? "mistralai/Mistral-7B-Instruct-v0.2"
                    : "Nhập tên model..."
                }
                className="font-mono text-xs h-9"
              />
            )}
            {availableModels.length > 0 && (
              <p className="text-[10px] text-muted-foreground">
                {availableModels.length} model(s) khả dụng
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Temperature</Label>
              <span className="text-xs font-mono text-primary">{tempVal.toFixed(1)}</span>
            </div>
            <Slider
              value={[tempVal]}
              min={0}
              max={2}
              step={0.1}
              onValueChange={([v]) => onChange("temperature", v)}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Chính xác (0)</span>
              <span>Sáng tạo (2)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Max Output Tokens</Label>
              <Input
                type="number"
                value={config.max_output_tokens || 2048}
                onChange={(e) => onChange("max_output_tokens", parseInt(e.target.value) || 2048)}
                min={100}
                max={32000}
                step={100}
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Top P</Label>
              <Input
                type="number"
                value={config.top_p || 1}
                onChange={(e) => onChange("top_p", parseFloat(e.target.value) || 1)}
                min={0}
                max={1}
                step={0.05}
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Frequency Penalty</Label>
              <Input
                type="number"
                value={config.frequency_penalty ?? 0}
                onChange={(e) => onChange("frequency_penalty", parseFloat(e.target.value) || 0)}
                min={-2}
                max={2}
                step={0.1}
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Presence Penalty</Label>
              <Input
                type="number"
                value={config.presence_penalty ?? 0}
                onChange={(e) => onChange("presence_penalty", parseFloat(e.target.value) || 0)}
                min={-2}
                max={2}
                step={0.1}
                className="text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Note: Save handled globally via SaveButton in page header */}
    </div>
  );
}
