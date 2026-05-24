"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, value, defaultValue, onValueChange, min = 0, max = 100, step = 1, disabled }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue ?? [min]);
    const currentValue = value ?? internalValue;
    const val = currentValue[0] ?? min;

    const percentage = Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVal = parseFloat(e.target.value);
      if (value === undefined) {
        setInternalValue([newVal]);
      }
      onValueChange?.([newVal]);
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
      >
        <div className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
          <div
            className="absolute h-full bg-primary"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={val}
          onChange={handleChange}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors"
          style={{ left: `${percentage}%`, transform: "translate(-50%, -50%)" }}
        />
      </div>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };
