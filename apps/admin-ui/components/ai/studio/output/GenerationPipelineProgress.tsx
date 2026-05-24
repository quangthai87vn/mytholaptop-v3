"use client";

import { CheckCircle2, Loader2, Circle, Sparkles } from "lucide-react";
import type { PipelineStage, GenerationStatus } from "@/store/ai-studio-store";

const PIPELINE_STEPS: Array<{
  key: PipelineStage;
  label: string;
  icon: "product" | "prompt" | "write" | "hooks" | "cta" | "seo" | "hashtags";
}> = [
  { key: "analyzing", label: "Phân tích sản phẩm", icon: "product" },
  { key: "building_prompt", label: "Xây dựng prompt", icon: "prompt" },
  { key: "writing_main", label: "Viết nội dung", icon: "write" },
  { key: "writing_hooks", label: "Tạo hooks", icon: "hooks" },
  { key: "writing_cta", label: "Viết CTA", icon: "cta" },
  { key: "writing_seo", label: "Tối ưu SEO", icon: "seo" },
  { key: "writing_hashtags", label: "Tạo hashtags", icon: "hashtags" },
];

const STAGE_INDEX: Record<PipelineStage, number> = {
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

function StepIcon({ icon, state }: { icon: string; state: "completed" | "running" | "pending" }) {
  if (state === "completed") {
    return <CheckCircle2 className="size-4 text-emerald-500 dark:text-emerald-400" />;
  }
  if (state === "running") {
    return <Loader2 className="size-4 text-primary animate-spin" />;
  }

  const dotColors: Record<string, string> = {
    product: "bg-blue-400",
    prompt: "bg-violet-400",
    write: "bg-primary/60",
    hooks: "bg-amber-400",
    cta: "bg-red-400",
    seo: "bg-green-400",
    hashtags: "bg-pink-400",
  };

  return (
    <div className="relative">
      <div className="size-4 rounded-full bg-muted border-2 border-border" />
      <div
        className={`absolute inset-0 rounded-full ${dotColors[icon] || "bg-muted-foreground/30"} opacity-40`}
      />
    </div>
  );
}

interface PipelineStepProps {
  label: string;
  icon: string;
  state: "completed" | "running" | "pending";
  index: number;
  total: number;
}

function PipelineStep({ label, icon, state, index, total }: PipelineStepProps) {
  const isLast = index === total - 1;
  const lineColor =
    state === "completed"
      ? "bg-emerald-400"
      : state === "running"
      ? "bg-gradient-to-r from-primary/50 to-border"
      : "bg-border";

  return (
    <div className="flex items-center">
      <div className="flex flex-col items-center">
        {/* Icon circle */}
        <div
          className={`
            relative flex items-center justify-center size-10 rounded-2xl border-2 transition-all duration-500
            ${state === "completed" ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-700" : ""}
            ${state === "running" ? "bg-primary/10 border-primary dark:bg-primary/20 shadow-lg shadow-primary/10" : ""}
            ${state === "pending" ? "bg-muted/50 border-border dark:bg-muted/20" : ""}
          `}
        >
          <StepIcon icon={icon} state={state} />
          {state === "running" && (
            <span className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-ping" />
          )}
        </div>

        {/* Label */}
        <div className="mt-2 text-center max-w-[70px]">
          <p
            className={`text-[10px] font-medium leading-tight transition-colors duration-300 ${
              state === "completed" ? "text-emerald-600 dark:text-emerald-400" : ""
            } ${state === "running" ? "text-primary font-semibold" : ""} ${
              state === "pending" ? "text-muted-foreground/50" : ""
            }`}
          >
            {label}
          </p>
        </div>
      </div>

      {/* Connector line */}
      {!isLast && (
        <div className="mx-1 pt-[-20px]">
          <div className={`h-0.5 w-8 rounded-full transition-colors duration-500 ${lineColor}`} />
        </div>
      )}
    </div>
  );
}

interface GenerationPipelineProgressProps {
  stage: PipelineStage;
  status: GenerationStatus;
}

export function GenerationPipelineProgress({ stage, status }: GenerationPipelineProgressProps) {
  const isDone = status === "completed" || stage === "done";
  const isRunning =
    status === "streaming" ||
    status === "generating" ||
    status === "resolving" ||
    status === "finalizing";

  const currentIdx = STAGE_INDEX[stage] ?? -1;

  return (
    <div className="flex items-start justify-center">
      <div className="flex items-center gap-0">
        {PIPELINE_STEPS.map((step, i) => {
          const isCompleted = i < currentIdx || isDone;
          const isRunningStep = i === currentIdx && isRunning && !isDone;

          const state = isCompleted ? "completed" : isRunningStep ? "running" : "pending";

          return (
            <PipelineStep
              key={step.key}
              label={step.label}
              icon={step.icon}
              state={state}
              index={i}
              total={PIPELINE_STEPS.length}
            />
          );
        })}
      </div>
    </div>
  );
}
