"use client";

import * as React from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toDateOnlyString, toInputDateString } from "@/lib/workspace/date-utils";

interface DatePickerProps {
  value?: string | null;
  onChange?: (date: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  disablePastDates?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Chọn ngày",
  className,
  disabled = false,
  disablePastDates = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Parse YYYY-MM-DD or ISO string into a Date in local time
  // We reconstruct manually to avoid JS Date timezone shift
  const parseLocalDate = (val: string): Date | undefined => {
    if (!val) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split("-").map(Number);
      return new Date(y, m - 1, d, 12, 0, 0); // noon to avoid UTC rollover
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d;
  };

  const selectedDate = parseLocalDate(value ?? "");

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange?.(toDateOnlyString(date));
    } else {
      onChange?.(null);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(null);
  };

  const displayText = value
    ? (() => {
        // Always parse as local date to avoid UTC shift
        const local = parseLocalDate(value);
        if (local) {
          return local.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        }
        return toInputDateString(value);
      })()
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-start text-left font-normal h-9 px-3",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          type="button"
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-slate-400 shrink-0" />
          {displayText ? (
            <span className="text-sm">{displayText}</span>
          ) : (
            <span className="text-sm">{placeholder}</span>
          )}
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClear(e as unknown as React.MouseEvent); }}
              className="ml-auto p-0.5 rounded hover:bg-slate-100 cursor-pointer"
            >
              <X className="h-3 w-3 text-slate-400" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
          <span className="text-xs text-slate-500">
            {new Date().toLocaleDateString("vi-VN", {
              month: "long",
              year: "numeric",
            })}
          </span>
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Xóa
            </button>
          )}
        </div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
          disablePastDates={disablePastDates}
        />
      </PopoverContent>
    </Popover>
  );
}
