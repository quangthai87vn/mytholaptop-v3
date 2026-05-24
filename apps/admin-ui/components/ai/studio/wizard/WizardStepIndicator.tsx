"use client";

import { Check } from "lucide-react";
import { useStudioStore, WIZARD_STEP_ORDER, WIZARD_STEP_LABELS, type WizardStep } from "@/store/ai-studio-store";

const STEP_ICONS: Record<WizardStep, string> = {
  product: "1",
  routing: "2",
  preview: "3",
  generate: "4",
  review: "5",
};

interface WizardStepIndicatorProps {
  className?: string;
}

export function WizardStepIndicator({ className }: WizardStepIndicatorProps) {
  const wizardStep = useStudioStore((s) => s.wizardStep);
  const currentIdx = WIZARD_STEP_ORDER.indexOf(wizardStep);

  return (
    <div className={className}>
      <div className="flex items-center justify-center gap-0">
        {WIZARD_STEP_ORDER.map((step, i) => {
          const isCompleted = i < currentIdx;
          const isActive = i === currentIdx;
          const isPending = i > currentIdx;

          return (
            <div key={step} className="flex items-center">
              {/* Step node */}
              <button
                onClick={() => {
                  // Allow going back to completed or current steps
                  if (i <= currentIdx) {
                    useStudioStore.getState().setWizardStep(step);
                  }
                }}
                className="flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none"
              >
                {/* Circle */}
                <div
                  className={`relative flex items-center justify-center size-9 rounded-full border-2 transition-all duration-300 ${
                    isCompleted
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                      : isActive
                      ? "bg-primary border-primary text-white shadow-md shadow-primary/30"
                      : "bg-muted/60 border-muted-foreground/20 text-muted-foreground/40"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="size-4 font-bold" strokeWidth={3} />
                  ) : (
                    <span className="text-xs font-bold">{STEP_ICONS[step]}</span>
                  )}
                  {isActive && (
                    <span className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping" />
                  )}
                </div>
                {/* Label */}
                <span
                  className={`text-[10px] font-medium whitespace-nowrap transition-colors ${
                    isCompleted
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isActive
                      ? "text-primary font-semibold"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {WIZARD_STEP_LABELS[step]}
                </span>
              </button>

              {/* Connector */}
              {i < WIZARD_STEP_ORDER.length - 1 && (
                <div
                  className={`h-[2px] w-8 sm:w-12 mx-1 rounded-full transition-colors duration-500 mb-5 ${
                    isCompleted
                      ? "bg-emerald-400 dark:bg-emerald-600"
                      : "bg-border dark:bg-muted"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
