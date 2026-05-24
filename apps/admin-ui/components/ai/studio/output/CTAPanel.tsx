"use client";

import { MousePointer2 } from "lucide-react";

interface CTAPanelProps {
  cta: string;
  productName?: string;
  onCopy?: () => void;
}

export function CTAPanel({ cta, productName, onCopy }: CTAPanelProps) {
  if (!cta) return null;

  return (
    <div className="group">
      <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-5 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="size-6 rounded-lg bg-primary/15 flex items-center justify-center">
            <MousePointer2 className="size-3.5 text-primary" />
          </div>
          <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">
            Call to Action
          </span>
        </div>

        {/* CTA Text */}
        <div className="relative">
          <p className="text-base font-bold text-foreground leading-snug">{cta}</p>
        </div>

        {/* Store badge */}
        {productName && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="size-1.5 rounded-full bg-primary/40" />
            <span className="text-[10px] text-primary/60 font-medium">{productName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
