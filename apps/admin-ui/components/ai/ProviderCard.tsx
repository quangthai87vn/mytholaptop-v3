"use client";

import { CheckCircle, XCircle, WifiOff, Loader2, Zap, Cpu, Cloud, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ProviderType,
  ProviderHealth,
  ProviderGroupSlug,
} from "@/types/ai-operating";

// Inline meta to avoid circular import
const CARD_META: Partial<Record<ProviderType, {
  label: string;
  group: ProviderGroupSlug;
  isLocal: boolean;
  accentColor: string;
  bgColor: string;
  icon: React.ElementType;
}>> = {
  openai: {
    label: "OpenAI", group: "cloud_api", isLocal: false,
    accentColor: "#10A37F", bgColor: "bg-[#10A37F]/10", icon: Zap,
  },
  gemini: {
    label: "Google Gemini", group: "cloud_api", isLocal: false,
    accentColor: "#4285F4", bgColor: "bg-[#4285F4]/10", icon: Zap,
  },
  deepseek: {
    label: "DeepSeek Cloud", group: "cloud_api", isLocal: false,
    accentColor: "#0066FF", bgColor: "bg-blue-500/10", icon: Zap,
  },
  huggingface: {
    label: "HuggingFace", group: "inference_platform", isLocal: false,
    accentColor: "#FFD21E", bgColor: "bg-yellow-400/10", icon: Layers,
  },
  ollama: {
    label: "Ollama", group: "local_llm", isLocal: true,
    accentColor: "#CC3300", bgColor: "bg-orange-500/10", icon: Cpu,
  },
  lmstudio: {
    label: "LM Studio", group: "local_llm", isLocal: true,
    accentColor: "#FF6B35", bgColor: "bg-orange-400/10", icon: Cpu,
  },
  "openai-compatible": {
    label: "OpenAI-Compatible", group: "local_llm", isLocal: true,
    accentColor: "#9333EA", bgColor: "bg-purple-500/10", icon: Cpu,
  },
  openrouter: {
    label: "OpenRouter", group: "ai_aggregator", isLocal: false,
    accentColor: "#FF6B35", bgColor: "bg-orange-500/10", icon: Layers,
  },
  groq: {
    label: "Groq", group: "ai_aggregator", isLocal: false,
    accentColor: "#00D2FF", bgColor: "bg-cyan-500/10", icon: Zap,
  },
};

interface ProviderCardProps {
  type: ProviderType;
  isActive: boolean;
  health?: ProviderHealth;
  model_name?: string;
  request_count?: number;
  onSelect: (type: ProviderType) => void;
  onTest: (type: ProviderType) => void;
  testing?: boolean;
}

function GroupIcon({ group }: { group: ProviderGroupSlug }) {
  if (group === "cloud_api") return <Cloud className="size-3" />;
  if (group === "local_llm") return <Cpu className="size-3" />;
  return <Layers className="size-3" />;
}

const GROUP_LABELS: Record<ProviderGroupSlug, string> = {
  cloud_api: "Cloud",
  local_llm: "Local",
  ai_aggregator: "Aggregator",
  inference_platform: "Inference",
};

export function ProviderCard({
  type,
  isActive,
  health,
  model_name,
  request_count = 0,
  onSelect,
  onTest,
  testing,
}: ProviderCardProps) {
  const meta = CARD_META[type] ?? {
    label: type,
    group: "cloud_api" as ProviderGroupSlug,
    isLocal: false,
    accentColor: "#888",
    bgColor: "bg-gray-500/10",
    icon: Zap,
  };

  const isConnected = health?.status === "connected";
  const hasError = health?.status === "error";
  const Icon = meta.icon;

  return (
    <button
      onClick={() => onSelect(type)}
      className={`w-full text-left rounded-xl transition-all duration-200 relative overflow-hidden group
        ${isActive
          ? "border border-red-400 bg-red-50/50 dark:bg-red-950/20 shadow-sm ring-1 ring-red-400/20"
          : "border border-gray-200 bg-card hover:bg-muted/20 shadow-sm hover:shadow"
        }`}
      style={{ minHeight: "140px" }}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500" />
      )}

      <div className="p-4 h-full flex flex-col">
        {/* Top: Icon + group + status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* Big icon */}
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${meta.bgColor}`}
              style={{ borderColor: `${meta.accentColor}30`, borderWidth: 1 }}
            >
              <Icon className="size-5" style={{ color: meta.accentColor }} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm">{meta.label}</span>
                {isActive && (
                  <CheckCircle className="size-3 text-primary fill-primary/20" />
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <GroupIcon group={meta.group} />
                <span className="text-[10px] text-muted-foreground">{GROUP_LABELS[meta.group]}</span>
              </div>
            </div>
          </div>

          {/* Status badge */}
          {health ? (
            isConnected ? (
              <Badge
                variant="outline"
                className="text-[10px] gap-1 border-green-300 text-green-700 dark:border-green-800 dark:text-green-400"
                style={{ background: "#10A37F10" }}
              >
                <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                {health.latency_ms}ms
              </Badge>
            ) : hasError ? (
              <Badge
                variant="outline"
                className="text-[10px] gap-1 border-red-300 text-red-600 dark:border-red-800 dark:text-red-400"
              >
                <XCircle className="size-3" />
                Lỗi
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] gap-1 border-muted-foreground/30 text-muted-foreground"
              >
                <WifiOff className="size-3" />
                Offline
              </Badge>
            )
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] gap-1 border-muted-foreground/30 text-muted-foreground"
            >
              <WifiOff className="size-3" />
              Chưa test
            </Badge>
          )}
        </div>

        {/* Model name */}
        <div className="flex-1 min-h-0">
          {model_name ? (
            <p className="text-xs font-mono text-muted-foreground mb-2 truncate">
              {model_name}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/50 mb-2 italic">Chưa chọn model</p>
          )}
        </div>

        {/* Bottom: stats + test button */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
          {request_count > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {request_count} req
            </span>
          )}
          <Button
            variant={isConnected ? "ghost" : "outline"}
            size="sm"
            className={`gap-1 h-7 text-[11px] ml-auto ${
              isConnected ? "text-green-600 hover:text-green-700 dark:text-green-400" : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onTest(type);
            }}
            disabled={testing}
          >
            {testing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : isConnected ? (
              <Zap className="size-3 text-green-500" />
            ) : hasError ? (
              <XCircle className="size-3 text-red-500" />
            ) : (
              <WifiOff className="size-3" />
            )}
            {testing ? "..." : isConnected ? "Online" : "Test"}
          </Button>
        </div>
      </div>
    </button>
  );
}
