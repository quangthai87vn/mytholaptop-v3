"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import type { CalendarFilters } from "@/lib/workspace/types-calendar";
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface CalendarFilterPanelProps {
  filters: CalendarFilters;
  onChange: (f: CalendarFilters) => void;
  staffOptions?: Array<{ id: string; name: string }>;
  projectOptions?: Array<{ id: string; name: string }>;
  campaignOptions?: Array<{ id: string; name: string }>;
  taskTypeOptions?: Array<{ code: string; name: string; color?: string }>;
  statusOptions?: Array<{ code: string; name: string; color?: string }>;
  platformOptions?: Array<{ code: string; name: string; color?: string }>;
}

function hasActiveFilters(f: CalendarFilters): boolean {
  return !!(
    (f.platforms?.length ?? 0) > 0 ||
    (f.assignees?.length ?? 0) > 0 ||
    (f.taskTypes?.length ?? 0) > 0 ||
    (f.workflowStages?.length ?? 0) > 0 ||
    (f.projectIds?.length ?? 0) > 0 ||
    (f.campaignIds?.length ?? 0) > 0 ||
    f.dateFrom ||
    f.dateTo ||
    f.overdue ||
    f.pendingApproval ||
    f.completed ||
    f.showProductionDeadline === false ||
    f.showPublishSchedule === false ||
    f.showCampaignDeadline === false
  );
}

function activeFilterCount(f: CalendarFilters): number {
  let count = 0;
  if ((f.platforms?.length ?? 0) > 0) count++;
  if ((f.assignees?.length ?? 0) > 0) count++;
  if ((f.taskTypes?.length ?? 0) > 0) count++;
  if ((f.workflowStages?.length ?? 0) > 0) count++;
  if ((f.projectIds?.length ?? 0) > 0) count++;
  if ((f.campaignIds?.length ?? 0) > 0) count++;
  if (f.dateFrom || f.dateTo) count++;
  if (f.overdue) count++;
  if (f.pendingApproval) count++;
  if (f.completed) count++;
  return count;
}

export function CalendarFilterPanel({
  filters,
  onChange,
  staffOptions = [],
  projectOptions = [],
  campaignOptions = [],
  taskTypeOptions = [],
  statusOptions = [],
  platformOptions = [],
}: CalendarFilterPanelProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const count = activeFilterCount(filters);

  const clearAll = useCallback(() => {
    onChange({});
  }, [onChange]);

  const setAssignees = (ids: string[]) => {
    onChange({ ...filters, assignees: ids.length ? ids : undefined });
  };

  const setProjects = (ids: string[]) => {
    onChange({ ...filters, projectIds: ids.length ? ids : undefined });
  };

  const setCampaigns = (ids: string[]) => {
    onChange({ ...filters, campaignIds: ids.length ? ids : undefined });
  };

  const setTaskTypes = (codes: string[]) => {
    onChange({ ...filters, taskTypes: codes.length ? codes : undefined });
  };

  const setStatuses = (codes: string[]) => {
    onChange({ ...filters, workflowStages: codes.length ? codes : undefined });
  };

  const setPlatforms = (codes: string[]) => {
    onChange({ ...filters, platforms: codes.length ? codes : undefined });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Filter toggle button */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={count > 0 ? "default" : "outline"}
            size="sm"
            className={cn("h-8 gap-1.5", count > 0 && "bg-primary text-white border-primary")}
          >
            <SlidersHorizontal className="size-3.5" />
            Bộ lọc
            {count > 0 && (
              <span className="ml-0.5 size-5 rounded-full bg-white/20 text-[11px] font-bold flex items-center justify-center">
                {count}
              </span>
            )}
            <ChevronDown className="size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[340px] p-0" align="start" side="bottom" sideOffset={4}>
          <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Bộ lọc</h3>
              {count > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={clearAll}>
                  <X className="size-3" />
                  Xoá tất cả
                </Button>
              )}
            </div>

            {/* Event type toggles */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-500">Loại sự kiện</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => onChange({ ...filters, showProductionDeadline: filters.showProductionDeadline === false ? undefined : false })}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                    filters.showProductionDeadline === false
                      ? "bg-slate-100 text-slate-400 border-slate-200"
                      : "bg-orange-100 text-orange-700 border-orange-200"
                  )}
                >
                  Deadline
                </button>
                <button
                  onClick={() => onChange({ ...filters, showPublishSchedule: filters.showPublishSchedule === false ? undefined : false })}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                    filters.showPublishSchedule === false
                      ? "bg-slate-100 text-slate-400 border-slate-200"
                      : "bg-blue-100 text-blue-700 border-blue-200"
                  )}
                >
                  Đăng bài
                </button>
                <button
                  onClick={() => onChange({ ...filters, showCampaignDeadline: filters.showCampaignDeadline === false ? undefined : false })}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                    filters.showCampaignDeadline === false
                      ? "bg-slate-100 text-slate-400 border-slate-200"
                      : "bg-red-100 text-red-700 border-red-200"
                  )}
                >
                  Campaign deadline
                </button>
              </div>
            </div>

            {/* Date range */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-500">Khoảng ngày</p>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={filters.dateFrom ?? ""}
                  onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
                  className="h-8 text-xs flex-1"
                  placeholder="Từ ngày"
                />
                <span className="text-slate-400 text-xs">—</span>
                <Input
                  type="date"
                  value={filters.dateTo ?? ""}
                  onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
                  className="h-8 text-xs flex-1"
                  placeholder="Đến ngày"
                />
              </div>
            </div>

            {/* Quick filters */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-500">Trạng thái nhanh</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => onChange({ ...filters, overdue: !filters.overdue })}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                    filters.overdue
                      ? "bg-red-100 text-red-700 border-red-200"
                      : "bg-slate-100 text-slate-400 border-slate-200"
                  )}
                >
                  <AlertTriangle className="size-3 inline mr-0.5" />
                  Quá hạn
                </button>
                <button
                  onClick={() => onChange({ ...filters, pendingApproval: !filters.pendingApproval })}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                    filters.pendingApproval
                      ? "bg-purple-100 text-purple-700 border-purple-200"
                      : "bg-slate-100 text-slate-400 border-slate-200"
                  )}
                >
                  <CalendarDays className="size-3 inline mr-0.5" />
                  Chờ duyệt
                </button>
                <button
                  onClick={() => onChange({ ...filters, completed: !filters.completed })}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                    filters.completed
                      ? "bg-green-100 text-green-700 border-green-200"
                      : "bg-slate-100 text-slate-400 border-slate-200"
                  )}
                >
                  <CheckCircle2 className="size-3 inline mr-0.5" />
                  Hoàn thành
                </button>
              </div>
            </div>

            {/* Assignees dropdown */}
            {staffOptions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-500">Nhân viên</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 w-full justify-between text-xs gap-1">
                      {filters.assignees?.length
                        ? `${filters.assignees.length} nhân viên`
                        : "Tất cả nhân viên"}
                      <ChevronDown className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[200px] max-h-[250px] overflow-y-auto">
                    {staffOptions.map((s) => (
                      <DropdownMenuCheckboxItem
                        key={s.id}
                        checked={filters.assignees?.includes(s.id) ?? false}
                        onCheckedChange={(checked) => {
                          const cur = filters.assignees ?? [];
                          setAssignees(checked ? [...cur, s.id] : cur.filter((x) => x !== s.id));
                        }}
                      >
                        {s.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Status dropdown */}
            {statusOptions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-500">Trạng thái</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 w-full justify-between text-xs gap-1">
                      {filters.workflowStages?.length
                        ? `${filters.workflowStages.length} trạng thái`
                        : "Tất cả trạng thái"}
                      <ChevronDown className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[200px] max-h-[250px] overflow-y-auto">
                    {statusOptions.map((s) => (
                      <DropdownMenuCheckboxItem
                        key={s.code}
                        checked={filters.workflowStages?.includes(s.code) ?? false}
                        onCheckedChange={(checked) => {
                          const cur = filters.workflowStages ?? [];
                          setStatuses(checked ? [...cur, s.code] : cur.filter((x) => x !== s.code));
                        }}
                      >
                        {s.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Task type dropdown */}
            {taskTypeOptions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-500">Loại công việc</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 w-full justify-between text-xs gap-1">
                      {filters.taskTypes?.length
                        ? `${filters.taskTypes.length} loại`
                        : "Tất cả loại"}
                      <ChevronDown className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[200px] max-h-[250px] overflow-y-auto">
                    {taskTypeOptions.map((t) => (
                      <DropdownMenuCheckboxItem
                        key={t.code}
                        checked={filters.taskTypes?.includes(t.code) ?? false}
                        onCheckedChange={(checked) => {
                          const cur = filters.taskTypes ?? [];
                          setTaskTypes(checked ? [...cur, t.code] : cur.filter((x) => x !== t.code));
                        }}
                      >
                        {t.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Platform dropdown */}
            {platformOptions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-500">Nền tảng</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 w-full justify-between text-xs gap-1">
                      {filters.platforms?.length
                        ? `${filters.platforms.length} nền tảng`
                        : "Tất cả nền tảng"}
                      <ChevronDown className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[200px] max-h-[250px] overflow-y-auto">
                    {platformOptions.map((p) => (
                      <DropdownMenuCheckboxItem
                        key={p.code}
                        checked={filters.platforms?.includes(p.code) ?? false}
                        onCheckedChange={(checked) => {
                          const cur = filters.platforms ?? [];
                          setPlatforms(checked ? [...cur, p.code] : cur.filter((x) => x !== p.code));
                        }}
                      >
                        {p.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Project dropdown */}
            {projectOptions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-500">Dự án</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 w-full justify-between text-xs gap-1">
                      {filters.projectIds?.length
                        ? `${filters.projectIds.length} dự án`
                        : "Tất cả dự án"}
                      <ChevronDown className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[200px] max-h-[250px] overflow-y-auto">
                    {projectOptions.map((p) => (
                      <DropdownMenuCheckboxItem
                        key={p.id}
                        checked={filters.projectIds?.includes(p.id) ?? false}
                        onCheckedChange={(checked) => {
                          const cur = filters.projectIds ?? [];
                          setProjects(checked ? [...cur, p.id] : cur.filter((x) => x !== p.id));
                        }}
                      >
                        {p.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Campaign dropdown */}
            {campaignOptions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-500">Chiến dịch</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 w-full justify-between text-xs gap-1">
                      {filters.campaignIds?.length
                        ? `${filters.campaignIds.length} chiến dịch`
                        : "Tất cả chiến dịch"}
                      <ChevronDown className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[200px] max-h-[250px] overflow-y-auto">
                    {campaignOptions.map((c) => (
                      <DropdownMenuCheckboxItem
                        key={c.id}
                        checked={filters.campaignIds?.includes(c.id) ?? false}
                        onCheckedChange={(checked) => {
                          const cur = filters.campaignIds ?? [];
                          setCampaigns(checked ? [...cur, c.id] : cur.filter((x) => x !== c.id));
                        }}
                      >
                        {c.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter chips */}
      {count > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {filters.platforms?.map((code) => {
            const p = platformOptions.find((x) => x.code === code);
            return (
              <button
                key={code}
                onClick={() => setPlatforms(filters.platforms!.filter((x) => x !== code))}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-medium border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                {p?.name ?? code}
                <X className="size-2.5" />
              </button>
            );
          })}
          {filters.workflowStages?.map((code) => {
            const s = statusOptions.find((x) => x.code === code);
            return (
              <button
                key={code}
                onClick={() => setStatuses(filters.workflowStages!.filter((x) => x !== code))}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200 hover:bg-slate-200 transition-colors"
              >
                {s?.name ?? code}
                <X className="size-2.5" />
              </button>
            );
          })}
          {filters.assignees?.map((id) => {
            const s = staffOptions.find((x) => x.id === id);
            return (
              <button
                key={id}
                onClick={() => setAssignees(filters.assignees!.filter((x) => x !== id))}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[11px] font-medium border border-green-200 hover:bg-green-100 transition-colors"
              >
                {s?.name ?? id}
                <X className="size-2.5" />
              </button>
            );
          })}
          {filters.overdue && (
            <button
              onClick={() => onChange({ ...filters, overdue: undefined })}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[11px] font-medium border border-red-200 hover:bg-red-100 transition-colors"
            >
              <AlertTriangle className="size-2.5" />
              Quá hạn
              <X className="size-2.5" />
            </button>
          )}
          {filters.pendingApproval && (
            <button
              onClick={() => onChange({ ...filters, pendingApproval: undefined })}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 text-[11px] font-medium border border-purple-200 hover:bg-purple-100 transition-colors"
            >
              <CalendarDays className="size-2.5" />
              Chờ duyệt
              <X className="size-2.5" />
            </button>
          )}
          {filters.completed && (
            <button
              onClick={() => onChange({ ...filters, completed: undefined })}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[11px] font-medium border border-green-200 hover:bg-green-100 transition-colors"
            >
              <CheckCircle2 className="size-2.5" />
              Hoàn thành
              <X className="size-2.5" />
            </button>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <button
              onClick={() => onChange({ ...filters, dateFrom: undefined, dateTo: undefined })}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200 hover:bg-slate-200 transition-colors"
            >
              <CalendarDays className="size-2.5" />
              {filters.dateFrom ?? "..."} — {filters.dateTo ?? "..."}
              <X className="size-2.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
