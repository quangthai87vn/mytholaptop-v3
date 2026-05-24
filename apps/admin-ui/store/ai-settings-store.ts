/**
 * AI Settings Zustand Store
 * Quản lý global state cho AI Operating Center
 * - Cache settings từ database
 * - Dirty tracking (hasChanges)
 * - Save status
 * - UI state (active tab, inspector, selectedProviderId)
 * - Per-provider runtime configs
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  ProviderCard,
  TaskRoute,
  BrandVoice,
  SafetyRule,
  SystemPromptTemplate,
  AIRuntimeConfig,
  MediaAIConfig,
  ProviderType,
  LocalRuntime,
} from "@/types/ai-operating";
import { PROVIDER_CONFIG } from "@/types/ai-operating";
import type { PromptRulesConfig } from "@/lib/content/db/prompt-rules";

// ── Per-provider default config ─────────────────────────────────────────────────

function makeDefaultConfig(provider: ProviderType): AIRuntimeConfig {
  const cfg = PROVIDER_CONFIG[provider];
  if (!cfg) {
    return {
      base_url: "",
      api_key: "",
      timeout_ms: 60000,
      retry_count: 3,
      enable_streaming: false,
      model_name: "gpt-4o-mini",
      max_output_tokens: 2048,
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    };
  }
  return {
    base_url: cfg.defaultUrl,
    api_key: "",
    timeout_ms: 60000,
    retry_count: 3,
    enable_streaming: false,
    model_name: cfg.cloudModels?.[0] ?? "gpt-4o-mini",
    model_family: provider === "ollama" ? "general" : undefined,
    local_runtime: cfg.tier === "local" ? (provider as LocalRuntime) : undefined,
    context_window: undefined,
    max_output_tokens: 2048,
    temperature: 0.7,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  };
}

// ── All provider types for initial state ───────────────────────────────────────

const ALL_PROVIDER_TYPES: ProviderType[] = [
  "openai", "gemini", "deepseek", "huggingface",
  "ollama", "lmstudio", "openai-compatible",
];

// ── Save Status ────────────────────────────────────────────────────────────────

export type SaveStatus = "idle" | "saving" | "saved" | "error";

// ── Store State ───────────────────────────────────────────────────────────────

interface AIStoreState {
  // ── Server Data (from DB) ─────────────────────────────────────────────────
  providers: ProviderCard[];
  activeProvider: ProviderCard | null;   // DB: which provider is the system default
  taskRoutes: TaskRoute[];
  brandVoices: BrandVoice[];
  promptRules: PromptRulesConfig | null;
  safetyRules: SafetyRule[];
  systemPrompts: SystemPromptTemplate[];
  mediaConfig: MediaAIConfig;

  // ── Per-provider Runtime Configs ───────────────────────────────────────────
  // Keyed by provider id (string) for uniqueness with custom providers from DB
  runtimeConfigs: Record<string, AIRuntimeConfig>;

  // ── Server State ────────────────────────────────────────────────────────
  isHydrated: boolean;
  isLoading: boolean;
  saveStatus: SaveStatus;

  // ── UI State (not persisted to DB) ───────────────────────────────────────
  // Which provider card the user has selected in the sidebar.
  // Independent of `activeProvider` (which is the system default from DB).
  // Value is the provider id as string (e.g. "1", "30")
  // or empty string when no provider is selected.
  selectedProviderId: string;
  activeTab: string;
  isInspectorOpen: boolean;

  // ── Dirty Tracking ──────────────────────────────────────────────────────
  isDirty: boolean;
  dirtyFields: Set<string>;
}

// ── Store Actions ─────────────────────────────────────────────────────────────

interface AIStoreActions {
  hydrate: (data: {
    providers: ProviderCard[];
    taskRoutes: TaskRoute[];
    brandVoices: BrandVoice[];
    promptRules: PromptRulesConfig | null;
    safetyRules: SafetyRule[];
    systemPrompts: SystemPromptTemplate[];
    mediaConfig?: MediaAIConfig;
  }) => void;

  setLoading: (loading: boolean) => void;
  setSaveStatus: (status: SaveStatus) => void;

  // ── UI actions ─────────────────────────────────────────────────────────
  // Select a provider card in the sidebar (UI only, not the DB active flag)
  // Value is the provider id as string (e.g. "1", "30")
  setSelectedProviderId: (id: string) => void;

  setActiveProvider: (provider: ProviderCard | null) => void;
  setRuntimeConfig: (config: Partial<AIRuntimeConfig>) => void;
  setProviders: (providers: ProviderCard[]) => void;
  updateProvider: (id: number, updates: Partial<ProviderCard>) => void;
  addProvider: (provider: ProviderCard) => void;
  removeProvider: (id: number) => void;
  setProviderConnectionStatus: (id: number, status: "connected" | "error" | "unknown", latency_ms?: number, error?: string) => void;

  setTaskRoutes: (routes: TaskRoute[]) => void;
  updateTaskRoute: (taskType: string, updates: Partial<TaskRoute>) => void;

  setBrandVoices: (voices: BrandVoice[]) => void;
  updateBrandVoice: (preset: string, updates: Partial<BrandVoice>) => void;
  setActiveBrandVoice: (preset: string) => void;

  setPromptRules: (rules: PromptRulesConfig) => void;
  setSafetyRules: (rules: SafetyRule[]) => void;
  setSystemPrompts: (prompts: SystemPromptTemplate[]) => void;
  updateSystemPrompt: (id: number, updates: Partial<SystemPromptTemplate>) => void;
  setDefaultSystemPrompt: (id: number) => void;
  setMediaConfig: (config: Partial<MediaAIConfig>) => void;

  setActiveTab: (tab: string) => void;
  setInspectorOpen: (open: boolean) => void;

  markDirty: (field: string) => void;
  markClean: () => void;
  resetToServer: (data: {
    providers: ProviderCard[];
    taskRoutes: TaskRoute[];
    brandVoices: BrandVoice[];
    promptRules: PromptRulesConfig | null;
    safetyRules: SafetyRule[];
    systemPrompts: SystemPromptTemplate[];
    mediaConfig: MediaAIConfig;
  }) => void;
}

// ── Build initial per-provider configs ────────────────────────────────────────

function buildInitialRuntimeConfigs(): Record<string, AIRuntimeConfig> {
  const configs: Record<string, AIRuntimeConfig> = {};
  for (const type of ALL_PROVIDER_TYPES) {
    configs[type] = makeDefaultConfig(type);
  }
  return configs;
}

const DEFAULT_MEDIA_CONFIG: MediaAIConfig = {
  prompt_model: "gemini",
  image_model: "openai_dall_e",
};

export const useAIStore = create<AIStoreState & AIStoreActions>()(
  devtools(
    (set, get) => ({
      // ── Initial State ───────────────────────────────────────────────────
      providers: [],
      activeProvider: null,
      runtimeConfigs: buildInitialRuntimeConfigs(),
      taskRoutes: [],
      brandVoices: [],
      promptRules: null,
      safetyRules: [],
      systemPrompts: [],
      mediaConfig: DEFAULT_MEDIA_CONFIG,
      isHydrated: false,
      isLoading: false,
      saveStatus: "idle",
      // Empty string = no provider selected. UI must show empty state.
      // DB providers will auto-select the first one via hydrate().
      selectedProviderId: "",
      activeTab: "providers",
      isInspectorOpen: true,
      isDirty: false,
      dirtyFields: new Set<string>(),

      // ── Hydrate ────────────────────────────────────────────────────────
      // NOTE: Does NOT touch selectedProviderId — user selection must survive
      // hydration so switching tabs / re-fetching doesn't reset the sidebar.
      hydrate: (data) =>
        set(
          (state) => {
            const dbActive = data.providers.find((p) => p.is_active) ?? data.providers[0] ?? null;
            // Use the provider id as the selected ID for unique identification
            const dbActiveId = dbActive ? String(dbActive.id) : "";
            // Pick the first provider's id as fallback for UI selection if never set before.
            // If no providers in DB, uiSelectedId will be "" → UI shows empty state.
            const uiSelectedId: string =
              state.isHydrated ? state.selectedProviderId : (dbActiveId || (data.providers[0] ? String(data.providers[0].id) : ""));

            // Build runtimeConfigs: merge DB values into existing configs
            // Key by provider id (string) for uniqueness.
            const runtimeConfigs: Record<string, AIRuntimeConfig> = {};
            for (const provider of data.providers) {
              const key = String(provider.id);
              const existing = state.runtimeConfigs[key] ?? {};
              runtimeConfigs[key] = {
                ...existing,
                base_url: provider.base_url ?? existing.base_url,
                provider_id: provider.id,
                model_name: (provider as any).model_name ?? existing.model_name ?? "",
                temperature: (provider as any).temperature ?? existing.temperature ?? 0.7,
                api_key: existing.api_key ?? "",
                timeout_ms: existing.timeout_ms ?? (provider as any).timeout_ms ?? 60000,
                retry_count: existing.retry_count ?? (provider as any).retry_count ?? 3,
                enable_streaming: existing.enable_streaming ?? (provider as any).streaming_enabled ?? false,
                model_family: existing.model_family,
                local_runtime: existing.local_runtime,
                context_window: existing.context_window,
                max_output_tokens: (provider as any).max_output_tokens ?? existing.max_output_tokens ?? 2048,
                top_p: existing.top_p ?? 1,
                frequency_penalty: existing.frequency_penalty ?? 0,
                presence_penalty: existing.presence_penalty ?? 0,
              };
            }

            return {
              providers: data.providers,
              activeProvider: dbActive,
              runtimeConfigs,
              taskRoutes: data.taskRoutes,
              brandVoices: data.brandVoices,
              promptRules: data.promptRules,
              safetyRules: data.safetyRules,
              systemPrompts: data.systemPrompts,
              mediaConfig: data.mediaConfig ?? state.mediaConfig,
              isHydrated: true,
              isLoading: false,
              isDirty: false,
              dirtyFields: new Set<string>(),
              saveStatus: "idle",
              selectedProviderId: uiSelectedId,
            };
          },
          false,
          "AI/hydrate"
        ),

      setLoading: (loading) => set({ isLoading: loading }, false, "AI/setLoading"),
      setSaveStatus: (status) => set({ saveStatus: status }, false, "AI/setSaveStatus"),

      // ── UI: Select provider card ───────────────────────────────────────
      // Only updates the UI selection (sidebar highlight + config panel).
      // Does NOT change the DB `activeProvider` flag.
      // Accepts the provider slug from DB (e.g. "groq_deepseek", "9router")
      setSelectedProviderId: (id: string) =>
        set({ selectedProviderId: id }, false, "AI/setSelectedProviderId"),

      // ── Active Provider (DB flag) ─────────────────────────────────────
      setActiveProvider: (provider) =>
        set({ activeProvider: provider, isDirty: true }, false, "AI/setActiveProvider"),

      setRuntimeConfig: (config) =>
        set(
          (state) => {
            const type = state.selectedProviderId;
            const updatedConfigs = {
              ...state.runtimeConfigs,
              [type]: { ...state.runtimeConfigs[type], ...config },
            };
            return {
              runtimeConfigs: updatedConfigs,
              isDirty: true,
            };
          },
          false,
          "AI/setRuntimeConfig"
        ),

      setProviders: (providers) =>
        set({ providers, isDirty: true }, false, "AI/setProviders"),

      updateProvider: (id, updates) =>
        set(
          (state) => ({
            providers: state.providers.map((p) =>
              p.id === id ? { ...p, ...updates } : p
            ),
            activeProvider:
              state.activeProvider?.id === id
                ? { ...state.activeProvider, ...updates }
                : state.activeProvider,
            isDirty: true,
          }),
          false,
          "AI/updateProvider"
        ),

      addProvider: (provider) =>
        set(
          (state) => {
            const newProviders = [...state.providers.filter((p) => p.id !== provider.id), provider];
            const providerKey = provider.slug || provider.type || String(provider.id);
            // Auto-select the newly created provider so it appears in the sidebar
            return {
              providers: newProviders,
              selectedProviderId: providerKey,
              isDirty: true,
            };
          },
          false,
          "AI/addProvider"
        ),

      removeProvider: (id) =>
        set(
          (state) => {
            const remaining = state.providers.filter((p) => p.id !== id);
            const firstRemaining = remaining[0] ?? null;
            const wasSelected = state.selectedProviderId === String(id);
            return {
              providers: remaining,
              activeProvider: state.activeProvider?.id === id ? null : state.activeProvider,
              // If deleted provider was selected, select first remaining; if none left, clear selection
              selectedProviderId: wasSelected
                ? (firstRemaining ? String(firstRemaining.id) : "")
                : state.selectedProviderId,
              isDirty: true,
            };
          },
          false,
          "AI/removeProvider"
        ),

      setProviderConnectionStatus: (id, status, latency_ms, error) =>
        set(
          (state) => ({
            providers: state.providers.map((p) =>
              p.id === id
                ? { ...p, connection_status: status, last_error: error, last_checked_at: new Date().toISOString() }
                : p
            ),
          }),
          false,
          "AI/setProviderConnectionStatus"
        ),

      // ── Task Routes ───────────────────────────────────────────────────
      setTaskRoutes: (routes) =>
        set({ taskRoutes: routes, isDirty: false }, false, "AI/setTaskRoutes"),

      updateTaskRoute: (taskType, updates) =>
        set(
          (state) => ({
            taskRoutes: state.taskRoutes.map((r) =>
              r.task_type === taskType ? { ...r, ...updates } : r
            ),
            isDirty: true,
          }),
          false,
          "AI/updateTaskRoute"
        ),

      // ── Brand Voices ──────────────────────────────────────────────────
      setBrandVoices: (voices) =>
        set({ brandVoices: voices, isDirty: true }, false, "AI/setBrandVoices"),

      updateBrandVoice: (preset, updates) =>
        set(
          (state) => ({
            brandVoices: state.brandVoices.map((v) =>
              v.preset === preset ? { ...v, ...updates } : v
            ),
            isDirty: true,
          }),
          false,
          "AI/updateBrandVoice"
        ),

      setActiveBrandVoice: (preset) =>
        set(
          (state) => ({
            brandVoices: state.brandVoices.map((v) => ({
              ...v,
              is_active: v.preset === preset,
            })),
            isDirty: true,
          }),
          false,
          "AI/setActiveBrandVoice"
        ),

      // ── Prompt Rules ───────────────────────────────────────────────────
      setPromptRules: (rules) =>
        set({ promptRules: rules, isDirty: true }, false, "AI/setPromptRules"),

      // ── Safety Rules ───────────────────────────────────────────────────
      setSafetyRules: (rules) =>
        set({ safetyRules: rules, isDirty: true }, false, "AI/setSafetyRules"),

      // ── System Prompts ──────────────────────────────────────────────────
      setSystemPrompts: (prompts) =>
        set({ systemPrompts: prompts, isDirty: true }, false, "AI/setSystemPrompts"),

      updateSystemPrompt: (id, updates) =>
        set(
          (state) => ({
            systemPrompts: state.systemPrompts.map((p) =>
              p.id === id ? { ...p, ...updates } : p
            ),
            isDirty: true,
          }),
          false,
          "AI/updateSystemPrompt"
        ),

      setDefaultSystemPrompt: (id) =>
        set(
          (state) => ({
            systemPrompts: state.systemPrompts.map((p) => ({
              ...p,
              is_default: p.id === id,
            })),
            isDirty: true,
          }),
          false,
          "AI/setDefaultSystemPrompt"
        ),

      // ── Media Config ───────────────────────────────────────────────────
      setMediaConfig: (config) =>
        set(
          (state) => ({
            mediaConfig: { ...state.mediaConfig, ...config },
            isDirty: true,
          }),
          false,
          "AI/setMediaConfig"
        ),

      // ── UI ─────────────────────────────────────────────────────────────
      setActiveTab: (tab) => set({ activeTab: tab }, false, "AI/setActiveTab"),
      setInspectorOpen: (open) => set({ isInspectorOpen: open }, false, "AI/setInspectorOpen"),

      // ── Dirty ──────────────────────────────────────────────────────────
      markDirty: (field) =>
        set(
          (state) => {
            const newSet = new Set(state.dirtyFields);
            newSet.add(field);
            return { dirtyFields: newSet, isDirty: true };
          },
          false,
          "AI/markDirty"
        ),

      markClean: () =>
        set(
          { isDirty: false, dirtyFields: new Set<string>(), saveStatus: "idle" },
          false,
          "AI/markClean"
        ),

      resetToServer: (data) =>
        set(
          (state) => {
            const dbActive = data.providers.find((p) => p.is_active) ?? data.providers[0] ?? null;
            const dbActiveId = dbActive ? String(dbActive.id) : "";
            const uiSelectedId: string =
              state.isHydrated ? state.selectedProviderId : (dbActiveId || (data.providers[0] ? String(data.providers[0].id) : ""));

            // Merge runtimeConfigs from DB data (keyed by provider id)
            const runtimeConfigs: Record<string, AIRuntimeConfig> = {};
            for (const provider of data.providers) {
              const key = String(provider.id);
              const existing = state.runtimeConfigs[key] ?? {};
              runtimeConfigs[key] = {
                ...existing,
                base_url: provider.base_url ?? existing.base_url,
                model_name: (provider as any).model_name ?? existing.model_name ?? "",
                temperature: (provider as any).temperature ?? existing.temperature ?? 0.7,
                api_key: existing.api_key ?? "",
                timeout_ms: existing.timeout_ms ?? 60000,
                retry_count: existing.retry_count ?? 3,
                enable_streaming: existing.enable_streaming ?? false,
                model_family: existing.model_family,
                local_runtime: existing.local_runtime,
                context_window: existing.context_window,
                max_output_tokens: existing.max_output_tokens ?? 2048,
                top_p: existing.top_p ?? 1,
                frequency_penalty: existing.frequency_penalty ?? 0,
                presence_penalty: existing.presence_penalty ?? 0,
              };
            }

            return {
              providers: data.providers,
              activeProvider: dbActive,
              runtimeConfigs,
              taskRoutes: data.taskRoutes,
              brandVoices: data.brandVoices,
              promptRules: data.promptRules,
              safetyRules: data.safetyRules,
              systemPrompts: data.systemPrompts,
              mediaConfig: data.mediaConfig,
              isDirty: false,
              dirtyFields: new Set<string>(),
              saveStatus: "idle",
              selectedProviderId: uiSelectedId,
            };
          },
          false,
          "AI/resetToServer"
        ),
    }),
    { name: "AI-Settings-Store" }
  )
);
