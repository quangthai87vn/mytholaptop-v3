/**
 * SaveButton - Nút lưu toàn bộ cấu hình
 * Gọi unified save API, hiển thị loading state
 */

"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAIStore } from "@/store/ai-settings-store";
import { useSaveAISettings } from "@/libs/hooks/use-ai-settings";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export function SaveButton({ className }: { className?: string }) {
  const saveStatus = useAIStore((s) => s.saveStatus);
  const isDirty = useAIStore((s) => s.isDirty);
  const isHydrated = useAIStore((s) => s.isHydrated);

  const {
    providers,
    activeProvider,
    runtimeConfigs,
    taskRoutes,
    brandVoices,
    promptRules,
    safetyRules,
    systemPrompts,
    mediaConfig,
  } = useAIStore();

  const saveMutation = useSaveAISettings();

  const handleSave = useCallback(async () => {
    if (saveStatus === "saving") return;

    const mediaSettings = [
      {
        media_type: "image",
        provider: mediaConfig.prompt_model,
        model_name: mediaConfig.prompt_model_name ?? null,
        temperature: 0.9,
        quality: "standard",
        size: "1024x1024",
        is_active: mediaConfig.image_model === "openai_dall_e",
      },
      {
        media_type: "video",
        provider: "openai_sora",
        model_name: "sora-1",
        temperature: 0.8,
        quality: "720p",
        size: "1280x720",
        is_active: false,
      },
      {
        media_type: "audio",
        provider: "openai_tts",
        model_name: "tts-1",
        temperature: 0.9,
        quality: "mp3_24k",
        size: "normal",
        is_active: false,
      },
    ];

    const DEV = process.env.NODE_ENV === "development";
    if (DEV) {
      console.log("[SaveButton] Saving with", taskRoutes.length, "routes");
      taskRoutes.forEach(r => {
        const anyR = r as any;
        console.log(`  - ${r.task_type}: provider_id=${anyR.primary_provider_id ?? "null"}, model=${anyR.primary_model_override ?? "null"}`);
      });
    }

    saveMutation.mutate({
      providers: providers.map((p) => {
        const type = p.slug || p.type;
        const rc = runtimeConfigs[type] || runtimeConfigs[p.type] || {};
        return {
          id: p.id,
          type: p.type,
          slug: p.slug || p.type,
          name: p.name,
          group_slug: p.group_slug,
          base_url: p.base_url,
          status: p.status ?? (p.is_active ? "active" : "inactive"),
          is_default: p.is_default ?? false,
          is_active: p.is_active,
          // Runtime params from store
          model_name: rc.model_name ?? p.model_name ?? null,
          temperature: rc.temperature ?? p.temperature ?? null,
          streaming_enabled: rc.enable_streaming ?? false,
          timeout_ms: rc.timeout_ms ?? p.timeout_ms ?? null,
          retry_count: rc.retry_count ?? p.retry_count ?? null,
          // API key: chỉ gửi nếu user nhập mới, không rỗng
          api_key: (rc.api_key && rc.api_key.length > 0) ? rc.api_key : undefined,
        };
      }),
      taskRoutes,
      brandVoices,
      promptRules,
      safetyRules,
      systemPrompts,
      mediaSettings,
    });
  }, [
    saveStatus, providers, taskRoutes, brandVoices,
    promptRules, safetyRules, systemPrompts, mediaConfig, saveMutation,
  ]);

  const isSaving = saveStatus === "saving";
  const disabled = !isHydrated || isSaving;

  return (
    <Button
      onClick={handleSave}
      disabled={disabled}
      className={className}
      size="sm"
    >
      {isSaving ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Đang lưu...
        </>
      ) : (
        <>
          <Save className="w-4 h-4" />
          Lưu cấu hình
          {isDirty && (
            <span className="ml-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-semibold">
              !
            </span>
          )}
        </>
      )}
    </Button>
  );
}
