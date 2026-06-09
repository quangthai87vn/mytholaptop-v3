/**
 * ProvidersConfigPanel
 * Shows configuration form for the currently selected provider in AI Settings
 * Used in the "Providers" tab of AI Settings
 */

"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, Eye, EyeOff, Loader2, Wifi, WifiOff, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProviderCard } from "@/types/ai-operating";
import type { AIRuntimeConfig } from "@/types/ai-operating";

interface ProvidersConfigPanelProps {
  provider: ProviderCard | undefined;
  runtimeConfig: AIRuntimeConfig;
  onConfigChange: (field: string, value: string | number | boolean) => void;
  onTest: () => void;
  isTesting: boolean;
  testResult: { success: boolean; message: string; latency_ms?: number } | null;
  onSave: () => void;
  isSaving: boolean;
}

export function ProvidersConfigPanel({
  provider,
  runtimeConfig,
  onConfigChange,
  onTest,
  isTesting,
  testResult,
  onSave,
  isSaving,
}: ProvidersConfigPanelProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  if (!provider) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <AlertCircle className="size-6 text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-600 mb-1">Chưa chọn provider nào</p>
        <p className="text-xs text-slate-400">
          Chọn một provider từ danh sách bên trái để xem và chỉnh sửa cấu hình.
        </p>
      </div>
    );
  }

  const isActive = provider.status === "active" || provider.is_active;
  const hasApiKey = !!(provider as unknown as Record<string, unknown>).api_key_masked ||
    !!(provider as unknown as Record<string, unknown>).api_key_encrypted;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Provider Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {provider.display_name || provider.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {provider.type || provider.slug} · {provider.base_url ? new URL(provider.base_url).hostname : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={isActive ? "default" : "secondary"}
            className={cn(
              "text-xs",
              isActive && "bg-green-100 text-green-700 border-green-200"
            )}
          >
            {isActive ? (
              <><CheckCircle2 className="size-3 mr-1" /> Hoạt động</>
            ) : (
              <><WifiOff className="size-3 mr-1" /> Tắt</>
            )}
          </Badge>
        </div>
      </div>

      {/* Connection Test */}
      {testResult && (
        <div className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg border text-sm",
          testResult.success
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
        )}>
          {testResult.success ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span className="flex-1">{testResult.message}</span>
          {testResult.latency_ms && (
            <span className="text-xs opacity-70">{testResult.latency_ms}ms</span>
          )}
        </div>
      )}

      {/* Basic Config */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Base URL</Label>
            <Input
              value={provider.base_url || ""}
              onChange={(e) => onConfigChange("base_url", e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Default Model</Label>
            <Input
              value={runtimeConfig.model_name || provider.model_name || ""}
              onChange={(e) => onConfigChange("model_name", e.target.value)}
              placeholder="gpt-4o-mini"
              className="font-mono text-xs"
            />
          </div>
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">API Key</Label>
            {hasApiKey && (
              <Badge variant="outline" className="text-[9px] h-4">
                Đã lưu
              </Badge>
            )}
          </div>
          <div className="relative">
            <Input
              type={showApiKey ? "text" : "password"}
              value=""
              onChange={(e) => onConfigChange("api_key", e.target.value)}
              placeholder={hasApiKey ? "•••••••• (để trống = giữ key cũ)" : "sk-..."}
              className="font-mono text-xs pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
              onClick={() => setShowApiKey((v) => !v)}
            >
              {showApiKey ? (
                <EyeOff className="size-3 text-muted-foreground" />
              ) : (
                <Eye className="size-3 text-muted-foreground" />
              )}
            </Button>
          </div>
          <p className="text-[9px] text-muted-foreground">
            Mã hóa AES-256-GCM trước khi lưu. Để trống nếu không đổi key.
          </p>
        </div>
      </div>

      <Separator />

      {/* Toggles */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3 flex-1 min-w-[140px]">
          <div>
            <Label className="text-xs">Kích hoạt</Label>
            <p className="text-[9px] text-muted-foreground">Dùng cho AI</p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={(v) => onConfigChange("is_active", v)}
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3 flex-1 min-w-[140px]">
          <div>
            <Label className="text-xs">Mặc định</Label>
            <p className="text-[9px] text-muted-foreground">Khi không chỉ định</p>
          </div>
          <Switch
            checked={provider.is_default ?? false}
            onCheckedChange={(v) => onConfigChange("is_default", v)}
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3 flex-1 min-w-[140px]">
          <div>
            <Label className="text-xs">Streaming</Label>
            <p className="text-[9px] text-muted-foreground">Xuất token dần</p>
          </div>
          <Switch
            checked={runtimeConfig.enable_streaming ?? false}
            onCheckedChange={(v) => onConfigChange("enable_streaming", v)}
          />
        </div>
      </div>

      <Separator />

      {/* Advanced Config */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-700">Cấu hình nâng cao</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-[10px]">Temperature</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={runtimeConfig.temperature ?? 0.7}
              onChange={(e) => onConfigChange("temperature", parseFloat(e.target.value) || 0.7)}
              className="text-xs h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Max Tokens</Label>
            <Input
              type="number"
              value={runtimeConfig.max_output_tokens ?? 2048}
              onChange={(e) => onConfigChange("max_output_tokens", parseInt(e.target.value) || 2048)}
              className="text-xs h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Timeout (ms)</Label>
            <Input
              type="number"
              value={runtimeConfig.timeout_ms ?? 60000}
              onChange={(e) => onConfigChange("timeout_ms", parseInt(e.target.value) || 60000)}
              className="text-xs h-8"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onTest}
          disabled={isTesting}
          className="gap-1.5"
        >
          {isTesting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Wifi className="size-3.5" />
          )}
          Test kết nối
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving} className="gap-1.5">
          {isSaving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Lưu cấu hình
        </Button>
      </div>
    </div>
  );
}
