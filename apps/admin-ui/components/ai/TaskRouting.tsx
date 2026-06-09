"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Settings2,
  Loader2,
  Zap,
  AlertTriangle,
  Info,
  Sliders,
  AlignLeft,
  Volume2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  TaskRoute,
  RoutingRule,
  RoutingRuleInput,
  AITaskType,
  SystemPromptTemplate,
  BrandPreset,
  ProviderCard,
  BrandVoice,
} from "@/types/ai-operating";
import { useAIStore } from "@/store/ai-settings-store";

const DEV = process.env.NODE_ENV === "development";

// ─── Business-friendly labels ─────────────────────────────────────────────────

const TASK_LABELS: Record<AITaskType, string> = {
  facebook_content: "Bài viết Facebook",
  seo_article: "Bài viết SEO Website",
  video_script: "Kịch bản Video",
  image_prompt: "Prompt Hình ảnh",
  zalo_message: "Tin nhắn Zalo",
  product_description: "Mô tả sản phẩm",
  email_marketing: "Email Marketing",
  task_assistant: "AI Task Assistant",
};

const TASK_HINTS: Record<AITaskType, string> = {
  facebook_content: "Nội dung bài đăng Facebook",
  seo_article: "Bài viết tối ưu tìm kiếm",
  video_script: "Script quảng cáo / YouTube",
  image_prompt: "Mô tả cho AI tạo hình",
  zalo_message: "Tin nhắn quảng cáo Zalo",
  product_description: "Bài viết giới thiệu sản phẩm",
  email_marketing: "Email quảng cáo / newsletter",
  task_assistant: "AI Assistant trong Task",
};

/**
 * Brand preset labels — for UI display when brandVoices data is not available.
 * The Edit Dialog uses brandVoices prop for dynamic options.
 */
const BRAND_PRESET_LABELS: Record<BrandPreset, string> = {
  professional: "Chuyên nghiệp",
  gaming: "Gaming",
  student: "Sinh viên",
  business: "Doanh nhân",
  apple_premium: "Apple Premium",
  budget_friendly: "Giá rẻ dễ tiếp cận",
};

type ContentLength = (typeof CONTENT_LENGTH_OPTIONS)[number]["value"];

const CONTENT_LENGTH_LABEL: Record<ContentLength, string> = {
  short: "Ngắn",
  medium: "Vừa",
  long: "Dài",
  very_long: "Rất dài",
};

const CONTENT_LENGTH_OPTIONS = [
  { value: "short", label: "Ngắn", tokens: 500 },
  { value: "medium", label: "Vừa", tokens: 1500 },
  { value: "long", label: "Dài", tokens: 3000 },
  { value: "very_long", label: "Rất dài", tokens: 6000 },
] as const;

// ─── Business ↔ technical mapping ─────────────────────────────────────────────

function creativityToTemperature(creativity: number): number {
  // creativity 0–100 → temperature 0–2
  return Math.round(creativity * 2) / 100;
}

function temperatureToCreativity(temp: number | null): number {
  if (temp === null) return 50; // default midpoint
  return Math.min(100, Math.round((temp / 2) * 100));
}

function contentLengthToTokens(length: ContentLength): number {
  return CONTENT_LENGTH_OPTIONS.find((o) => o.value === length)?.tokens ?? 1500;
}

function tokensToContentLength(tokens: number | null): ContentLength {
  if (tokens === null || tokens === undefined) return "medium";
  const closest = CONTENT_LENGTH_OPTIONS.reduce((prev, curr) =>
    Math.abs(curr.tokens - tokens) < Math.abs(prev.tokens - tokens) ? curr : prev
  );
  return closest.value as ContentLength;
}

// ─── Provider helpers ────────────────────────────────────────────────────────

function getProviderName(provider: ProviderCard): string {
  return provider.display_name || provider.name || provider.slug || `Provider #${provider.id}`;
}

function getProviderModel(provider: ProviderCard): string {
  return provider.model_name || "";
}

/**
 * Resolve provider from routing data with full backward compat.
 */
function resolveProviderFromRouting(
  primaryProviderId: number | null,
  providerType: string | undefined,
  modelName: string | null | undefined,
  providers: ProviderCard[]
): ProviderCard | null {
  if (primaryProviderId !== null) {
    const byId = providers.find((p) => p.id === primaryProviderId);
    if (byId) return byId;
  }
  if (providerType) {
    const bySlug = providers.find(
      (p) => p.type === providerType || p.slug === providerType
    );
    if (bySlug) return bySlug;
    const lower = providerType.toLowerCase();
    const fuzzy = providers.find(
      (p) =>
        (p.name && p.name.toLowerCase().includes(lower)) ||
        (p.slug && p.slug.toLowerCase().includes(lower))
    );
    if (fuzzy) return fuzzy;
  }
  if (modelName) {
    const lower = modelName.toLowerCase();
    const byModel = providers.find(
      (p) =>
        p.type === lower ||
        p.slug === lower ||
        (p.name && p.name.toLowerCase().includes(lower))
    );
    if (byModel) return byModel;
  }
  return null;
}

/**
 * Build RoutingForm from a RoutingRule synchronously.
 * Called immediately when user opens the modal — no async delay.
 */
function buildFormFromRule(
  rule: RoutingRule,
  legacyType: string | undefined,
  providers: ProviderCard[]
): RoutingForm {
  const resolvedProvider = resolveProviderFromRouting(
    rule.primary_provider_id,
    legacyType,
    rule.primary_model_override,
    providers
  );
  // Prefer FK; fall back to resolved provider ID
  const resolvedId = rule.primary_provider_id ?? resolvedProvider?.id ?? null;
  const temp = rule.temperature_override ?? 0.7;
  const tokens = rule.max_tokens_override ?? 2048;

  const f = emptyForm(rule.task_type as AITaskType, rule.task_label);
  f.primary_provider_id = resolvedId;
  f.primary_model_override =
    rule.primary_model_override || resolvedProvider?.model_name || "";
  f.creativity = temperatureToCreativity(temp);
  f.content_length = tokensToContentLength(tokens);
  f.temperature_override = rule.temperature_override;
  f.max_tokens_override = rule.max_tokens_override;
  f.top_p_override = rule.top_p_override;
  f.priority = rule.priority;
  f.system_prompt_id = rule.system_prompt_id;
  f.brand_preset = rule.brand_preset;
  f.is_active = rule.is_active;
  return f;
}

// ─── Dialog form state ────────────────────────────────────────────────────────

interface RoutingForm {
  task_type: AITaskType;
  task_label: string;
  primary_provider_id: number | null;
  primary_model_override: string;
  // Business fields
  creativity: number;        // 0–100
  content_length: ContentLength;
  // Legacy/advanced fields (still saved to DB but hidden from most users)
  temperature_override: number | null;
  max_tokens_override: number | null;
  top_p_override: number | null;
  priority: number;
  system_prompt_id: number | null;
  brand_preset: BrandPreset | null;
  is_active: boolean;
}

function emptyForm(taskType: string, label: string): RoutingForm {
  return {
    task_type: taskType as AITaskType,
    task_label: label,
    primary_provider_id: null,
    primary_model_override: "",
    creativity: 50,
    content_length: "medium",
    temperature_override: null,
    max_tokens_override: null,
    top_p_override: null,
    priority: 10,
    system_prompt_id: null,
    brand_preset: null,
    is_active: true,
  };
}

function formToInput(form: RoutingForm): RoutingRuleInput {
  return {
    task_type: dbTaskType(form.task_type),
    task_label: form.task_label,
    primary_provider_id: form.primary_provider_id,
    primary_model_override: form.primary_model_override || null,
    fallback_provider_id: null,
    fallback_model_override: null,
    temperature_override: form.temperature_override,
    max_tokens_override: form.max_tokens_override,
    top_p_override: form.top_p_override,
    priority: form.priority,
    system_prompt_id: form.system_prompt_id ?? null,
    brand_preset: form.brand_preset ?? null,
    is_active: form.is_active,
    // NOTE: prompt_preset is a UI-only concept for quick template selection.
    // It is NOT saved to DB — instead, user configures System Prompt ID directly.
  };
}

/** Convert AITaskType to DB task_type format (matches actual DB values) */
function dbTaskType(taskType: AITaskType): AITaskType {
  const map: Record<AITaskType, AITaskType> = {
    facebook_content: "facebook_content",
    seo_article: "seo_article",
    video_script: "video_script",
    image_prompt: "image_prompt",
    zalo_message: "zalo_message",
    product_description: "product_description",
    email_marketing: "email_marketing",
    task_assistant: "task_assistant",
  };
  return map[taskType] ?? taskType;
}

// ─── Available task types not yet in routes ─────────────────────────────────────

// Preset task types for quick selection — user can also type custom ones
const PRESET_TASK_TYPES: { type: AITaskType; label: string; hint: string }[] = [
  { type: "facebook_content", label: "Bài viết Facebook", hint: "Nội dung bài đăng Facebook" },
  { type: "seo_article", label: "Bài viết SEO Website", hint: "Bài viết tối ưu tìm kiếm" },
  { type: "video_script", label: "Kịch bản Video", hint: "Script quảng cáo / YouTube" },
  { type: "image_prompt", label: "Prompt Hình ảnh", hint: "Mô tả cho AI tạo hình" },
  { type: "zalo_message", label: "Tin nhắn Zalo", hint: "Tin nhắn quảng cáo Zalo" },
  { type: "product_description", label: "Mô tả sản phẩm", hint: "Bài viết giới thiệu sản phẩm" },
  { type: "email_marketing", label: "Email Marketing", hint: "Email quảng cáo / newsletter" },
];

function getMissingPresetTypes(routes: TaskRoute[]): AITaskType[] {
  const existing = new Set(routes.map((r) => r.task_type));
  return PRESET_TASK_TYPES.map((p) => p.type).filter((t) => !existing.has(t));
}

// Slugify a string to safe task_type format
function slugifyTaskType(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s_]/g, "")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

// Title-case a string
function toLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Add Task Form Component ──────────────────────────────────────────────────

interface AddTaskFormProps {
  onAdd: (name: string, slug: string) => void;
  onCancel: () => void;
  existingTaskTypes: string[];
}

function AddTaskForm({ onAdd, onCancel, existingTaskTypes }: AddTaskFormProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<AITaskType | "custom">("custom");
  const [error, setError] = useState("");

  const slug = slugifyTaskType(inputValue);
  const isDuplicate = existingTaskTypes.includes(slug) && slug.length > 0;
  const missingPresets = PRESET_TASK_TYPES
    .filter((p) => !existingTaskTypes.includes(p.type))
    .map((p) => p.type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPreset !== "custom") {
      const preset = PRESET_TASK_TYPES.find((p) => p.type === selectedPreset);
      if (preset && !existingTaskTypes.includes(preset.type)) {
        onAdd(preset.label, preset.type);
      } else {
        setError("Task type này đã tồn tại.");
      }
      return;
    }
    if (!inputValue.trim()) {
      setError("Vui lòng nhập tên task.");
      return;
    }
    if (slug.length === 0) {
      setError("Tên task phải chứa ký tự hợp lệ.");
      return;
    }
    if (isDuplicate) {
      setError("Task type này đã tồn tại.");
      return;
    }
    onAdd(inputValue.trim(), slug);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      {/* Preset quick-add grid */}
      {missingPresets.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Chọn nhanh từ mẫu có sẵn
          </p>
          <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto">
            {missingPresets.map((type) => {
              const preset = PRESET_TASK_TYPES.find((p) => p.type === type)!;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(type);
                    setInputValue(preset.label);
                    setError("");
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all text-sm ${
                    selectedPreset === type
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:bg-muted/50 hover:border-primary/40"
                  }`}
                >
                  <div className={`size-7 rounded-md flex items-center justify-center shrink-0 text-xs font-bold ${
                    selectedPreset === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {preset.label[0]}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-medium truncate ${selectedPreset === type ? "text-primary" : ""}`}>
                      {preset.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{preset.hint}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => {
                setSelectedPreset("custom");
                setInputValue("");
                setError("");
              }}
              className={`text-xs transition-colors ${
                selectedPreset === "custom"
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              + Hoặc tạo task tùy ý
            </button>
          </div>
        </div>
      )}

      {/* Custom input */}
      <div>
        <label className="text-xs font-medium mb-1.5 block">
          Tên Task <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setSelectedPreset("custom");
            setError("");
          }}
          placeholder="VD: Bài viết TikTok, Quảng cáo Zalo OA..."
          className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
        />
        {slug.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1 font-mono">
            Slug: {slug}
            {isDuplicate && <span className="text-red-500 ml-1">(đã tồn tại)</span>}
          </p>
        )}
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onCancel}
        >
          Hủy
        </Button>
        <Button
          type="submit"
          size="sm"
          className="flex-1"
          disabled={
            !inputValue.trim() ||
            slug.length === 0 ||
            isDuplicate ||
            (selectedPreset !== "custom" && missingPresets.length === 0)
          }
        >
          <Plus className="size-3.5" />
          Thêm Task
        </Button>
      </div>
    </form>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface TaskRoutingTableProps {
  routes: TaskRoute[];
  onRoutesChange: (routes: TaskRoute[]) => void;
  systemPrompts?: SystemPromptTemplate[];
  activeProviders?: ProviderCard[];
  /** Brand voices loaded from Brand Voice tab — used for dynamic dropdown */
  brandVoices?: BrandVoice[];
}

export function TaskRoutingTable({
  routes = [],
  onRoutesChange,
  systemPrompts = [],
  activeProviders = [],
  brandVoices = [],
}: TaskRoutingTableProps) {
  const [editing, setEditing] = useState<RoutingRule | null>(null);
  const [editingLegacyType, setEditingLegacyType] = useState<string | undefined>(undefined);
  const [form, setForm] = useState<RoutingForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingType, setAddingType] = useState<AITaskType | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Keep form in sync when providers list changes (e.g. new connection added)
  useEffect(() => {
    if (!form || !editing) return;
    const resolvedProvider = resolveProviderFromRouting(
      editing.primary_provider_id,
      editingLegacyType,
      editing.primary_model_override,
      activeProviders
    );
    const resolvedId = editing.primary_provider_id ?? resolvedProvider?.id ?? null;
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        primary_provider_id: resolvedId ?? prev.primary_provider_id,
      };
    });
  }, [activeProviders.length]);

  const setSaveStatus = useAIStore((s) => s.setSaveStatus);

  const handleSave = async () => {
    if (!form) return;
    if (!form.primary_provider_id) {
      toast.error("Vui lòng chọn AI Engine");
      return;
    }

    setSaving(true);
    try {
      const payload = formToInput(form);
      if (DEV) {
        console.log("[TaskRouting] handleSave → payload:", JSON.stringify(payload, null, 2));
      }

      const res = await fetch("/api/ai/task-routes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (DEV) {
        console.log("[TaskRouting] handleSave → res.status:", res.status);
      }

      if (res.ok) {
        const rawText = await res.text();
        if (DEV) {
          console.log("[TaskRouting] handleSave → raw response:", rawText);
        }
        let savedData: { data?: { rules?: RoutingRule[]; rule?: RoutingRule } };
        try {
          savedData = JSON.parse(rawText);
        } catch {
          savedData = {};
        }
        if (DEV) {
          console.log("[TaskRouting] handleSave → savedData:", savedData);
        }

        // Build the saved route directly from form data (re-fetch can miss primary_provider_id)
        const savedRoute: RoutingRule = {
          id: savedData?.data?.rule?.id ?? (editing as RoutingRule)?.id ?? 0,
          task_type: dbTaskType(form.task_type),
          task_label: form.task_label,
          primary_provider_id: form.primary_provider_id,
          primary_model_override: form.primary_model_override || null,
          fallback_provider_id: null,
          fallback_model_override: null,
          temperature_override: form.temperature_override,
          max_tokens_override: form.max_tokens_override,
          top_p_override: form.top_p_override,
          priority: form.priority,
          system_prompt_id: form.system_prompt_id,
          brand_preset: form.brand_preset,
          is_active: form.is_active,
          created_at: (editing as RoutingRule)?.created_at || "",
          updated_at: new Date().toISOString(),
        };

        if (DEV) {
          console.log("[TaskRouting] handleSave → savedRoute:", savedRoute);
          console.log("[TaskRouting] handleSave → current routes count:", routes.length);
        }

        // Update store directly with the saved route — no re-fetch needed
        const existingIndex = routes.findIndex(r => r.task_type === savedRoute.task_type);
        let updatedRoutes: RoutingRule[];
        if (existingIndex >= 0) {
          updatedRoutes = (routes.map((r, i) => i === existingIndex ? savedRoute : r) as RoutingRule[]);
        } else {
          updatedRoutes = ([...routes, savedRoute] as RoutingRule[]);
        }
        if (DEV) {
          console.log("[TaskRouting] handleSave → updatedRoutes count:", updatedRoutes.length);
          const updated = updatedRoutes.find(r => r.task_type === savedRoute.task_type);
          console.log("[TaskRouting] handleSave → updated route provider_id:", updated?.primary_provider_id);
        }
        onRoutesChange(updatedRoutes as unknown as TaskRoute[]);
        setSaveStatus("saved");
        toast.success("Đã lưu cấu hình AI cho task!");
        setEditing(null);
        setEditingLegacyType(undefined);
        setForm(null);
        setAddingType(null);
      } else {
        const err = await res.json();
        toast.error(err.error || "Lỗi khi lưu");
      }
    } catch (err) {
      if (DEV) console.error("[TaskRouting] save error:", err);
      toast.error("Lỗi khi lưu cấu hình");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (route: TaskRoute) => {
    try {
      const res = await fetch("/api/ai/task-routes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_type: route.task_type,
          is_active: !route.is_active,
          provider_type: route.provider_type,
          model_name: route.model_name || "",
        }),
      });
      if (res.ok) {
        // Update store directly with the toggled state — no re-fetch needed
        const updatedRoutes = routes.map((r) =>
          r.task_type === route.task_type
            ? { ...r, is_active: !route.is_active }
            : r
        );
        onRoutesChange(updatedRoutes as unknown as TaskRoute[]);
        setSaveStatus("saved");
        toast.success(route.is_active ? "Đã tắt task" : "Đã bật task");
      }
    } catch {
      toast.error("Lỗi khi cập nhật");
    }
  };

  const handleDeleteRoute = async (route: TaskRoute) => {
    try {
      const res = await fetch(`/api/ai/task-routes?task_type=${encodeURIComponent(route.task_type)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // Update local state via onRoutesChange (Zustand store pattern)
        onRoutesChange(routes.filter((r) => r.task_type !== route.task_type) as unknown as TaskRoute[]);
        setSaveStatus("saved");
        toast.success(`Đã xóa routing: ${TASK_LABELS[route.task_type as AITaskType] || route.task_type}`);
      } else {
        const err = await res.json();
        toast.error(err.error || "Lỗi khi xóa");
      }
    } catch {
      toast.error("Lỗi kết nối khi xóa");
    }
  };

  const handleAddRoute = async (taskType: AITaskType) => {
    setSaving(true);
    try {
      const payload: RoutingRuleInput = {
        task_type: dbTaskType(taskType),
        task_label: TASK_LABELS[taskType] || taskType,
        primary_provider_id: null,
        primary_model_override: null,
        fallback_provider_id: null,
        fallback_model_override: null,
        temperature_override: 0.7,
        max_tokens_override: 1500,
        top_p_override: null,
        priority: 10,
        system_prompt_id: null,
        brand_preset: null,
        is_active: true,
      };
      const res = await fetch("/api/ai/task-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const rawText = await res.text();
        let savedData: { data?: { rule?: RoutingRule; rules?: RoutingRule[] } };
        try { savedData = JSON.parse(rawText); } catch { savedData = {}; }

        // Construct saved route directly from payload (re-fetch may miss primary_provider_id)
        const savedRoute: RoutingRule = {
          id: savedData?.data?.rule?.id ?? 0,
          task_type: dbTaskType(taskType),
          task_label: TASK_LABELS[taskType] || taskType,
          primary_provider_id: null,
          primary_model_override: null,
          fallback_provider_id: null,
          fallback_model_override: null,
          temperature_override: 0.7,
          max_tokens_override: 1500,
          top_p_override: null,
          priority: 10,
          system_prompt_id: null,
          brand_preset: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const updatedRoutes = [...routes.filter(r => r.task_type !== savedRoute.task_type), savedRoute];
        onRoutesChange(updatedRoutes as unknown as TaskRoute[]);
        setSaveStatus("saved");
        toast.success(`Đã thêm routing: ${TASK_LABELS[taskType]}`);
      } else {
        const err = await res.json();
        toast.error(err.error || "Lỗi khi thêm");
      }
    } catch {
      toast.error("Lỗi kết nối khi thêm");
    } finally {
      setSaving(false);
    }
  };

  // ─── Table ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="size-4 text-primary" />
                AI cho từng loại nội dung
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Chọn AI Engine và phong cách mặc định cho mỗi loại nội dung.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loại nội dung</TableHead>
                  <TableHead>AI Engine</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Phong cách</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(routes as Array<TaskRoute | RoutingRule>).map((route) => {
                  const rule: RoutingRule | null =
                    "primary_provider_id" in route ? route : null;
                  const legacyType = (route as TaskRoute).provider_type;
                  const legacyModel = (route as TaskRoute).model_name;
                  const provider = resolveProviderFromRouting(
                    rule?.primary_provider_id ?? null,
                    legacyType,
                    legacyModel,
                    activeProviders
                  );

                  const modelName = rule?.primary_model_override
                    || provider?.model_name
                    || "";
                  const hasWarning = !provider;

                  return (
                    <TableRow
                      key={route.id ?? route.task_type}
                      className={!route.is_active ? "opacity-50" : ""}
                    >
                      {/* Content Type */}
                      <TableCell className="max-w-[160px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium truncate block">
                            {TASK_LABELS[route.task_type as AITaskType] || route.task_type}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {TASK_HINTS[route.task_type as AITaskType] || ""}
                          </span>
                        </div>
                      </TableCell>

                      {/* AI Engine */}
                      <TableCell>
                        {provider ? (
                          <Badge variant="outline" className="text-xs">
                            {getProviderName(provider)}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-400"
                          >
                            ⚠ Chưa gán
                          </Badge>
                        )}
                      </TableCell>

                      {/* Model */}
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground">
                          {modelName || "—"}
                        </span>
                      </TableCell>

                      {/* Phong cach */}
                      <TableCell>
                        {(() => {
                          const preset = rule?.brand_preset ?? (route as TaskRoute).brand_preset;
                          if (!preset) return <span className="text-xs text-muted-foreground">—</span>;
                          return (
                            <Badge variant="outline" className="text-xs">
                              {preset}
                            </Badge>
                          );
                        })()}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Switch
                          checked={route.is_active}
                          onCheckedChange={() => handleToggleActive(route as TaskRoute)}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => {
                            if (rule) {
                              setForm(buildFormFromRule(rule, legacyType, activeProviders));
                              setEditing(rule);
                              setEditingLegacyType(legacyType);
                            } else {
                              const legacyRule: RoutingRule = {
                                id: route.id,
                                task_type: route.task_type,
                                task_label: route.task_label,
                                primary_provider_id: null,
                                primary_model_override: (route as TaskRoute).model_name || null,
                                fallback_provider_id: null,
                                fallback_model_override: null,
                                temperature_override: (route as TaskRoute).temperature !== 0.7
                                  ? (route as TaskRoute).temperature
                                  : null,
                                max_tokens_override: (route as TaskRoute).max_tokens !== 2048
                                  ? (route as TaskRoute).max_tokens
                                  : null,
                                top_p_override: null,
                                priority: (route as TaskRoute).priority,
                                system_prompt_id: (route as TaskRoute).system_prompt_id ?? null,
                                brand_preset: (route as TaskRoute).brand_preset ?? null,
                                is_active: route.is_active,
                                created_at: route.created_at,
                                updated_at: route.updated_at,
                              };
                              setForm(buildFormFromRule(legacyRule, legacyType, activeProviders));
                              setEditing(legacyRule);
                              setEditingLegacyType(legacyType);
                            }
                          }}
                        >
                          <Settings2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Edit Dialog (business-friendly) ───────────────────────────────────── */}

      {/* ── Add Task Dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={addingType !== null}
        onOpenChange={(open) => {
          if (!open) setAddingType(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-4 text-primary" />
              Thêm Task mới
            </DialogTitle>
            <DialogDescription>
              Đặt tên cho task mới. Tên sẽ được tự động tạo slug duy nhất.
            </DialogDescription>
          </DialogHeader>

          <AddTaskForm
            onAdd={(name, slug) => {
              setForm(emptyForm(slug as AITaskType, name));
              setEditing({ id: 0, task_type: slug } as RoutingRule);
              setEditingLegacyType(undefined);
              setAddingType(null);
            }}
            onCancel={() => setAddingType(null)}
            existingTaskTypes={routes.map((r) => r.task_type)}
          />

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddingType(null)}>
              Hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ───────────────────────────────────────────────────── */}

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setEditingLegacyType(undefined);
            setForm(null);
            setShowAdvanced(false);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="size-4 text-primary" />
              AI cho từng loại nội dung:{" "}
              {editing && (TASK_LABELS[editing.task_type as AITaskType] || editing.task_type)}
            </DialogTitle>
            <DialogDescription>
              Chọn AI Engine và phong cách cho nội dung này.
            </DialogDescription>
          </DialogHeader>

          {form && (
            <div className="space-y-5 py-4">

              {/* ── Section 1: Task & Status ───────────────────────────────────── */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Info className="size-3.5 text-primary" />
                  Task
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Loại Task</Label>
                    <Input
                      className="h-9 text-xs bg-muted/50"
                      value={TASK_LABELS[form.task_type as AITaskType] || form.task_type}
                      disabled
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Kích hoạt</Label>
                    <div className="flex items-center h-9">
                      <Switch
                        checked={form.is_active}
                        onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* ── Section 2: AI Configuration ──────────────────────────────── */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Sliders className="size-3.5 text-primary" />
                  AI Engine
                </h4>

                {/* AI Engine selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    AI Engine <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.primary_provider_id ? String(form.primary_provider_id) : "__none__"}
                    onValueChange={(v) => {
                      const pid = v === "__none__" ? null : parseInt(v);
                      const selected = activeProviders.find((p) => p.id === pid);
                      setForm({
                        ...form,
                        primary_provider_id: pid,
                        primary_model_override: selected?.model_name || "",
                      });
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Chọn AI Engine..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeProviders.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {getProviderName(p)}{p.model_name ? ` · ${p.model_name}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* No provider warning */}
                {!form.primary_provider_id && (() => {
                  // Check if we even have providers available to select from
                  if (activeProviders.length === 0) {
                    return (
                      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-2">
                        <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Không có AI Engine nào được cấu hình. Vào AI Connections để thêm.
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-2">
                      <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Vui lòng chọn AI Engine để tiếp tục.
                      </p>
                    </div>
                  );
                })()}

                {/* Provider selected — show model */}
                {form.primary_provider_id && (() => {
                  const selected = activeProviders.find((p) => p.id === form.primary_provider_id);
                  if (!selected) return null;

                  return (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Model</Label>
                      <Input
                        className="h-9 text-xs font-mono"
                        placeholder="Để trống → dùng model mặc định"
                        value={form.primary_model_override}
                        onChange={(e) =>
                          setForm({ ...form, primary_model_override: e.target.value })
                        }
                      />
                      {selected.model_name && !form.primary_model_override && (
                        <p className="text-[10px] text-muted-foreground">
                          Mặc định: <span className="font-mono">{selected.model_name}</span>
                        </p>
                      )}
                      {!selected.model_name && (
                        <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-2">
                          <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            AI Engine này chưa có model mặc định. Nhập model name hoặc cấu hình trong AI Connections.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <Separator />

              {/* ── Section 3: Content Style ─────────────────────────────────── */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <AlignLeft className="size-3.5 text-primary" />
                  Phong cách nội dung
                </h4>

                {/* Creativity slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Sáng tạo</Label>
                    <span className="text-xs text-muted-foreground">
                      {form.creativity < 30 ? "Chính xác" :
                       form.creativity < 60 ? "Cân bằng" :
                       form.creativity < 80 ? "Sáng tạo" : "Rất sáng tạo"}
                    </span>
                  </div>
                  <Slider
                    value={[form.creativity]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={([v]) => setForm({ ...form, creativity: v })}
                    className="py-1"
                  />
                  <div className="flex justify-between text-[9px] text-muted-foreground px-0.5">
                    <span>Chính xác</span>
                    <span>Sáng tạo</span>
                  </div>
                </div>

                {/* Content Length */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Độ dài nội dung</Label>
                  <Select
                    value={form.content_length}
                    onValueChange={(v) =>
                      setForm({ ...form, content_length: v as ContentLength })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_LENGTH_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label} ({o.tokens.toLocaleString()} tokens)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* ── Section 4: Brand & Prompt ─────────────────────────────────── */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Volume2 className="size-3.5 text-primary" />
                  Brand &amp; Prompt
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  {/* Brand Voice — loaded from Brand Voice tab */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Brand Voice</Label>
                    <Select
                      value={form.brand_preset ?? "__none__"}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          brand_preset: v === "__none__" ? null : (v as BrandPreset),
                        })
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Mặc định" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Mặc định (global)</SelectItem>
                        {brandVoices.map((bv) => (
                          <SelectItem key={bv.preset} value={bv.preset as string}>
                            {bv.name || BRAND_PRESET_LABELS[bv.preset as BrandPreset] || bv.preset}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* System Prompt — loaded from System Prompt tab */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">System Prompt</Label>
                    <Select
                      value={form.system_prompt_id ? String(form.system_prompt_id) : "__none__"}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          system_prompt_id: v === "__none__" ? null : parseInt(v),
                        })
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Mặc định" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Mặc định (tiếng Việt)</SelectItem>
                        {systemPrompts.map((sp) => (
                          <SelectItem key={sp.id} value={String(sp.id)}>
                            {sp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Advanced Settings toggle */}
              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAdvanced ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  Cài đặt nâng cao
                </button>
                {showAdvanced && (
                  <div className="mt-3 space-y-3">
                    <p className="text-[10px] text-muted-foreground">
                      Dành cho admin kỹ thuật. Có thể ảnh hưởng đến chất lượng AI output.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Temperature</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="2"
                          value={form.temperature_override ?? 0.7}
                          onChange={(e) => setForm({ ...form, temperature_override: parseFloat(e.target.value) || 0.7 })}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Max Tokens</Label>
                        <Input
                          type="number"
                          value={form.max_tokens_override ?? 2048}
                          onChange={(e) => setForm({ ...form, max_tokens_override: parseInt(e.target.value) || 2048 })}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Top P</Label>
                        <Input
                          type="number"
                          step="0.05"
                          min="0"
                          max="1"
                          value={form.top_p_override ?? 1}
                          onChange={(e) => setForm({ ...form, top_p_override: parseFloat(e.target.value) || 1 })}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Priority</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={form.priority}
                          onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 10 })}
                          className="text-xs h-8"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(null);
                setEditingLegacyType(undefined);
                setForm(null);
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form?.primary_provider_id}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Đang lưu..." : "Lưu cấu hình"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
