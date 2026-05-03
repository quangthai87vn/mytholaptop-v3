"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface RadioGroupProps extends React.ComponentPropsWithoutRef<"div"> {
  value?: string;
  onValueChange?: (value: string) => void;
}

const RadioGroup = React.forwardRef<
  React.ElementRef<"div">,
  RadioGroupProps
>(({ className, value, onValueChange, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="radiogroup"
      className={cn("space-y-2", className)}
      {...props}
    />
  );
});
RadioGroup.displayName = "RadioGroup";

const RadioGroupItem = React.forwardRef<
  React.ElementRef<"input">,
  React.ComponentPropsWithoutRef<"input"> & {
    indicatorClassName?: string;
  }
>(({ className, indicatorClassName, ...props }, ref) => {
  return (
    <div className="relative flex items-center">
      <input
        type="radio"
        ref={ref}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-full border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          "after:h-2 after:w-2 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity",
          "peer-checked:after:opacity-100"
        )}
      />
    </div>
  );
});
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
