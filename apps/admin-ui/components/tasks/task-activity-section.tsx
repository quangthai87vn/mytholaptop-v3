"use client";

import { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { adminFetch } from "@/lib/api/admin-fetch";
import type { TaskActivityEntry, TaskActivityAction } from "@/lib/workspace/types";
import { cn } from "@/lib/utils";

interface TaskActivitySectionProps {
  taskId: string;
}

const ACTION_LABELS: Record<TaskActivityAction, string> = {
  created: "đã tạo công việc",
  updated: "đã cập nhật",
  status_changed: "đổi trạng thái",
  stage_changed: "đổi giai đoạn",
  assigned: "được gán cho",
  unassigned: "bị gỡ khỏi",
  checklist_added: "thêm mục checklist",
  checklist_completed: "hoàn thành checklist",
  checklist_uncompleted: "bỏ hoàn thành checklist",
  checklist_deleted: "xóa checklist",
  commented: "bình luận",
  asset_added: "thêm tài liệu",
  asset_deleted: "xóa tài liệu",
  approved: "duyệt nội dung",
  rejected: "từ chối nội dung",
  revision_requested: "yêu cầu chỉnh sửa",
  published: "xuất bản nội dung",
};

const ACTION_COLORS: Record<TaskActivityAction, string> = {
  created: "bg-green-100 text-green-700 border-green-200",
  updated: "bg-slate-100 text-slate-700 border-slate-200",
  status_changed: "bg-blue-100 text-blue-700 border-blue-200",
  stage_changed: "bg-purple-100 text-purple-700 border-purple-200",
  assigned: "bg-orange-100 text-orange-700 border-orange-200",
  unassigned: "bg-slate-100 text-slate-700 border-slate-200",
  checklist_added: "bg-emerald-100 text-emerald-700 border-emerald-200",
  checklist_completed: "bg-green-100 text-green-700 border-green-200",
  checklist_uncompleted: "bg-yellow-100 text-yellow-700 border-yellow-200",
  checklist_deleted: "bg-red-100 text-red-700 border-red-200",
  commented: "bg-cyan-100 text-cyan-700 border-cyan-200",
  asset_added: "bg-indigo-100 text-indigo-700 border-indigo-200",
  asset_deleted: "bg-red-100 text-red-700 border-red-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  revision_requested: "bg-yellow-100 text-yellow-700 border-yellow-200",
  published: "bg-blue-100 text-blue-700 border-blue-200",
};

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-orange-100 text-orange-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-cyan-100 text-cyan-700",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div
      className={cn(
        "size-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
        colors[idx]
      )}
    >
      {initials}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff} giây trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

export function TaskActivitySection({ taskId }: TaskActivitySectionProps) {
  const [entries, setEntries] = useState<TaskActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchActivity(1);
  }, [taskId]);

  async function fetchActivity(p: number) {
    setLoading(true);
    try {
      const res = await adminFetch(
        `/api/tasks/${taskId}/activity?page=${p}&pageSize=20`
      );
      if (res.ok) {
        const data = await res.json();
        setEntries(p === 1 ? data.data : [...entries, ...data.data]);
        setHasMore(p < data.totalPages);
        setPage(p);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  function renderDetail(entry: TaskActivityEntry): string | null {
    if (entry.field_changed) {
      if (entry.old_value || entry.new_value) {
        return `${entry.old_value ?? ""} → ${entry.new_value ?? ""}`;
      }
    }
    if (entry.metadata && typeof entry.metadata === "object") {
      const meta = entry.metadata as Record<string, unknown>;
      if (meta.title) return `${meta.title}`;
      if (meta.itemId) return `item`;
    }
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="size-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700">Hoạt động</span>
        {entries.length > 0 && (
          <span className="text-xs text-slate-400">({entries.length})</span>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && page === 1 && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <Activity className="size-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Chưa có hoạt động nào</p>
        </div>
      )}

      {/* Timeline */}
      {entries.length > 0 && (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[14px] top-2 bottom-2 w-0.5 bg-slate-100" />

          <div className="space-y-4 pl-0">
            {entries.map((entry) => {
              const actionLabel = ACTION_LABELS[entry.action] ?? entry.action;
              const actionColor = ACTION_COLORS[entry.action] ?? "bg-slate-100 text-slate-700 border-slate-200";
              const detail = renderDetail(entry);

              return (
                <div key={entry.id} className="relative flex gap-3 pl-0">
                  {/* Avatar dot */}
                  <Avatar name={entry.actor_name} />

                  {/* Content */}
                  <div className="flex-1 min-w-0 -mt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900">
                        {entry.actor_name}
                      </span>
                      <span className="text-sm text-slate-600">{actionLabel}</span>
                      {detail && (
                        <span className="text-sm text-slate-500 font-mono">
                          {detail}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", actionColor)}>
                        {entry.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {timeAgo(entry.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <button
          onClick={() => fetchActivity(page + 1)}
          disabled={loading}
          className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
        >
          {loading ? "Đang tải..." : "Tải thêm hoạt động"}
        </button>
      )}
    </div>
  );
}
