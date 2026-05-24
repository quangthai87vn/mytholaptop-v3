"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Code2,
  Shield,
  Package,
  User,
  Sparkles,
  Copy,
} from "lucide-react";
import { useStudioStore } from "@/store/ai-studio-store";
import { toast } from "sonner";

const PIPELINE_STEPS = [
  { key: "systemPrompt", label: "System Prompt", icon: Code2, color: "text-violet-500" },
  { key: "brandVoice", label: "Brand Voice", icon: Sparkles, color: "text-amber-500" },
  { key: "safetyRules", label: "Safety Rules", icon: Shield, color: "text-red-500" },
  { key: "productContext", label: "Product Context", icon: Package, color: "text-blue-500" },
  { key: "userInput", label: "User Input", icon: User, color: "text-green-500" },
] as const;

export function PromptPipelineViewer() {
  const { promptPipeline, isGenerating } = useStudioStore();
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({});
  const toggleStep = (key: string) => {
    setOpenSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyAll = () => {
    if (!promptPipeline) return;
    const text = [
      "=== SYSTEM PROMPT ===",
      promptPipeline.systemPrompt,
      "",
      "=== BRAND VOICE ===",
      promptPipeline.brandVoice,
      "",
      "=== SAFETY RULES ===",
      ...promptPipeline.safetyRules.map((r, i) => `${i + 1}. ${r}`),
      "",
      "=== PRODUCT CONTEXT ===",
      promptPipeline.productContext,
      "",
      "=== USER INPUT ===",
      promptPipeline.userInput,
      "",
      "=== FINAL PROMPT ===",
      promptPipeline.finalPrompt,
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Đã copy prompt pipeline");
  };

  if (!promptPipeline) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 border-b bg-card">
          <div className="flex items-center gap-2">
            <Code2 className="size-4 text-primary" />
            <h2 className="font-semibold text-sm">Prompt Pipeline</h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground text-center px-4">
            Bấm &quot;Tạo nội dung&quot; để xem prompt pipeline
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-card flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="size-4 text-primary" />
          <h2 className="font-semibold text-sm">Prompt Pipeline</h2>
        </div>
        {promptPipeline && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={copyAll}
          >
            <Copy className="size-3 mr-1" />
            Copy all
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">

          {/* Per-step collapsible */}
          {PIPELINE_STEPS.map(({ key, label, icon: Icon, color }) => {
            if (!promptPipeline) return null;
            const value = promptPipeline[key as keyof typeof promptPipeline];
            if (!value || (Array.isArray(value) && value.length === 0)) return null;

            const isOpen = !!openSteps[key];
            const isArray = Array.isArray(value);
            const displayText = isArray
              ? (value as string[]).map((v, i) => `${i + 1}. ${v}`).join("\n")
              : (value as string);

            return (
              <div key={key} className="rounded">
                <button
                  onClick={() => toggleStep(key)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted/50 transition-colors text-left"
                >
                  <Icon className={`size-3.5 shrink-0 ${color}`} />
                  <span className="text-xs font-medium flex-1">{label}</span>
                  <Badge variant="secondary" className="text-[9px] px-1 mr-1">
                    {isArray ? `${(value as string[]).length} rules` : `${displayText.length} chars`}
                  </Badge>
                  <span className="text-muted-foreground text-xs">{isOpen ? "▾" : "▸"}</span>
                </button>
                {isOpen && (
                  <div className="pl-6 pr-2 pb-1">
                    <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded p-2 font-mono leading-relaxed max-h-32 overflow-y-auto">
                      {displayText}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}

          {/* Final prompt */}
          {promptPipeline?.finalPrompt && (
            <div className="rounded">
              <button
                onClick={() => toggleStep("finalPrompt")}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted/50 transition-colors text-left"
              >
                <Sparkles className="size-3.5 shrink-0 text-primary" />
                <span className="text-xs font-semibold flex-1">Final Prompt</span>
                <Badge variant="default" className="text-[9px] px-1 mr-1">
                  {promptPipeline.finalPrompt.length} chars
                </Badge>
                <span className="text-muted-foreground text-xs">
                  {openSteps.finalPrompt ? "▾" : "▸"}
                </span>
              </button>
              {openSteps.finalPrompt && (
                <div className="pl-6 pr-2 pb-1">
                  <pre className="text-[10px] text-foreground whitespace-pre-wrap bg-primary/5 rounded p-2 font-mono leading-relaxed border border-primary/20 max-h-48 overflow-y-auto">
                    {promptPipeline.finalPrompt}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
