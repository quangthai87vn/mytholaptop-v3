"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  Cpu,
  Zap,
  Clock,
  TrendingDown,
  DollarSign,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { useStudioStore } from "@/store/ai-studio-store";

function estimateCost(tokens: number, provider: string): number {
  const PRICES: Record<string, number> = {
    openai: 0.15,
    gemini: 0.035,
    deepseek: 0.14,
    huggingface: 0,
    ollama: 0,
    lmstudio: 0,
    "openai-compatible": 0,
  };
  const pricePerM = PRICES[provider] ?? 0;
  return (tokens / 1_000_000) * pricePerM;
}

export function AIAnalyticsPanel() {
  const { stats, lastResult, isGenerating, selectedProduct, contentType = "facebook_post" } = useStudioStore();

  const cost = stats ? estimateCost(stats.tokens, stats.provider) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-primary" />
          <h2 className="font-semibold text-sm">AI Analytics</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-3">

          {/* Generation status */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="size-3.5 text-primary" />
              <span className="text-xs font-semibold">Generation Status</span>
            </div>
            <div className="space-y-1.5">
              {isGenerating ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-yellow-400 animate-pulse" />
                    <span className="text-[11px] text-yellow-600 font-medium">
                      Đang tạo nội dung...
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Zap className="size-2.5" />
                    <span>Streaming tokens...</span>
                  </div>
                </>
              ) : lastResult ? (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-green-500" />
                    <span className="text-[11px] text-green-600 font-medium">
                      Thành công
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {lastResult.content.length} ký tự
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-gray-300" />
                    <span className="text-[11px] text-muted-foreground">
                      Chưa có dữ liệu
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Model & Provider */}
          {stats && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Cpu className="size-3 text-muted-foreground" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Model Used
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {stats.model}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {stats.provider}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Tokens */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="size-3 text-muted-foreground" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Tokens
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded border bg-muted/30 p-2 text-center">
                    <p className="text-sm font-bold">{stats.tokens.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">Input + Output</p>
                  </div>
                  <div className="rounded border bg-muted/30 p-2 text-center">
                    <p className="text-sm font-bold">
                      ~{Math.ceil(stats.tokens / 4).toLocaleString()}
                    </p>
                    <p className="text-[9px] text-muted-foreground">Words</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Latency */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="size-3 text-muted-foreground" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Latency
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded border bg-muted/30 p-2 text-center">
                    <p className="text-sm font-bold">{stats.latency_ms}ms</p>
                    <p className="text-[9px] text-muted-foreground">Total time</p>
                  </div>
                  <div className="rounded border bg-muted/30 p-2 text-center">
                    <p className="text-sm font-bold">
                      ~{Math.round(stats.tokens / (stats.latency_ms / 1000))}/s
                    </p>
                    <p className="text-[9px] text-muted-foreground">Tokens/sec</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Cost */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="size-3 text-muted-foreground" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Cost Estimate
                  </span>
                </div>
                <div className="rounded border bg-muted/30 p-2">
                  <p className="text-sm font-bold">
                    {cost > 0 ? `$${cost.toFixed(4)}` : "Miễn phí"}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {cost > 0
                      ? `${stats.provider} ~${
                          {
                            openai: "$0.15/M tokens",
                            gemini: "$0.035/M tokens",
                            deepseek: "$0.14/M tokens",
                          }[stats.provider] || ""
                        }`
                      : "Local / Free provider"}
                  </p>
                </div>
              </div>
            </>
          )}

          {!stats && !isGenerating && (
            <div className="text-center py-6 space-y-2">
              <BarChart3 className="size-8 text-muted-foreground/20 mx-auto" />
              <p className="text-xs text-muted-foreground">
                Chưa có dữ liệu analytics
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                Bấm &quot;Tạo nội dung&quot; để xem thống kê
              </p>
            </div>
          )}

          {/* Session info */}
          {selectedProduct && (
            <>
              <Separator />
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Session
                </span>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Sản phẩm</span>
                    <span className="font-medium">
                      {selectedProduct.name.length > 20
                        ? selectedProduct.name.slice(0, 20) + "..."
                        : selectedProduct.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Content type</span>
                    <Badge variant="secondary" className="text-[9px] py-0">
                      {contentType}
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
