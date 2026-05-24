"use client";

/**
 * AI Operating Center v2
 * Full-width 3-column layout: Left Sidebar (280px) | Main | Right Inspector (320px)
 */

import { useState, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAIStore } from "@/store/ai-settings-store";
import {
  Settings2,
  Cpu,
  Route,
  Palette,
  FileText,
  ShieldCheck,
  BarChart3,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Wifi,
  Menu,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";

// ProviderCard type from types/ai-operating
import { APIConfigPanel } from "@/components/ai/APIConfigPanel";
import { TaskRoutingTable } from "@/components/ai/TaskRouting";
import { BrandVoiceEditor } from "@/components/ai/BrandVoiceEditor";
import { ContentTemplatesEditor } from "@/components/ai/ContentTemplatesEditor";
import { UsageAnalytics } from "@/components/ai/UsageAnalytics";
import { RuntimeInspector } from "@/components/ai/RuntimeInspector";
import { SaveStatusBadge } from "@/components/ai/save/SaveStatusBadge";
import { SaveButton } from "@/components/ai/save/SaveButton";
import { UnsavedChangesGuard } from "@/components/ai/save/UnsavedChangesGuard";
import { ProviderFormDialog } from "@/components/ai/ProviderFormDialog";
import { useHydrateAISettings, useAISettingsSync } from "@/libs/hooks/use-ai-settings";
import { queryClient } from "@/libs/query-client";

import type {
  ProviderCard,
  ProviderType,
  ProviderHealth,
  ProviderModel,
  AIRuntimeConfig,
  RoutingRule,
  TaskRoute,
  BrandVoice,
  BrandPreset,
  SafetyRule,
  LocalRuntime,
  ModelFamily,
  SystemPromptTemplate,
} from "@/types/ai-operating";
import { DEFAULT_VI_SYSTEM_PROMPT, PROVIDER_GROUP_MAP } from "@/types/ai-operating";

// ── Provider Groups (from DB, no hardcode) ──────────────────────────────────────────

// Groups are loaded from DB via GET /api/ai/providers

// ── Sidebar Connection Card (clean, minimal) ──────────────────────────────────────
function SidebarConnectionCard({
  provider,
  modelName,
  isSelected,
  isTesting,
  health,
  onSelect,
  onEdit,
  onTest,
  onDelete,
  isActionLoading,
}: {
  provider: ProviderCard;
  modelName?: string;
  isSelected: boolean;
  isTesting: boolean;
  health?: ProviderHealth;
  onSelect: () => void;
  onEdit: () => void;
  onTest: () => void;
  onDelete: () => void;
  isActionLoading: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = provider.status === "active" || provider.is_active;

  return (
    <div
      className="rounded-xl border-2 transition-all cursor-pointer group relative"
      style={{
        borderColor: isSelected ? "var(--primary)" : isActive ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border))",
        background: isSelected ? "hsl(var(--primary) / 0.05)" : "hsl(var(--card))",
      }}
      onClick={onSelect}
    >
      <div className="p-3">
        <div className="flex items-start justify-between mb-1.5 gap-1">
          <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold block truncate">
              {provider.display_name || provider.name || provider.slug}
            </span>
            {modelName && (
              <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                {modelName}
              </p>
            )}
          </div>

          {/* Status dot */}
          <div className="flex items-center gap-1 shrink-0">
            {health?.status === "connected" && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[9px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {health.latency_ms}ms
              </span>
            )}
            {health?.status === "error" && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[9px] font-medium">
                Lỗi
              </span>
            )}
            {(!health || health?.status === "unknown") && !isTesting && (
              <span className="text-[9px] text-muted-foreground/50">Chưa test</span>
            )}
          </div>
        </div>

        {/* Status + Test */}
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-medium ${
            health?.status === "connected" ? "text-green-600 dark:text-green-400"
            : health?.status === "error" ? "text-red-600 dark:text-red-400"
            : isTesting ? "text-blue-600 dark:text-blue-400"
            : "text-muted-foreground"
          }`}>
            {health?.status === "connected" ? `Connected · ${health.latency_ms}ms`
             : health?.status === "error" ? "Lỗi"
             : isTesting ? "Testing..."
             : "Chưa kết nối"}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onTest(); }}
              disabled={isTesting}
            >
              {isTesting ? (
                <><Loader2 className="size-2.5 animate-spin" /></>
              ) : (
                <Wifi className="size-2.5 text-muted-foreground/50" />
              )}
            </Button>

            {/* Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                disabled={isActionLoading}
              >
                {isActionLoading ? <Loader2 className="size-3 animate-spin" /> : <MoreHorizontal className="size-3" />}
              </Button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-[140px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
                    onClick={() => { onEdit(); setMenuOpen(false); }}
                  >
                    <Pencil className="size-3" /> Sửa
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-red-50 dark:hover:bg-red-950 transition-colors text-left text-red-600"
                    onClick={() => { onDelete(); setMenuOpen(false); }}
                  >
                    <Trash2 className="size-3" /> Xóa
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AISettingsPage() {
  // ── Hydrate from database on mount ────────────────────────────────────────
  useHydrateAISettings();
  // ── Sync store after React Query refetch (e.g. after provider creation) ──
  useAISettingsSync();

  // ── State từ Zustand Store ────────────────────────────────────────────────
  const {
    providers,
    activeProvider,
    runtimeConfigs,
    selectedProviderId,
    taskRoutes,
    brandVoices,
    promptRules,
    safetyRules,
    systemPrompts,
    isHydrated,
    activeTab,
    setActiveTab,
    setSelectedProviderId,
  } = useAIStore();

  // ── Local UI state (not persisted) ───────────────────────────────────────
  // testingProviders keyed by provider slug (matches runtimeConfigs keys)
  const [providerHealths, setProviderHealths] = useState<Record<string, ProviderHealth>>({});
  const [testingProviders, setTestingProviders] = useState<Set<string>>(new Set());
  const [availableModels, setAvailableModels] = useState<ProviderModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency_ms?: number } | null>(null);
  const [activeBrandPreset, setActiveBrandPreset] = useState<BrandPreset | null>(null);
  const [activatingBV, setActivatingBV] = useState(false);
  const [savingBV, setSavingBV] = useState(false);
  const [deletingBV, setDeletingBV] = useState(false);
  const [lastTokens, setLastTokens] = useState<number | null>(null);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [totalRequestCount, setTotalRequestCount] = useState(0);
  const [totalEstimatedCost, setTotalEstimatedCost] = useState(0);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);

  const { setRuntimeConfig, updateProvider, setActiveBrandVoice, setTaskRoutes, markDirty, setProviderConnectionStatus, addProvider, removeProvider } = useAIStore();
  const [addProviderOpen, setAddProviderOpen] = useState(false);
  const [editProviderOpen, setEditProviderOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderCard | null>(null);
  const [deleteConfirmProvider, setDeleteConfirmProvider] = useState<ProviderCard | null>(null);
  const [providerActionsLoading, setProviderActionsLoading] = useState<number | null>(null);

  // Config cho provider hiện tại (từ per-provider configs)
  // selectedProviderId là provider id từ DB, runtimeConfigs được key bằng id
  const runtimeConfig = runtimeConfigs[selectedProviderId] || {};
  // Lookup provider record để lấy type/slug cho APIConfigPanel, TestPlayground, RuntimeInspector
  const selectedProvider = providers.find((p) => String(p.id) === selectedProviderId);
  const providerType = selectedProvider?.type || selectedProvider?.slug || selectedProviderId;

  // handleSetSelectedProvider: cập nhật selectedProviderId = provider id từ DB
  // (setSelectedProviderId from store is used directly in JSX)
  const handleSetSelectedProvider = useCallback((id: string) => {
    setSelectedProviderId(id);
  }, [setSelectedProviderId]);

  // handleRoutesChange: sync task routes sau khi edit/save trong TaskRoutingTable
  const handleRoutesChange = useCallback((updated: TaskRoute[]) => {
    const DEV = process.env.NODE_ENV === "development";
    if (DEV) {
      console.log("[Settings] handleRoutesChange called with", updated.length, "routes");
      updated.forEach(r => {
        const anyR = r as any;
        console.log(`  - ${r.task_type}: provider_id=${anyR.primary_provider_id ?? anyR.primary_provider_id ?? "null"}`);
      });
    }
    setTaskRoutes(updated);
    markDirty("taskRoutes");
  }, [setTaskRoutes, markDirty]);

  // ── Global rules & platform rules from store ──────────────────────────────
  const globalRules = promptRules?.global_rules ?? [];
  // platformRules không còn cần trong page — ContentTemplatesEditor tự xử lý

  // ── Load models when provider changes ───────────────────────────────────────
  // selectedProviderId is now the provider slug from DB (e.g. "groq_deepseek", "9router")
  // We need to find the actual provider record to get its type/base_url for model discovery

  useEffect(() => {
    if (!selectedProviderId) {
      setAvailableModels([]);
      setLoadingModels(false);
      return;
    }

    setLoadingModels(true);
    setAvailableModels([]);

    // Find the provider record from store to get type and base_url
    const providerRecord = providers.find(
      (p) => (p.slug || p.type) === selectedProviderId
    );
    const providerType = providerRecord?.type || selectedProviderId;
    const baseUrl = providerRecord?.base_url || undefined;

    fetch("/api/ai/models/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_type: providerType, base_url: baseUrl }),
    })
      .then((r) => r.json())
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAvailableModels(
            data.map((m: { id: string; name: string; context_window?: number }) => ({
              id: m.id, name: m.name, context_window: m.context_window,
            }))
          );
        }
      })
      .finally(() => setLoadingModels(false));
  }, [selectedProviderId, providers]);

  // ── Provider CRUD actions ─────────────────────────────────────────────────

  const handleSetDefault = async (providerId: number) => {
    setProviderActionsLoading(providerId);
    try {
      const res = await fetch(`/api/ai/providers/${providerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_default" }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Lỗi khi đặt mặc định"); return; }
      toast.success("Đã đặt làm provider mặc định!");
      await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
    } catch { toast.error("Lỗi kết nối"); }
    finally { setProviderActionsLoading(null); }
  };

  const handleToggleStatus = async (provider: ProviderCard) => {
    setProviderActionsLoading(provider.id);
    try {
      const action = provider.is_active ? "deactivate" : "activate";
      const res = await fetch(`/api/ai/providers/${provider.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Lỗi khi đổi trạng thái"); return; }
      toast.success(data.message || `Provider đã ${action === "activate" ? "bật" : "tắt"}!`);
      await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
    } catch { toast.error("Lỗi kết nối"); }
    finally { setProviderActionsLoading(null); }
  };

  const handleDeleteProvider = async () => {
    if (!deleteConfirmProvider) return;
    setProviderActionsLoading(deleteConfirmProvider.id);
    try {
      const res = await fetch(`/api/ai/providers/${deleteConfirmProvider.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Lỗi khi xóa provider"); return; }
      if (data.alreadyDeleted) {
        toast.info(`Provider "${deleteConfirmProvider.name}" đã được xóa trước đó.`);
      } else if (data.warning) {
        toast.warning(data.warning);
      } else {
        toast.success(`Đã xóa provider "${deleteConfirmProvider.name}"!`);
      }
      // Invalidate query → useAISettingsSync sẽ cập nhật store từ server
      await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
      // Nếu provider đang chọn bị xóa → chọn provider đầu tiên còn lại
      if (selectedProviderId === String(deleteConfirmProvider.id)) {
        // Đợi store update rồi mới set
        setTimeout(() => {
          const state = useAIStore.getState();
          const remaining = state.providers.filter((p) => p.id !== deleteConfirmProvider.id);
          if (remaining.length > 0) {
            setSelectedProviderId(String(remaining[0].id));
          } else {
            setSelectedProviderId("");
          }
        }, 100);
      }
      setDeleteConfirmProvider(null);
    } catch { toast.error("Lỗi kết nối"); }
    finally { setProviderActionsLoading(null); }
  };

  const handleEditProvider = (provider: ProviderCard) => {
    setEditingProvider(provider);
    setEditProviderOpen(true);
  };

  // ── Test provider ──────────────────────────────────────────────────────

  const handleTestProvider = async (provider: ProviderCard) => {
    console.log(`[TestProvider] Starting test for: ${provider.type} (id: ${provider.id})`);
    // Use id as key for consistent state management (matches runtimeConfigs)
    const key = String(provider.id);
    const slug = provider.slug || provider.type;
    setTestingProviders((prev) => new Set(prev).add(key));
    try {
      const cfg = provider
        ? {
            base_url: provider.base_url || undefined,
            model_name: runtimeConfigs[key]?.model_name || provider.model_name || undefined,
          }
        : {};
      const res = await fetch("/api/ai/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_id: provider.id,
          provider: slug,
          base_url: cfg.base_url,
          model_name: cfg.model_name,
        }),
      });
      const data = await res.json();
      console.log(`[TestProvider] Result for ${slug}:`, data);
      const health: ProviderHealth = {
        status: data.success ? "connected" : "error",
        latency_ms: data.duration_ms ?? null,
        error: data.success ? undefined : data.message,
      };
      setProviderHealths((prev) => ({ ...prev, [key]: health }));
      setProviderConnectionStatus(provider.id, data.success ? "connected" : "error", data.duration_ms, data.message);
      setTestResult(data);
      toast[data.success ? "success" : "error"](data.message);
    } catch (err) {
      console.error(`[TestProvider] Error for ${slug}:`, err);
      toast.error("Lỗi kết nối. Kiểm tra console.");
    } finally {
      setTestingProviders((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // ── Brand Voice handlers ────────────────────────────────────────────────

  const handleActivateBrandVoice = useCallback(async (preset: BrandPreset) => {
    setActivatingBV(true);
    try {
      const res = await fetch("/api/ai/brand-voices/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset }),
      });
      if (res.ok) {
        setActiveBrandPreset(preset);
        setActiveBrandVoice(preset);
        toast.success("Đã kích hoạt brand voice!");
      }
    } catch (err) {
      toast.error("Kích hoạt brand voice thất bại");
    } finally {
      setActivatingBV(false);
    }
  }, [setActiveBrandVoice]);

  const handleSaveBrandVoice = useCallback(async (preset: BrandPreset, data: Partial<BrandVoice>) => {
    setSavingBV(true);
    try {
      const res = await fetch("/api/ai/brand-voices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset, ...data }),
      });
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
        toast.success("Đã lưu brand voice!");
      }
    } finally {
      setSavingBV(false);
    }
  }, []);

  const handleDeleteBrandVoice = useCallback(async (preset: BrandPreset) => {
    setDeletingBV(true);
    try {
      const res = await fetch(`/api/ai/brand-voices?preset=${encodeURIComponent(preset)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
        toast.success("Đã xoá brand voice!");
      }
    } finally {
      setDeletingBV(false);
    }
  }, []);

  // ── Prompt/Safety rules: đã chuyển vào ContentTemplatesEditor
  // Các handlers dưới đây không còn cần trong page — giữ lại comment để reference

  // ── Config change ────────────────────────────────────────────────────

  const handleConfigChange = (field: string, value: string | number | boolean) => {
    setRuntimeConfig({ [field]: value });
  };

  // ── Request tracking for inspector ─────────────────────────────────────

  const handleRequestComplete = useCallback((tokens: number, latency_ms: number) => {
    setLastTokens(tokens);
    setLastLatency(latency_ms);
    setTotalRequestCount((c) => c + 1);
    const cost = tokens * 0.001;
    setTotalEstimatedCost((c) => c + cost);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────

  const isDirty = useAIStore((s) => s.isDirty);
  const selectedModel = availableModels.find((m) => m.id === runtimeConfig.model_name);

  // ── Render ────────────────────────────────────────────────────────────

  if (!isHydrated) {
    return (
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <aside className="w-70 border-r bg-card shrink-0 p-4">
          <Skeleton className="h-6 w-32 mb-4" />
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 mb-2 rounded-xl" />)}
        </aside>
        <main className="flex-1 p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ══ LEFT SIDEBAR ══════════════════════════════════════════════════ */}
        <aside
          className={`border-r bg-card flex flex-col overflow-hidden transition-all duration-300 shrink-0 ${
            sidebarOpen ? "w-70" : "w-12"
          }`}
        >
          {/* Toggle */}
          <div className={`px-3 py-3 border-b flex items-center ${sidebarOpen ? "justify-between" : "justify-center"}`}>
            {sidebarOpen && (
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Settings2 className="size-4 text-primary" />
                AI Connections
              </h2>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => setSidebarOpen((v) => !v)}
            >
              <Menu className="size-3.5" />
            </Button>
          </div>

          {sidebarOpen ? (
            <ScrollArea className="flex-1 p-3">
              {/* Provider list — no group headers, clean card layout */}
              <div className="space-y-2">
                {providers.map((record) => {
                  const key = record.id.toString();
                  const isSelected = selectedProviderId === key;
                  const isTesting = testingProviders.has(key);
                  const modelName = (record as any).model_name ?? runtimeConfigs[key]?.model_name ?? undefined;

                  return (
                    <SidebarConnectionCard
                      key={key}
                      provider={record}
                      modelName={modelName}
                      isSelected={isSelected}
                      isTesting={isTesting}
                      health={providerHealths[key]}
                      onSelect={() => setSelectedProviderId(key)}
                      onEdit={() => {
                        if (record.id !== -1) handleEditProvider(record);
                        else toast.info("Provider này chưa được khởi tạo trong DB.");
                      }}
                      onTest={() => handleTestProvider(record)}
                      onDelete={() => record.id !== -1 && setDeleteConfirmProvider(record)}
                      isActionLoading={providerActionsLoading === record.id}
                    />
                  );
                })}
              </div>

              {/* Empty state */}
              {providers.length === 0 && (
                <div className="px-2 py-8 text-center">
                  <p className="text-[11px] text-muted-foreground mb-1">Chưa có AI Connection nào.</p>
                  <p className="text-[10px] text-muted-foreground/60">Nhấn "Thêm Connection" để bắt đầu.</p>
                </div>
              )}

              {/* Thêm Connection button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 gap-1.5 text-xs border-dashed"
                onClick={() => setAddProviderOpen(true)}
              >
                <Plus className="size-3" />
                Thêm Connection
              </Button>
            </ScrollArea>
          ) : null}

          {/* Bottom info */}
          {sidebarOpen && providers.length > 0 && (
            <div className="p-3 border-t bg-muted/20">
              <p className="text-[10px] text-muted-foreground truncate">
                {providers.length} connection{providers.length !== 1 ? "s" : ""} · Tap để cấu hình
              </p>
            </div>
          )}
        </aside>

      {/* ══ MAIN CONTENT ═══════════════════════════════════════════════════ */}
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {/* Header */}
        <header className="border-b bg-card px-6 py-3 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold flex items-center gap-2">
                <Cpu className="size-5 text-primary" />
                AI Content Studio
                <SaveStatusBadge />
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quản lý AI Engine, phong cách nội dung và cấu hình generation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <SaveButton />
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setInspectorOpen((v) => !v)}
                title="Toggle Runtime Inspector"
              >
                {inspectorOpen ? (
                  <PanelRightClose className="size-4" />
                ) : (
                  <PanelRightOpen className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="border-b bg-card px-6 py-2 shrink-0 overflow-x-auto">
          <div className="flex gap-0.5 py-1 min-w-max">
              {[
                { id: "routing", label: "AI Routing", icon: Route },
                { id: "brand", label: "Brand Voice", icon: Palette },
                { id: "templates", label: "Content Templates", icon: Sparkles },
                { id: "analytics", label: "Analytics", icon: BarChart3 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <tab.icon className="size-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

        {/* Tab Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            {/* ROUTING */}
            {activeTab === "routing" && (
              <TaskRoutingTable
                routes={taskRoutes}
                onRoutesChange={handleRoutesChange}
                systemPrompts={systemPrompts}
                activeProviders={providers}
                brandVoices={brandVoices}
              />
            )}

            {/* BRAND VOICE */}
            {activeTab === "brand" && (
              <BrandVoiceEditor
                voices={brandVoices}
                activePreset={activeBrandPreset}
                onActivate={handleActivateBrandVoice}
                onSave={handleSaveBrandVoice}
                onDelete={handleDeleteBrandVoice}
                activating={activatingBV}
                saving={savingBV}
                deleting={deletingBV}
              />
            )}

            {/* CONTENT TEMPLATES: System Prompts + Prompt Rules + Safety Rules */}
            {activeTab === "templates" && (
              <ContentTemplatesEditor
                systemPrompts={systemPrompts}
                promptRules={globalRules}
                safetyRules={safetyRules}
              />
            )}

            {/* ANALYTICS */}
            {activeTab === "analytics" && <UsageAnalytics />}
          </div>
        </ScrollArea>
      </main>

      {/* ══ RIGHT INSPECTOR ═══════════════════════════════════════════════ */}
      {inspectorOpen && (
        <RuntimeInspector
          providerName={selectedProvider?.name || null}
          providerType={providerType}
          model={runtimeConfig.model_name || "—"}
          modelFamily={(runtimeConfig.model_family || null) as ModelFamily | null}
          localRuntime={(runtimeConfig.local_runtime || null) as LocalRuntime | null}
          latency_ms={lastLatency}
          tokens_used={lastTokens}
          context_window={selectedModel?.context_window ?? null}
          streaming={isStreaming}
          requestCount={totalRequestCount}
          estimatedCost={totalEstimatedCost}
        />
      )}
      <UnsavedChangesGuard />
      <ProviderFormDialog
        open={editProviderOpen}
        onOpenChange={(v) => { setEditProviderOpen(v); if (!v) setEditingProvider(null); }}
        onSaved={async ({ id: updatedProviderId, name: updatedName }) => {
          // Update React Query cache IMMEDIATELY so UI reflects the change without waiting for refetch
          queryClient.setQueryData<unknown>(["ai-settings-all"], (old: unknown) => {
            if (!old || typeof old !== "object") return old;
            const cached = old as Record<string, unknown>;
            const providers: unknown[] = Array.isArray(cached.providers) ? [...cached.providers] : [];
            const idx = (providers as { id?: number }[]).findIndex((p) => p.id === updatedProviderId);
            if (idx >= 0) {
              providers[idx] = { ...(providers[idx] as object), name: updatedName };
            }
            return { ...cached, providers };
          });
          // Update Zustand store immediately
          useAIStore.getState().updateProvider(updatedProviderId, { name: updatedName });
          // Background refetch to ensure server truth
          await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
          setSelectedProviderId(String(updatedProviderId));
        }}
        editingProvider={editingProvider}
      />
      <ProviderFormDialog
        open={addProviderOpen}
        onOpenChange={setAddProviderOpen}
        onSaved={async ({ id: createdProviderId }) => {
          await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
          setSelectedProviderId(String(createdProviderId));
        }}
      />
      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmProvider} onOpenChange={(v) => { if (!v) setDeleteConfirmProvider(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />
              Xóa Provider
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa provider "{deleteConfirmProvider?.name}"?
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmProvider(null)}>Hủy</Button>
            <Button variant="destructive" onClick={handleDeleteProvider}>
              {providerActionsLoading ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
