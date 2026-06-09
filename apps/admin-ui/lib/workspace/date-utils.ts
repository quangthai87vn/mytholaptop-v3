/**
 * Shared date utilities for Workspace module.
 * Ensures all dates are stored/transmitted in ISO 8601 format.
 */

/**
 * Converts a date value to a YYYY-MM-DD string (date-only), or null if empty/invalid.
 * This is the canonical storage format for date-only fields (start_date, due_date).
 * Handles three input types safely without timezone shift:
 *   - Date object         → extracts local YYYY-MM-DD
 *   - ISO string (full)   → parses as local date to avoid UTC roll-back
 *   - YYYY-MM-DD string   → returns as-is if already valid
 * Returns: "2026-06-03" or null
 */
export function toDateOnlyString(date: string | Date | null | undefined): string | null {
  if (!date) return null;

  if (date instanceof Date) {
    if (isNaN(date.getTime())) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const s = String(date).trim();
  if (!s) return null;

  // Already YYYY-MM-DD — validate without parsing through Date constructor
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    const test = new Date(y, m - 1, d);
    if (isNaN(test.getTime())) return null;
    return s;
  }

  // Full ISO timestamp — parse as local date to avoid UTC midnight roll-back
  const parsed = new Date(s);
  if (isNaN(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** @deprecated Use toDateOnlyString instead. Kept for backward compatibility. */
export function toISOStringOrNull(date: string | Date | null | undefined): string | null {
  return toDateOnlyString(date);
}

/**
 * Renders a human-readable deadline label for task cards.
 * Returns null if no due date.
 * Never returns negative values — completed tasks show completion info instead.
 *
 * @param dueDate   - ISO date string (YYYY-MM-DD) or full timestamp
 * @param taskStatus - current task status (default "working")
 * @param today     - reference date (defaults to now, can be injected for testing)
 */
export function getTaskDeadlineLabel(
  dueDate: string | null | undefined,
  taskStatus: string = "working",
  today: Date = new Date()
): { label: string; overdue: boolean; urgent: boolean } | null {
  if (!dueDate) return null;

  const due = /^\d{4}-\d{2}-\d{2}$/.test(dueDate)
    ? (() => {
        const [y, m, d] = dueDate.split("-").map(Number);
        return new Date(y, m - 1, d, 12, 0, 0);
      })()
    : new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const todayNorm = new Date(today);
  todayNorm.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - todayNorm.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const isCompleted = taskStatus === "completed" || taskStatus === "cancelled";
  const overdue = diffDays < 0 && !isCompleted;

  if (isCompleted) return null;

  if (overdue) {
    return { label: `quá ${Math.abs(diffDays)} ngày`, overdue: true, urgent: true };
  }
  if (diffDays === 0) {
    return { label: "hôm nay", overdue: false, urgent: true };
  }
  if (diffDays === 1) {
    return { label: "ngày mai", overdue: false, urgent: true };
  }
  if (diffDays <= 3) {
    return { label: `còn ${diffDays} ngày`, overdue: false, urgent: true };
  }
  return { label: `còn ${diffDays} ngày`, overdue: false, urgent: false };
}

/**
 * Formats a date string for display in date inputs (YYYY-MM-DD).
 * Also used by DatePicker output.
 */
export function toInputDateString(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  try {
    if (dateStr instanceof Date) {
      if (isNaN(dateStr.getTime())) return "";
      const y = dateStr.getFullYear();
      const m = String(dateStr.getMonth() + 1).padStart(2, "0");
      const d = String(dateStr.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    const s = String(dateStr).trim();
    if (!s) return "";
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

/**
 * Formats a date string for Vietnamese display (dd/MM/yyyy).
 */
export function formatDisplayDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}
