/**
 * Workspace Master Data Helpers — Dynamic Kanban Columns & Form Options
 *
 * All Kanban columns, task form dropdowns, and status labels are driven
 * by pm_master_data instead of hardcoded values.
 */

import type { MasterDataItem } from "@/lib/workspace/types-master-data";

// ── Column config derived from master data ──────────────────────────────

export interface KanbanColumnConfig {
  id: string;
  title: string;
  color: string;
  bg: string;
  border: string;
  headerBg: string;
}

/** Build hex from a MasterDataItem — supports color, bg_color, column_bg_color, column_border_color */
function hexColor(val: string | null | undefined, fallback: string): string {
  return val && val.trim() ? val.trim() : fallback;
}

/** Derive Tailwind bg class from a hex color for column backgrounds */
function hexToBg(hex: string): string {
  const h = hex.replace("#", "");
  // Map to common Tailwind shades — use neutral as safe fallback
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return "bg-slate-50";
  // Pick a Tailwind shade based on lightness
  const lightness = (r * 299 + g * 587 + b * 114) / 1000;
  if (lightness < 60) return "bg-slate-700";
  if (lightness < 100) return "bg-slate-500";
  if (lightness < 140) return "bg-slate-400";
  if (lightness < 180) return "bg-slate-300";
  if (lightness < 220) return "bg-slate-200";
  if (lightness < 255) return "bg-slate-100";
  return "bg-white";
}

/**
 * Build Kanban column configs from task_status master data items.
 * - Only active items are included
 * - Sorted by sort_order asc, then name asc for stable display
 * - Uses color + bg_color for UI; falls back to sensible defaults
 */
export function buildKanbanColumns(
  items: MasterDataItem[]
): KanbanColumnConfig[] {
  if (!items || items.length === 0) return [];

  return items
    .filter((item) => item.is_active)
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name, "vi");
    })
    .map((item) => {
      const color = hexColor(item.color, "#6b7280");
      const bg = hexColor(item.bg_color, "#f3f4f6");
      const border = hexColor(item.column_border_color, color);
      const headerBg = hexColor(item.column_bg_color, bg);

      return {
        id: item.code,
        title: item.name,
        color,
        bg,
        border,
        headerBg,
      };
    });
}

// ── Form option helpers ─────────────────────────────────────────────────

export interface FormOption {
  code: string;
  name: string;
  color: string;
}

/** Normalize MasterDataItem[] to FormOption[] */
export function toFormOptions(items: MasterDataItem[]): FormOption[] {
  if (!items || items.length === 0) return [];
  return items
    .filter((item) => item.is_active)
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name, "vi");
    })
    .map((item) => ({
      code: item.code,
      name: item.name,
      color: item.color ?? "#6b7280",
    }));
}

// ── Default status fallback ──────────────────────────────────────────────

/** Return the first active status code by sort_order, or "idea" as last resort */
export function defaultStatusCode(
  items: MasterDataItem[],
  fallback = "idea"
): string {
  if (!items || items.length === 0) return fallback;
  const active = items.filter((i) => i.is_active);
  if (active.length === 0) return fallback;
  return active
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name, "vi");
    })[0].code;
}
