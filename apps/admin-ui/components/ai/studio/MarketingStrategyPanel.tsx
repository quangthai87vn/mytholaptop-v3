"use client";

import { useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Layers,
  Target,
  TrendingUp,
  Zap,
  Check,
} from "lucide-react";
import { useStudioStore, type StudioContentType } from "@/store/ai-studio-store";

const CONTENT_TYPES: { value: StudioContentType; label: string; icon: string; desc: string }[] = [
  { value: "facebook_post", label: "Bài viết Facebook", icon: "📘", desc: "Post, Reel, Story" },
  { value: "seo_article", label: "Bài viết SEO Website", icon: "🔍", desc: "Blog, tin tức" },
  { value: "video_script", label: "Kịch bản Video", icon: "🎬", desc: "TikTok, YouTube Shorts" },
  { value: "image_prompt", label: "Prompt Hình ảnh", icon: "🖼️", desc: "AI image generation" },
  { value: "zalo_message", label: "Tin nhắn Zalo", icon: "💬", desc: "ZNS, tin nhắn" },
];

const PLATFORMS = [
  { value: "facebook", label: "Facebook", color: "bg-blue-500" },
  { value: "tiktok", label: "TikTok", color: "bg-pink-500" },
  { value: "website", label: "Website", color: "bg-gray-600" },
  { value: "zalo", label: "Zalo", color: "bg-blue-400" },
  { value: "youtube", label: "YouTube", color: "bg-red-500" },
] as const;

const GOALS = [
  { value: "branding", label: "Branding", desc: "Xây dựng thương hiệu", icon: "🏷️" },
  { value: "conversion", label: "Conversion", desc: "Thúc đẩy mua hàng", icon: "💰" },
  { value: "seo", label: "SEO", desc: "Tối ưu Google ranking", icon: "📈" },
  { value: "viral", label: "Viral", desc: "Tăng share, engagement", icon: "🚀" },
] as const;

const FUNNELS = [
  { value: "awareness", label: "Awareness", desc: "Gây nhận biết", color: "text-blue-600" },
  { value: "consideration", label: "Consideration", desc: "Cân nhắc, so sánh", color: "text-amber-600" },
  { value: "conversion", label: "Conversion", desc: "Thúc đẩy quyết định", color: "text-green-600" },
] as const;

export function MarketingStrategyPanel() {
  const {
    contentType = "facebook_post",
    platforms = [],
    marketingGoal = "conversion",
    funnelStage = "consideration",
    setContentType,
    togglePlatform,
    setMarketingGoal,
    setFunnelStage,
  } = useStudioStore();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <h2 className="font-semibold text-sm">Marketing Strategy</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-4">

          {/* Content Type */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Zap className="size-3" />
              Loại nội dung
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {CONTENT_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  onClick={() => setContentType(ct.value)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                    contentType === ct.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <span className="text-base leading-none">{ct.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-tight">{ct.label}</p>
                    <p className="text-[10px] text-muted-foreground">{ct.desc}</p>
                  </div>
                  {contentType === ct.value && (
                    <Check className="size-3.5 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Platform */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Target className="size-3" />
              Nền tảng
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => {
                const active = platforms.includes(p.value as any);
                return (
                  <button
                    key={p.value}
                    onClick={() => togglePlatform(p.value as any)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/40 hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${active ? p.color : "bg-gray-300"}`} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Marketing Goal */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <TrendingUp className="size-3" />
              Mục tiêu
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {GOALS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setMarketingGoal(g.value as any)}
                  className={`flex flex-col items-start gap-0.5 p-2 rounded-lg border text-left transition-all ${
                    marketingGoal === g.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <span className="text-xs">{g.icon}</span>
                  <p className="text-xs font-medium leading-tight">{g.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{g.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Funnel */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Funnel Stage
            </label>
            <div className="flex gap-1">
              {FUNNELS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFunnelStage(f.value as any)}
                  className={`flex-1 flex flex-col items-center gap-0.5 p-2 rounded-lg border text-center transition-all ${
                    funnelStage === f.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <p className={`text-xs font-bold ${funnelStage === f.value ? f.color : "text-muted-foreground"}`}>
                    {f.label}
                  </p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{f.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Strategy summary */}
          <div className="rounded-lg bg-muted/50 p-2.5 space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Strategy Summary
            </p>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Nội dung</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {CONTENT_TYPES.find((c) => c.value === contentType)?.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Nền tảng</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {platforms.join(", ")}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Mục tiêu</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {GOALS.find((g) => g.value === marketingGoal)?.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Funnel</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {FUNNELS.find((f) => f.value === funnelStage)?.label}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
