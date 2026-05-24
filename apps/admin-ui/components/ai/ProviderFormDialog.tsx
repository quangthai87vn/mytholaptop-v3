/**
 * ProviderFormDialog
 * Unified Add/Edit AI Provider modal
 */

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  PlusCircle,
  X,
  AlertTriangle,
} from "lucide-react";
import type { ProviderCard } from "@/types/ai-operating";
import type { ProviderGroupSlug } from "@/lib/content/types";

export interface ProviderFormData {
  // Tên hiển thị — lưu vào DB display_name
  display_name: string;
  // Slug cho routing
  slug: string;
  // Các trường khác giữ nguyên
  group_slug: ProviderGroupSlug;
  base_url: string;
  api_key: string;
  model_name: string;
  streaming_enabled: boolean;
  timeout_ms: number;
  retry_count: number;
  status: "active" | "inactive";
  is_default: boolean;
  custom_headers: Array<{ key: string; value: string }>;
  temperature: number;
  max_output_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
}

interface ProviderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after save completes. Returns { id, name } so parent can update UI immediately. */
  onSaved: (data: { id: number; name: string }) => Promise<void>;
  editingProvider?: ProviderCard | null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function getDefaultFormData(existing?: ProviderCard | null): ProviderFormData {
  if (existing) {
    return {
      display_name: existing.display_name || existing.name || "",
      slug: existing.slug || existing.type || "",
      group_slug: existing.group_slug || "cloud_api",
      base_url: existing.base_url || "",
      api_key: "",
      model_name: existing.model_name || "",
      streaming_enabled: (existing as unknown as Record<string, unknown>).streaming_enabled as boolean ?? false,
      timeout_ms: (existing as unknown as Record<string, unknown>).timeout_ms as number ?? 60000,
      retry_count: (existing as unknown as Record<string, unknown>).retry_count as number ?? 3,
      status: existing.status ?? (existing.is_active ? "active" : "inactive"),
      is_default: existing.is_default ?? false,
      custom_headers: Object.entries((existing as unknown as Record<string, unknown>).custom_headers || {}).map(([key, value]) => ({
        key,
        value: value as string,
      })),
      temperature: existing.temperature ?? 0.7,
      max_output_tokens: (existing as unknown as Record<string, unknown>).max_output_tokens as number ?? 2048,
      top_p: (existing as unknown as Record<string, unknown>).top_p as number ?? 1,
      frequency_penalty: (existing as unknown as Record<string, unknown>).frequency_penalty as number ?? 0,
      presence_penalty: (existing as unknown as Record<string, unknown>).presence_penalty as number ?? 0,
    };
  }
  return {
    display_name: "",
    slug: "",
    group_slug: "cloud_api",
    base_url: "",
    api_key: "",
    model_name: "",
    streaming_enabled: false,
    timeout_ms: 60000,
    retry_count: 3,
    status: "inactive",
    is_default: false,
    custom_headers: [],
    temperature: 0.7,
    max_output_tokens: 2048,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  };
}

export function ProviderFormDialog({
  open,
  onOpenChange,
  onSaved,
  editingProvider,
}: ProviderFormDialogProps) {
  const mode: "create" | "edit" = editingProvider ? "edit" : "create";
  const [form, setForm] = useState<ProviderFormData>(getDefaultFormData(editingProvider));
  const [saving, setSaving] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(false);

  // Reset form when dialog opens/closes or editingProvider changes
  useEffect(() => {
    if (!open) return;
    setForm(getDefaultFormData(editingProvider));
  }, [open, editingProvider]);

  // Load full provider data (including runtimeConfig) for edit mode
  useEffect(() => {
    if (!editingProvider) return;
    setLoadingProvider(true);
    fetch(`/api/ai/providers/${editingProvider.id}`)
      .then((r) => r.json())
      .then(({ data }) => {
        if (!data) return;
        // Update provider base fields — use display_name for UI name
        if (data.provider) {
          setForm((f) => ({
            ...f,
            display_name: data.provider.display_name ?? data.provider.name ?? f.display_name,
            slug: data.provider.slug ?? f.slug,
            group_slug: data.provider.group_slug ?? f.group_slug,
            base_url: data.provider.base_url ?? f.base_url,
            status: data.provider.status ?? f.status,
            is_default: data.provider.is_default ?? f.is_default,
            custom_headers: Object.entries(data.provider.custom_headers || {}).map(([k, v]) => ({
              key: k,
              value: v as string,
            })),
          }));
        }
        // Update runtime config fields
        if (data.runtimeConfig) {
          setForm((f) => ({
            ...f,
            model_name: data.runtimeConfig.selected_model || f.model_name,
            temperature: data.runtimeConfig.temperature ?? f.temperature,
            max_output_tokens: data.runtimeConfig.max_output_tokens ?? f.max_output_tokens,
            top_p: data.runtimeConfig.top_p ?? f.top_p,
            frequency_penalty: data.runtimeConfig.frequency_penalty ?? f.frequency_penalty,
            presence_penalty: data.runtimeConfig.presence_penalty ?? f.presence_penalty,
            timeout_ms: data.runtimeConfig.timeout_ms ?? f.timeout_ms,
            retry_count: data.runtimeConfig.retry_count ?? f.retry_count,
            streaming_enabled: data.runtimeConfig.streaming_enabled ?? f.streaming_enabled,
          }));
        }
      })
      .catch(console.error)
      .finally(() => setLoadingProvider(false));
  }, [editingProvider?.id]);

  const setField = <K extends keyof ProviderFormData>(key: K, value: ProviderFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleDisplayNameChange = (display_name: string) => {
    setForm((f) => {
      // Auto-generate slug from display_name if slug was auto-generated from old name
      const autoSlug = !f.slug || f.slug === slugify(f.display_name) ? slugify(display_name) : f.slug;
      return { ...f, display_name, slug: autoSlug };
    });
  };

  // Custom headers management
  const addHeader = () => {
    setForm((f) => ({
      ...f,
      custom_headers: [...f.custom_headers, { key: "", value: "" }],
    }));
  };
  const updateHeader = (index: number, field: "key" | "value", value: string) => {
    setForm((f) => ({
      ...f,
      custom_headers: f.custom_headers.map((h, i) => (i === index ? { ...h, [field]: value } : h)),
    }));
  };
  const removeHeader = (index: number) => {
    setForm((f) => ({
      ...f,
      custom_headers: f.custom_headers.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!form.display_name.trim()) { toast.error("Tên hiển thị là bắt buộc"); return; }
    if (!form.base_url.trim()) { toast.error("Base URL là bắt buộc"); return; }
    if (!form.model_name.trim()) { toast.error("Default model là bắt buộc"); return; }

    setSaving(true);
    try {
      const customHeadersObj: Record<string, string> = {};
      for (const h of form.custom_headers) {
        if (h.key.trim()) customHeadersObj[h.key.trim()] = h.value;
      }

      const providerPayload = {
        // name field maps to DB display_name column (updateProvider handles the mapping)
        name: form.display_name.trim(),
        slug: form.slug.trim() || slugify(form.display_name.trim()),
        group_slug: form.group_slug,
        base_url: form.base_url.trim(),
        api_key: form.api_key || undefined,
        status: form.status,
        is_default: form.is_default,
        custom_headers: customHeadersObj,
        // Do NOT include type/provider — internal key is set at creation
      };

      const runtimePayload = {
        selected_model: form.model_name.trim(),
        temperature: form.temperature,
        max_output_tokens: form.max_output_tokens,
        top_p: form.top_p,
        frequency_penalty: form.frequency_penalty,
        presence_penalty: form.presence_penalty,
        timeout_ms: form.timeout_ms,
        retry_count: form.retry_count,
        streaming_enabled: form.streaming_enabled,
      };

      let res: Response;
      let savedId = 0;

      if (mode === "edit" && editingProvider) {
        // PUT provider base + runtime config
        res = await fetch(`/api/ai/providers/${editingProvider.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: providerPayload,
            runtimeConfig: runtimePayload,
          }),
        });
        savedId = editingProvider.id;
      } else {
        // POST create — inline runtime fields
        const postBody = {
          ...providerPayload,
          model_name: form.model_name.trim(),
          streaming_enabled: form.streaming_enabled,
          timeout_ms: form.timeout_ms,
          retry_count: form.retry_count,
          temperature: form.temperature,
          max_output_tokens: form.max_output_tokens,
          top_p: form.top_p,
          frequency_penalty: form.frequency_penalty,
          presence_penalty: form.presence_penalty,
        };
        res = await fetch("/api/ai/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postBody),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Lỗi khi lưu provider");
        setSaving(false);
        return;
      }

      if (mode === "create") {
        savedId = data.data?.id ?? 0;
      }

      toast.success(
        mode === "edit"
          ? `Đã cập nhật provider "${form.display_name}"`
          : `Đã tạo provider "${form.display_name}"`
      );
      onOpenChange(false);
      onSaved({ id: savedId, name: form.display_name });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi lưu provider");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "edit" ? (
              <Pencil className="size-5 text-primary" />
            ) : (
              <PlusCircle className="size-5 text-primary" />
            )}
            {mode === "edit"
              ? `Sửa Provider: ${editingProvider?.display_name || editingProvider?.name || ""}`
              : "Thêm Provider mới"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Cập nhật cấu hình provider. Để trống API Key để giữ key cũ."
              : "Tạo provider AI tương thích OpenAI API hoặc provider nội bộ."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Row 1: Nhóm + Base URL */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="group">Nhóm</Label>
              <Select
                value={form.group_slug}
                onValueChange={(v) => setField("group_slug", v as ProviderGroupSlug)}
              >
                <SelectTrigger id="group">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cloud_api">Cloud APIs</SelectItem>
                  <SelectItem value="ai_aggregator">AI Aggregators</SelectItem>
                  <SelectItem value="local_llm">Local LLMs</SelectItem>
                  <SelectItem value="inference_platform">Inference Platforms</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="base_url">Base URL</Label>
              <Input
                id="base_url"
                value={form.base_url}
                onChange={(e) => setField("base_url", e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="font-mono text-xs"
              />
            </div>
          </div>

          {/* Row 2: Tên hiển thị + Slug */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Tên hiển thị</Label>
              <Input
                id="display_name"
                value={form.display_name}
                onChange={(e) => handleDisplayNameChange(e.target.value)}
                placeholder="VD: 9Router, Groq của tôi, Ollama Local..."
              />
              <p className="text-[9px] text-muted-foreground">
                Tên này dùng để hiển thị trong giao diện.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setField("slug", e.target.value)}
                placeholder="openrouter, groq, my_ollama..."
                className="font-mono text-xs"
              />
              <p className="text-[9px] text-muted-foreground">Dùng cho routing. Viết thường, không dấu.</p>
            </div>
          </div>

          {/* Row 3: Default Model */}
          <div className="space-y-2">
            <Label htmlFor="model">Default Model</Label>
            <Input
              id="model"
              value={form.model_name}
              onChange={(e) => setField("model_name", e.target.value)}
              placeholder="gpt-4o-mini, llama3.2, claude-3.5-sonnet..."
              className="font-mono text-xs"
            />
            <p className="text-[9px] text-muted-foreground">
              OpenRouter: dùng prefix <code className="bg-muted px-1 rounded">openrouter/</code>
            </p>
          </div>

          {/* Row 4: API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="api_key">API Key</Label>
              {mode === "edit" && (
                <Badge variant="outline" className="text-[9px]">
                  <AlertTriangle className="size-2.5 mr-0.5" />
                  Để trống = giữ key cũ
                </Badge>
              )}
            </div>
            <Input
              id="api_key"
              type="password"
              value={form.api_key}
              onChange={(e) => setField("api_key", e.target.value)}
              placeholder={mode === "edit" ? "•••••••••• (không đổi)" : "sk-..."}
              className="font-mono text-xs"
            />
            <p className="text-[9px] text-muted-foreground">
              Mã hóa AES-256-GCM trước khi lưu. Không chia sẻ key với bất kỳ ai.
            </p>
          </div>

          <Separator />

          {/* Section: Toggles */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3 flex-1 min-w-[150px]">
              <div>
                <Label htmlFor="status" className="text-xs">Kích hoạt</Label>
                <p className="text-[9px] text-muted-foreground">Hiện trong Routing</p>
              </div>
              <Switch
                id="status"
                checked={form.status === "active"}
                onCheckedChange={(v) => setField("status", v ? "active" : "inactive")}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3 flex-1 min-w-[150px]">
              <div>
                <Label htmlFor="default" className="text-xs">Mặc định</Label>
                <p className="text-[9px] text-muted-foreground">Dùng khi không chỉ định</p>
              </div>
              <Switch
                id="default"
                checked={form.is_default}
                onCheckedChange={(v) => setField("is_default", v)}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3 flex-1 min-w-[150px]">
              <div>
                <Label htmlFor="streaming" className="text-xs">Streaming</Label>
                <p className="text-[9px] text-muted-foreground">Bật streaming</p>
              </div>
              <Switch
                id="streaming"
                checked={form.streaming_enabled}
                onCheckedChange={(v) => setField("streaming_enabled", v)}
              />
            </div>
          </div>

          <Separator />

          {/* Section: Cấu hình nâng cao */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm">Cấu hình nâng cao</Label>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px]">Timeout (ms)</Label>
                <Input
                  type="number"
                  value={form.timeout_ms}
                  onChange={(e) => setField("timeout_ms", parseInt(e.target.value) || 60000)}
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Retry</Label>
                <Input
                  type="number"
                  value={form.retry_count}
                  onChange={(e) => setField("retry_count", parseInt(e.target.value) || 3)}
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Max Tokens</Label>
                <Input
                  type="number"
                  value={form.max_output_tokens}
                  onChange={(e) => setField("max_output_tokens", parseInt(e.target.value) || 2048)}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-3">
              <div className="space-y-1">
                <Label className="text-[10px]">Temperature</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.temperature}
                  onChange={(e) => setField("temperature", parseFloat(e.target.value) || 0.7)}
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Top P</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.top_p}
                  onChange={(e) => setField("top_p", parseFloat(e.target.value) || 1)}
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Frequency Penalty</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.frequency_penalty}
                  onChange={(e) => setField("frequency_penalty", parseFloat(e.target.value) || 0)}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-3">
              <div className="space-y-1">
                <Label className="text-[10px]">Presence Penalty</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.presence_penalty}
                  onChange={(e) => setField("presence_penalty", parseFloat(e.target.value) || 0)}
                  className="text-xs h-8"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Section: Custom Headers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Custom Headers</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addHeader} className="h-7 text-xs gap-1">
                <Plus className="size-3" /> Thêm header
              </Button>
            </div>
            {form.custom_headers.length === 0 ? (
              <p className="text-[9px] text-muted-foreground">
                VD: HTTP-Referer, X-Title cho OpenRouter. Để trống nếu không cần.
              </p>
            ) : (
              <div className="space-y-2">
                {form.custom_headers.map((h, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={h.key}
                      onChange={(e) => updateHeader(i, "key", e.target.value)}
                      placeholder="Header-Name"
                      className="font-mono text-xs h-8 flex-1"
                    />
                    <Input
                      value={h.value}
                      onChange={(e) => updateHeader(i, "value", e.target.value)}
                      placeholder="header-value"
                      className="font-mono text-xs h-8 flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeHeader(i)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saving || loadingProvider}>
            {saving ? "Đang lưu..." : mode === "edit" ? "Cập nhật" : "Tạo Provider"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
