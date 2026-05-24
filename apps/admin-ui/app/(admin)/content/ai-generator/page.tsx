"use client";

import { WizardPage } from "@/components/ai/studio/wizard/WizardPage";

export default function AIStudioPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <WizardPage />
    </div>
  );
}
