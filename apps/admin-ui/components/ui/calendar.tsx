import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = {
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  mode?: "single"
  initialFocus?: boolean
  locale?: Locale
  className?: string
  disabled?: boolean
  disablePastDates?: boolean
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

interface Locale {
  format?: (date: Date, format: string) => string;
}

export function Calendar({
  selected,
  onSelect,
  locale,
  className,
  disablePastDates = false,
  ...props
}: CalendarProps) {
  const today = new Date();
  const [viewDate, setViewDate] = React.useState(selected ?? today);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const monthName = viewDate.toLocaleString("vi-VN", { month: "long", year: "numeric" });

  const formatDay = (day: number) => {
    const date = new Date(year, month, day);
    return locale
      ? locale.format?.(date, "d")
      : date.getDate().toString();
  };

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      selected &&
      day === selected.getDate() &&
      month === selected.getMonth() &&
      year === selected.getFullYear()
    );
  };

  const isPast = (day: number) => {
    const d = new Date(year, month, day);
    return d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to 7 columns
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className={cn("p-3 select-none", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className={cn(buttonVariants({ variant: "ghost" }), "h-7 w-7 p-0 opacity-50 hover:opacity-100")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium capitalize">{monthName}</span>
        <button
          type="button"
          onClick={nextMonth}
          className={cn(buttonVariants({ variant: "ghost" }), "h-7 w-7 p-0 opacity-50 hover:opacity-100")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="h-8 flex items-center justify-center text-xs text-muted-foreground font-normal"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }
          const disabled = disablePastDates && isPast(day) && !isSelected(day);
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => onSelect?.(new Date(year, month, day))}
              className={cn(
                "h-8 w-8 text-sm rounded-md font-normal transition-colors",
                isSelected(day)
                  ? "bg-primary text-primary-foreground hover:bg-primary"
                  : isToday(day)
                  ? "bg-accent text-accent-foreground hover:bg-accent/80"
                  : "hover:bg-accent hover:text-accent-foreground",
                disabled && "text-muted-foreground opacity-50 cursor-not-allowed hover:bg-transparent"
              )}
            >
              {formatDay(day)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
