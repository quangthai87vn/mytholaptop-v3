"use client";

/**
 * AI Engine Settings — Canonical route: /settings/ai
 * Moved from /content/settings (P8.1.2 canonicalization).
 * Simplified UX: clean tabs, compact provider selector, no fake metrics.
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
  Wifi,
  Route,
  Palette,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  WifiOff,
  Menu,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import { APIConfigPanel } from "@/components/ai/APIConfigPanel";
import { CurrentAIBanner } from "@/components/ai/CurrentAIBanner";
import { TaskRoutingTable } from "@/components/ai/TaskRouting";
import { BrandVoiceEditor } from "@/components/ai/BrandVoiceEditor";
import { ContentTemplatesEditor } from "@/components/ai/ContentTemplatesEditor";
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
  SystemPromptTemplate,
} from "@/types/ai-operating";

// ── Provider Groups (from DB, no hardcode) ──────────────────────────────────────────

// Groups are loaded from DB via GET /api/ai/providers

// ── Grouped Provider Selector ─────────────────────────────────────────────────────

const GROUP_LABELS: Record<string, string> = {
  cloud_api: "Cloud APIs",
  ai_aggregator: "AI Aggregators",
  local_llm: "Local LLMs",
  inference_platform: "Inference Platforms",
};

function getGroupLabel(groupSlug: string | undefined): string {
  if (!groupSlug) return "Custom";
  return GROUP_LABELS[groupSlug] ?? groupSlug;
}

function CompactProviderSelector({
  providers,
  selectedId,
  providerHealths,
  testingProviders,
  onSelect,
  onEdit,
  onTest,
  onDelete,
  onAdd,
  actionsLoading,
}: {
  providers: ProviderCard[];
  selectedId: string;
  providerHealths: Record<string, ProviderHealth>;
  testingProviders: Set<string>;
  onSelect: (id: string) => void;
  onEdit: (p: ProviderCard) => void;
  onTest: (p: ProviderCard) => void;
  onDelete: (p: ProviderCard) => void;
  onAdd: () => void;
  actionsLoading: number | null;
}) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Group providers by group_slug
  const groups = providers.reduce<Record<string, ProviderCard[]>>((acc, p) => {
    const group = p.group_slug || "custom";
    if (!acc[group]) acc[group] = [];
    acc[group].push(p);
    return acc;
  }, {});

  // Sort groups: cloud_api first, then others
  const groupOrder = ["cloud_api", "ai_aggregator", "local_llm", "inference_platform"];
  const sortedGroups = [
    ...groupOrder.filter((g) => groups[g]),
    ...Object.keys(groups).filter((g) => !groupOrder.includes(g)),
  ];

  return (
    <div className="space-y-4">
      {sortedGroups.map((groupSlug) => {
        const groupProviders = groups[groupSlug];
        return (
          <div key={groupSlug}>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">
              {getGroupLabel(groupSlug)}
            </div>
            <div className="space-y-0.5">
              {groupProviders.map((p) => {
                const key = String(p.id);
                const isSelected = selectedId === key;
                const isTesting = testingProviders.has(key);
                const health = providerHealths[key];
                const status = health?.status ?? "unknown";

                return (
                  <div key={key} className="relative">
                    <button
                      onClick={() => onSelect(key)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all text-[11px] ${
                        isSelected
                          ? "bg-primary/10 border border-primary/30 font-medium"
                          : "hover:bg-muted/50 border border-transparent"
                      }`}
                    >
                      <span className={`size-1.5 rounded-full shrink-0 ${
                        status === "connected" ? "bg-green-500" :
                        status === "error" ? "bg-red-500" : "bg-muted"
                      }`} />
                      <span className="flex-1 min-w-0 truncate">
                        {p.display_name || p.name || p.slug}
                      </span>
                      {p.is_system && (
                        <span className="text-[8px] bg-muted px-1 rounded text-muted-foreground shrink-0">
                          SYS
                        </span>
                      )}
                      {isTesting && <Loader2 className="size-2.5 animate-spin text-muted-foreground shrink-0" />}
                      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => onTest(p)}
                          disabled={isTesting}
                          title="Test"
                        >
                          <Wifi className="size-2.5" />
                        </Button>
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => setMenuOpen(menuOpen === key ? null : key)}
                            disabled={actionsLoading === p.id}
                          >
                            <MoreHorizontal className="size-2.5" />
                          </Button>
                          {menuOpen === key && (
                            <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-[100px]">
                              <button
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] hover:bg-muted transition-colors text-left"
                                onClick={() => { onEdit(p); setMenuOpen(null); }}
                              >
                                <Pencil className="size-3" /> Sửa
                              </button>
                              {!p.is_system && (
                                <button
                                  className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] hover:bg-red-50 dark:hover:bg-red-950 transition-colors text-left text-destructive"
                                  onClick={() => { onDelete(p); setMenuOpen(null); }}
                                >
                                  <Trash2 className="size-3" /> Xóa
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Add Provider */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-[11px] text-muted-foreground hover:text-foreground gap-1.5"
        onClick={onAdd}
      >
        <Plus className="size-3" /> Thêm Provider
      </Button>
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

  // ── Local UI state (not persisted) ────────────────────────────────────────
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    setTaskRoutes(updated);
    markDirty("taskRoutes");
  }, [setTaskRoutes, markDirty]);

  // ── Global rules & platform rules from store ──────────────────────────────
  const globalRules = promptRules?.global_rules ?? [];
  // platformRules không còn cần trong page — ContentTemplatesEditor tự xử lý

  // ── Load models when provider changes ────────────────────────────────────────
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

    // selectedProviderId is a DB id string (e.g. "1", "30") — match by id
    const providerRecord = providers.find((p) => String(p.id) === selectedProviderId);
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
      if (!res.ok) {
        if (data.isSystem) {
          toast.error(`System provider không thể xóa. Chỉ có thể tắt/bật.`);
        } else {
          toast.error(data.error || "Lỗi khi xóa provider");
        }
        return;
      }
      if (data.alreadyDeleted) {
        toast.info(`Provider "${deleteConfirmProvider.name}" đã được xóa trước đó.`);
      } else {
        toast.success(`Đã xóa provider "${deleteConfirmProvider.name}"!`);
      }
      // Invalidate query → useAISettingsSync sẽ cập nhật store từ server
      await queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
      // Nếu provider đang chọn bị xóa → chọn provider đầu tiên còn lại
      if (selectedProviderId === String(deleteConfirmProvider.id)) {
        setTimeout(() => {
          const state = useAIStore.getState();
          const remaining = state.providers.filter((p) => p.id !== deleteConfirmProvider.id);
          setSelectedProviderId(remaining.length > 0 ? String(remaining[0].id) : "");
        }, 100);
      }
    } catch { toast.error("Lỗi kết nối"); }
    finally {
      setProviderActionsLoading(null);
      setDeleteConfirmProvider(null);
    }
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
    if (field === "is_active" && selectedProviderId) {
      const providerId = parseInt(selectedProviderId, 10);
      if (!isNaN(providerId)) {
        updateProvider(providerId, { is_active: Boolean(value) });
      }
    }
    if (field === "status" && selectedProviderId) {
      const providerId = parseInt(selectedProviderId, 10);
      if (!isNaN(providerId)) {
        updateProvider(providerId, { status: value as "active" | "inactive" });
      }
    }
    setRuntimeConfig({ [field]: value });
  };

  // ── Derived ────────────────────────────────────────────────────────────

  const isDirty = useAIStore((s) => s.isDirty);

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
              {/* Compact provider list */}
              <div className="space-y-0.5">
                <CompactProviderSelector
                  providers={providers}
                  selectedId={selectedProviderId}
                  providerHealths={providerHealths}
                  testingProviders={testingProviders}
                  onSelect={setSelectedProviderId}
                  onEdit={handleEditProvider}
                  onTest={handleTestProvider}
                  onDelete={(p) => setDeleteConfirmProvider(p)}
                  onAdd={() => setAddProviderOpen(true)}
                  actionsLoading={providerActionsLoading}
                />
              </div>

              {/* Empty state */}
              {providers.length === 0 && (
                <div className="px-2 py-8 text-center">
                  <p className="text-[11px] text-muted-foreground mb-1">Chưa có AI Connection nào.</p>
                  <p className="text-[10px] text-muted-foreground/60">Nhấn "Thêm Connection" để bắt đầu.</p>
                </div>
              )}

              {/* Grouped provider list rendered inside CompactProviderSelector */}
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
                <Settings2 className="size-5 text-primary" />
                AI Engine
                <SaveStatusBadge />
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quản lý AI Connections, Routing và Phong cách nội dung
              </p>
            </div>
            <div className="flex items-center gap-2">
              <SaveButton />
            </div>
          </div>
        </header>

        {/* Tabs — simplified, business-friendly */}
        <div className="border-b bg-card px-6 py-2 shrink-0 overflow-x-auto">
          <div className="flex gap-0.5 py-1 min-w-max">
              {[
                { id: "connections", label: "AI Connections", icon: Wifi },
                { id: "routing", label: "AI Routing", icon: Route },
                { id: "brand", label: "Phong cách", icon: Palette },
                { id: "templates", label: "Prompt Templates", icon: Sparkles },
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

        {/* Current AI Banner */}
        <div className="px-6 pt-4 shrink-0">
          <CurrentAIBanner
            activeProvider={activeProvider}
            taskRoute={taskRoutes.find((r) => (r as unknown as RoutingRule).task_type === "task_assistant") ?? null}
            onNavigateToProviders={() => setActiveTab("connections")}
            onNavigateToRouting={() => setActiveTab("routing")}
          />
        </div>

        {/* Tab Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            {/* AI CONNECTIONS */}
            {activeTab === "connections" && (
              <APIConfigPanel
                providerType={providerType}
                config={runtimeConfig}
                onChange={handleConfigChange}
                availableModels={availableModels}
                loadingModels={loadingModels}
                testResult={testResult}
                onRefreshModels={() => {
                  const prov = selectedProvider;
                  if (prov) {
                    fetch("/api/ai/models/discover", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        provider_type: prov.type || prov.slug,
                        base_url: prov.base_url,
                      }),
                    })
                      .then((r) => r.json())
                      .then(({ data }) => {
                        if (data?.length) {
                          setAvailableModels(data.map((m: { id: string; name: string; context_window?: number }) => ({
                            id: m.id,
                            name: m.name,
                            context_window: m.context_window,
                          })));
                        }
                      })
                      .catch(() => {});
                  }
                }}
                onTest={() => {
                  if (selectedProvider) handleTestProvider(selectedProvider);
                }}
              />
            )}

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

          </div>
        </ScrollArea>
      </main>

      {/* ══ RIGHT INSPECTOR — removed for UX simplification ══ */}
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
            <DialogDescription className="space-y-2">
              <p>
                Bạn có chắc muốn xóa provider{" "}
                <strong>"{deleteConfirmProvider?.display_name || deleteConfirmProvider?.name}"</strong>?
                Hành động này không thể hoàn tác.
              </p>
              {deleteConfirmProvider?.is_system && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>System provider</strong> không thể xóa. Chỉ có thể tắt/bật trạng thái.
                  </span>
                </div>
              )}
              {deleteConfirmProvider?.is_default && !deleteConfirmProvider?.is_system && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>Provider này đang là mặc định. Hãy đặt provider khác làm mặc định trước.</span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmProvider(null)}>Hủy</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProvider}
              disabled={deleteConfirmProvider?.is_system}
            >
              {providerActionsLoading ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
