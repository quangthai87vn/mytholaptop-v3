"use client";

import { CheckCircle2, Loader2, Circle } from "lucide-react";
import type { PipelineStage, GenerationStatus } from "@/store/ai-studio-store";

const PIPELINE_STEPS: Array<{
  key: PipelineStage;
  label: string;
  shortLabel: string;
}> = [
  { key: "analyzing", label: "Phân tích sản phẩm", shortLabel: "Phân tích" },
  { key: "building_prompt", label: "Xây dựng prompt", shortLabel: "Prompt" },
  { key: "writing_main", label: "Viết nội dung", shortLabel: "Nội dung" },
  { key: "writing_hooks", label: "Tạo hooks", shortLabel: "Hooks" },
  { key: "writing_cta", label: "Viết CTA", shortLabel: "CTA" },
  { key: "writing_seo", label: "Tối ưu SEO", shortLabel: "SEO" },
  { key: "writing_hashtags", label: "Tạo hashtags", shortLabel: "Hashtags" },
];

const PIPELINE_STAGE_INDEX: Record<PipelineStage, number> = {
  idle: -1,
  resolving: 0,
  analyzing: 0,
  building_prompt: 1,
  writing_main: 2,
  writing_hooks: 3,
  writing_cta: 4,
  writing_seo: 5,
  writing_hashtags: 6,
  finalizing: 7,
  done: 8,
};

function Step({
  label,
  shortLabel,
  state,
}: {
  label: string;
  shortLabel: string;
  state: "pending" | "running" | "completed";
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`
          relative flex items-center justify-center size-8 rounded-full border-2 transition-all duration-500
          ${state === "completed" ? "bg-emerald-50 border-emerald-400 dark:bg-emerald-950/50 dark:border-emerald-600 scale-105" : ""}
          ${state === "running" ? "bg-primary/10 border-primary dark:bg-primary/20 shadow-lg shadow-primary/20" : ""}
          ${state === "pending" ? "bg-muted/50 border-border dark:bg-muted/30" : ""}
        `}
      >
        {state === "completed" ? (
          <CheckCircle2 className="size-4 text-emerald-500 dark:text-emerald-400" />
        ) : state === "running" ? (
          <Loader2 className="size-4 text-primary animate-spin" />
        ) : (
          <Circle className="size-2.5 text-muted-foreground/30" />
        )}

        {state === "running" && (
          <span className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
        )}
      </div>
      <span
        className={`
          text-[10px] font-medium whitespace-nowrap transition-colors duration-300
          ${state === "completed" ? "text-emerald-600 dark:text-emerald-400" : ""}
          ${state === "running" ? "text-primary font-semibold" : ""}
          ${state === "pending" ? "text-muted-foreground/40" : ""}
        `}
      >
        {shortLabel}
      </span>
    </div>
  );
}

export function GenerationProgressSteps({
  stage,
  status,
}: {
  stage: PipelineStage;
  status: GenerationStatus;
}) {
  const isDone = status === "completed" || stage === "done";
  const isRunning =
    status === "streaming" ||
    status === "generating" ||
    status === "resolving" ||
    status === "finalizing";

  const currentIdx = PIPELINE_STAGE_INDEX[stage] ?? -1;

  return (
    <div className="flex flex-wrap items-start justify-center sm:justify-start gap-0 px-1">
      {PIPELINE_STEPS.map((step, i) => {
        const isCompleted = i < currentIdx || isDone;
        const isRunningStep = i === currentIdx && isRunning && !isDone;

        return (
          <div key={step.key} className="flex items-start">
            <Step
              label={step.label}
              shortLabel={step.shortLabel}
              state={
                isCompleted
                  ? "completed"
                  : isRunningStep
                  ? "running"
                  : "pending"
              }
            />
            {i < PIPELINE_STEPS.length - 1 && (
              <div className="hidden sm:flex items-center gap-0 pt-5">
                <div
                  className={`h-0.5 w-8 rounded-full transition-colors duration-500 ${
                    i < currentIdx || isDone
                      ? "bg-emerald-400 dark:bg-emerald-600"
                      : "bg-border"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
