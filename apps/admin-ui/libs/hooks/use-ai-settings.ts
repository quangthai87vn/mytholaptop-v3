/**
 * AI Settings React Query Hooks
 * Dùng React Query để fetch/save toàn bộ config từ /api/ai/settings/all
 */

"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAIStore } from "@/store/ai-settings-store";
import { queryClient } from "@/libs/query-client";
import type {
  ProviderCard,
  TaskRoute,
  BrandVoice,
  SafetyRule,
  SystemPromptTemplate,
  MediaAIConfig,
} from "@/types/ai-operating";
import type { PromptRulesConfig } from "@/lib/content/db/prompt-rules";

// ── Types ────────────────────────────────────────────────────────────────────

interface AllSettingsResponse {
  providers: ProviderCard[];
  taskRoutes: TaskRoute[];
  brandVoices: BrandVoice[];
  promptRules: PromptRulesConfig | null;
  safetyRules: SafetyRule[];
  systemPrompts: SystemPromptTemplate[];
  mediaSettings?: Array<{
    media_type: string;
    provider: string;
    model_name: string | null;
    base_url: string | null;
    temperature: number;
    quality: string;
    size: string;
    is_active: boolean;
  }>;
}

interface SaveAllBody {
  providers: Array<{
    id: number;
    type: string;
    name: string;
    base_url: string | null;
    is_active: boolean;
    model_name: string | null;
    temperature: number | null;
    api_key?: string;
  }>;
  taskRoutes: TaskRoute[];
  brandVoices: BrandVoice[];
  promptRules: PromptRulesConfig | null;
  safetyRules: SafetyRule[];
  systemPrompts: SystemPromptTemplate[];
  mediaSettings: Array<{
    media_type: string;
    provider: string;
    model_name: string | null;
    base_url?: string | null;
    temperature: number;
    quality: string;
    size: string;
    is_active: boolean;
    api_key?: string;
  }>;
}

interface SaveAllResponse {
  success: boolean;
  saved: string[];
  message: string;
}

// ── Fetch All Settings ────────────────────────────────────────────────────────

// ── Fetch All Settings (shared client) ────────────────────────────────────────
// Dùng bởi useAISettingsSync — phải cùng client với invalidateQueries trong page
export function useAISettingsQuery() {
  return useQuery<AllSettingsResponse>({
    queryKey: ["ai-settings-all"],
    queryFn: async () => {
      const res = await fetch("/api/ai/settings/all");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi khi load cấu hình");
      }
      const json = await res.json();
      return json.data;
    },
    staleTime: 5 * 60 * 1000,   // 5 phút
    gcTime: 30 * 60 * 1000,     // 30 phút
    retry: 2,
  });
}

export function useAISettings() {
  const hydrate = useAIStore((s) => s.hydrate);
  const setLoading = useAIStore((s) => s.setLoading);

  return useAISettingsQuery();
}

// ── Hydrate Store Hook ────────────────────────────────────────────────────────
// CRITICAL:
// 1. Chỉ hydrate KHI chưa từng hydrate (isHydrated = false).
//    Dùng isHydrated vì React Query's isLoading=false sau mỗi refetch,
//    nên nếu dùng `isLoading === false` sẽ hydrate lại sau mỗi save + invalidate.
// 2. Sau save + invalidate, data refetch từ server với giá trị đúng.
//    Nhưng hydrate lại sẽ reset runtimeConfigs, selectedProviderId về DB values.
//    ĐÂY là nguyên nhân gốc của bug "chuyển tab data mất".
// 3. Giải pháp: Chỉ hydrate lần đầu (isHydrated = false).
//    Sau đó state được quản lý bởi setRuntimeConfig/updateProvider actions.
//
// 4. Khi create/update/delete provider via mutations + invalidateQueries,
//    React Query refetches nhưng store không tự cập nhật.
//    → Dùng useAISettingsSync để merge data mới vào store mà không reset user edits.
export function useHydrateAISettings() {
  const hydrate = useAIStore((s) => s.hydrate);
  const isHydrated = useAIStore((s) => s.isHydrated);
  const { data, isLoading, isError, error } = useAISettings();

  useEffect(() => {
    if (data && isLoading === false && !isHydrated) {
      const mediaConfig: MediaAIConfig = {
        prompt_model: (data.mediaSettings?.find((m) => m.media_type === "image")?.provider as MediaAIConfig["prompt_model"]) ?? "gemini",
        prompt_model_name: data.mediaSettings?.find((m) => m.media_type === "image")?.model_name ?? undefined,
        image_model: (data.mediaSettings?.find((m) => m.media_type === "image")?.provider as MediaAIConfig["image_model"]) ?? "openai_dall_e",
      };
      hydrate({
        providers: data.providers,
        taskRoutes: data.taskRoutes,
        brandVoices: data.brandVoices,
        promptRules: data.promptRules,
        safetyRules: data.safetyRules,
        systemPrompts: data.systemPrompts,
        mediaConfig,
      });
    }
  }, [data, isLoading, isHydrated, hydrate]);

  return { isLoading, isError, error };
}

// ── Sync Store after React Query refetch ──────────────────────────────────────
// Sau khi create/delete provider, React Query refetch nhưng store không cập nhật.
// Hook này merge data mới vào store mà KHÔNG reset runtimeConfigs (preserve user edits).
export function useAISettingsSync() {
  const isHydrated = useAIStore((s) => s.isHydrated);
  // Use useAISettingsQuery which uses the shared queryClient (same as page's invalidateQueries)
  const { data, isLoading, isError, error } = useAISettingsQuery();

  useEffect(() => {
    // Only sync after initial hydration, when data actually changes
    if (!data || isLoading || !isHydrated) return;

    const mediaConfig: MediaAIConfig = {
      prompt_model: (data.mediaSettings?.find((m) => m.media_type === "image")?.provider as MediaAIConfig["prompt_model"]) ?? "gemini",
      prompt_model_name: data.mediaSettings?.find((m) => m.media_type === "image")?.model_name ?? undefined,
      image_model: (data.mediaSettings?.find((m) => m.media_type === "image")?.provider as MediaAIConfig["image_model"]) ?? "openai_dall_e",
    };
    // Use resetToServer which preserves selectedProviderId when isHydrated=true
    useAIStore.getState().resetToServer({
      providers: data.providers,
      taskRoutes: data.taskRoutes,
      brandVoices: data.brandVoices,
      promptRules: data.promptRules,
      safetyRules: data.safetyRules,
      systemPrompts: data.systemPrompts,
      mediaConfig,
    });
  }, [data, isLoading, isHydrated]);

  return { isLoading, isError, error };
}

// ── Save All Settings Mutation ────────────────────────────────────────────────

export function useSaveAISettings() {
  const queryClient = useQueryClient();
  const { markClean, setSaveStatus } = useAIStore();

  return useMutation<SaveAllResponse, Error, SaveAllBody>({
    mutationFn: async (body) => {
      const res = await fetch("/api/ai/settings/all", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi khi lưu cấu hình");
      }
      return res.json();
    },
    onMutate: () => {
      setSaveStatus("saving");
    },
    onSuccess: (data) => {
      markClean();
      queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
      toast.success("Đã lưu cấu hình thành công!", {
        description: data.message,
      });
      setSaveStatus("saved");
    },
    onError: (err) => {
      toast.error("Lưu cấu hình thất bại", {
        description: err.message,
      });
      setSaveStatus("error");
    },
    onSettled: () => {
      // Sau 3s tự chuyển về idle
      setTimeout(() => setSaveStatus("idle"), 3000);
    },
  });
}

// ── Save Provider API Key ──────────────────────────────────────────────────────

export function useSaveProviderApiKey() {
  return useMutation({
    mutationFn: async ({ id, api_key }: { id: number; api_key: string }) => {
      const res = await fetch("/api/ai/providers/api-key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, api_key }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi khi lưu API key");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
      toast.success("API Key đã được mã hóa và lưu", {
        description: `Masked: ${data.masked_key}`,
      });
    },
  });
}

// ── Update Provider Active ────────────────────────────────────────────────────

export function useUpdateProviderActive() {
  const { updateProvider } = useAIStore();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      const res = await fetch(`/api/ai/providers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      });
      if (!res.ok) throw new Error("Lỗi khi cập nhật provider");
      return res.json();
    },
    onSuccess: (_, variables) => {
      updateProvider(variables.id, { is_active: variables.is_active });
      queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
    },
  });
}

// ── Task Route Mutation ───────────────────────────────────────────────────────

export function useUpsertTaskRoute() {
  return useMutation({
    mutationFn: async (route: TaskRoute) => {
      const res = await fetch("/api/ai/task-routes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(route),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi khi lưu task route");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
    },
  });
}

// ── Brand Voice Mutation ──────────────────────────────────────────────────────

export function useUpsertBrandVoice() {
  return useMutation({
    mutationFn: async (voice: BrandVoice) => {
      const res = await fetch("/api/ai/brand-voices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(voice),
      });
      if (!res.ok) throw new Error("Lỗi khi lưu brand voice");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
    },
  });
}

// ── Safety Rule Mutation ──────────────────────────────────────────────────────

export function useUpsertSafetyRule() {
  return useMutation({
    mutationFn: async (rule: Partial<SafetyRule> & { rule_key: string; rule_text: string }) => {
      const res = await fetch("/api/ai/safety-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      if (!res.ok) throw new Error("Lỗi khi lưu safety rule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings-all"] });
    },
  });
}

// Export queryClient for direct use
export { queryClient };
