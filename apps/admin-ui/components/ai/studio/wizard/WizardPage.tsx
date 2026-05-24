"use client";

import { useCallback } from "react";
import { useGeneration } from "@/hooks/use-ai-generation";
import { useStudioStore, CONTENT_TYPE_LABELS } from "@/store/ai-studio-store";
import { WizardStepIndicator } from "./WizardStepIndicator";
import { WizardNavigation } from "./WizardNavigation";
import { ProductStep } from "./ProductStep";
import { RoutingStep } from "./RoutingStep";
import { PromptPreviewStep } from "./PromptPreviewStep";
import { GenerateStep } from "./GenerateStep";
import { ReviewStep } from "./ReviewStep";

export function WizardPage() {
  const wizardStep = useStudioStore((s) => s.wizardStep);
  const generationStatus = useStudioStore((s) => s.generationStatus);
  const selectedProduct = useStudioStore((s) => s.selectedProduct);
  const contentType = useStudioStore((s) => s.contentType);
  const { generate } = useGeneration();

  const isGenerating =
    generationStatus === "resolving" ||
    generationStatus === "generating" ||
    generationStatus === "streaming" ||
    generationStatus === "finalizing";

  const handleGenerate = useCallback(async () => {
    await generate();
  }, [generate]);

  const renderStep = () => {
    switch (wizardStep) {
      case "product":
        return <ProductStep />;
      case "routing":
        return <RoutingStep />;
      case "preview":
        return <PromptPreviewStep />;
      case "generate":
        return <GenerateStep onGenerate={handleGenerate} />;
      case "review":
        return <ReviewStep />;
      default:
        return <ProductStep />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Stepper indicator */}
      <div className="shrink-0 border-b bg-card/50">
        <div className="px-6 pt-4 pb-2">
          <WizardStepIndicator />
        </div>

        {/* Sticky top action bar */}
        <div className="sticky top-0 z-20 px-5 py-2.5 bg-white/95 backdrop-blur-sm border-t border-b border-border shadow-sm">
          <div className="flex items-center justify-between gap-3">
            {/* Left: step title */}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {wizardStep === "product" && "Chọn sản phẩm"}
                {wizardStep === "routing" && "Cấu hình AI"}
                {wizardStep === "preview" && "Xem trước prompt"}
                {wizardStep === "generate" && "Tạo nội dung"}
                {wizardStep === "review" && "Hoàn tất"}
              </p>
              {/* Center: selection summary */}
              {wizardStep === "product" && selectedProduct && (
                <p className="text-[10px] text-muted-foreground truncate">
                  Đã chọn: {selectedProduct.name}
                </p>
              )}
              {wizardStep === "routing" && contentType && (
                <p className="text-[10px] text-muted-foreground truncate">
                  {CONTENT_TYPE_LABELS[contentType] || contentType}
                </p>
              )}
            </div>

            {/* Right: nav buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <WizardNavigation
                showGenerate={wizardStep === "generate"}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                canProceed={wizardStep !== "product" || !!selectedProduct}
                compact
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {renderStep()}
      </div>
    </div>
  );
}
