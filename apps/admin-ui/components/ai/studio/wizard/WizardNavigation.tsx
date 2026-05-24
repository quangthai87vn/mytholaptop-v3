"use client";

import { ArrowLeft, ArrowRight, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudioStore, WIZARD_STEP_ORDER } from "@/store/ai-studio-store";

interface WizardNavigationProps {
  className?: string;
  showGenerate?: boolean;
  onGenerate?: () => void;
  isGenerating?: boolean;
  /** Disable the next/generate button. Use for Step 1 when no product selected. */
  canProceed?: boolean;
  /** Compact mode hides the reset button for the sticky top bar. */
  compact?: boolean;
}

export function WizardNavigation({
  className,
  showGenerate,
  onGenerate,
  isGenerating,
  canProceed = true,
  compact = false,
}: WizardNavigationProps) {
  const wizardStep = useStudioStore((s) => s.wizardStep);
  const goToNextStep = useStudioStore((s) => s.goToNextStep);
  const goToPrevStep = useStudioStore((s) => s.goToPrevStep);
  const resetStudio = useStudioStore((s) => s.resetStudio);

  const currentIdx = WIZARD_STEP_ORDER.indexOf(wizardStep);
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === WIZARD_STEP_ORDER.length - 1;

  return (
    <div className={`flex items-center justify-between gap-2 ${className || ""}`}>
      {/* Back */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 px-3 text-xs"
        disabled={isFirst || isGenerating}
        onClick={goToPrevStep}
      >
        <ArrowLeft className="size-3" />
        {!compact && <span>Quay lại</span>}
      </Button>

      {/* Center: reset — hidden in compact mode */}
      {!compact && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-[11px] text-muted-foreground hover:text-destructive gap-1"
          onClick={() => {
            if (confirm("Bạn có chắc muốn bắt đầu lại từ đầu?")) {
              resetStudio();
            }
          }}
        >
          <RotateCcw className="size-3" />
          Bắt đầu lại
        </Button>
      )}

      {/* Next / Generate */}
      {isLast && showGenerate ? (
        <Button
          size="sm"
          className="h-8 gap-1.5 px-4 text-xs font-semibold shadow-sm"
          disabled={isGenerating || !canProceed}
          onClick={onGenerate}
        >
          {isGenerating ? (
            <>
              <Sparkles className="size-3 animate-pulse" />
              AI đang viết...
            </>
          ) : (
            <>
              <Sparkles className="size-3" />
              Tạo nội dung
            </>
          )}
        </Button>
      ) : (
        !isLast && (
          <Button
            size="sm"
            className="h-8 gap-1.5 px-4 text-xs font-semibold shadow-sm"
            disabled={!canProceed}
            onClick={goToNextStep}
          >
            Tiếp theo
            <ArrowRight className="size-3" />
          </Button>
        )
      )}
    </div>
  );
}
