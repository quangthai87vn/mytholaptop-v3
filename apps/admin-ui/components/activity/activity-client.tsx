"use client";

import { useState, useCallback, useTransition } from "react";
import { Activity, Download, Filter, X, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { ActivityRow } from "@/lib/workspace/db";
import type { AdminUser } from "@/lib/auth/session";

interface ActivityClientProps {
  initialData: {
    data: ActivityRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  currentUser: AdminUser | null;
}

const ACTION_LABELS: Record<string, string> = {
  created: "đã tạo",
  updated: "đã cập nhật",
  status_changed: "đã chuyển trạng thái",
  stage_changed: "đã chuyển giai đoạn",
  assigned: "đã giao",
  commented: "đã bình luận",
  attached: "đã đính kèm",
  deleted: "đã xóa",
  "gửi duyệt": "đã gửi duyệt",
  "duyệt": "đã duyệt",
  "từ chối": "đã từ chối",
  "yêu cầu chỉnh sửa": "đã yêu cầu chỉnh sửa",
  "xuất bản": "đã xuất bản",
  "comment_created": "đã bình luận",
  "comment_updated": "đã chỉnh sửa bình luận",
  "comment_deleted": "đã xóa bình luận",
  "user.created": "đã tạo tài khoản",
  "user.role_changed": "đã đổi vai trò",
  "user.status_changed": "đã đổi trạng thái",
  "user.password_reset": "đã reset mật khẩu",
  "user.disabled": "đã vô hiệu hóa",
  task_assigned: "đã giao việc",
  approval_required: "cần duyệt",
  task_overdue: "quá hạn",
  mentioned: "được nhắc đến",
};

const ENTITY_LABELS: Record<string, string> = {
  task: "công việc",
  project: "dự án",
  campaign: "chiến dịch",
  media_workflow: "workflow media",
  admin_user: "tài khoản admin",
  system: "hệ thống",
};

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
  planning: "Lên kế hoạch",
  active: "Đang chạy",
  paused: "Tạm dừng",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  idea: "Ý tưởng",
  writing: "Viết nội dung",
  internal_review: "Review nội bộ",
  revision: "Chỉnh sửa",
  approved: "Đã duyệt",
  shooting: "Quay",
  editing: "Edit",
  scheduled: "Đã lên lịch",
  published: "Đã đăng",
};

const SOURCE_LABELS: Record<string, string> = {
  task_activity: "Task Activity",
  status_history: "Status History",
  admin_audit: "Admin Audit",
  notification_event: "Thông báo",
};

function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function formatEntity(entity: string): string {
  return ENTITY_LABELS[entity] ?? entity;
}

function formatStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function getActorInitial(name: string | null | undefined): string {
  return name?.[0]?.toUpperCase() ?? "?";
}

function buildQuery(filters: FiltersState): string {
  const params = new URLSearchParams();
  if (filters.entityType) params.set("entityType", filters.entityType);
  if (filters.actionType) params.set("actionType", filters.actionType);
  if (filters.actorId) params.set("actorId", filters.actorId);
  if (filters.actorName) params.set("actorName", filters.actorName);
  if (filters.search) params.set("search", filters.search);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

interface FiltersState {
  entityType: string;
  actionType: string;
  actorId: string;
  actorName: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  page: number;
}

function ActivityItem({ item }: { item: ActivityRow }) {
  const isStatusChange = item.field_changed === "status";
  const isStageChange = item.field_changed === "stage";
  const isAdminAudit = item.source_table === "admin_audit";

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
      <div className={`size-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
        isAdminAudit ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
      }`}>
        {getActorInitial(item.actor_name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-slate-900">
            {item.actor_name ?? "Hệ thống"}
          </span>{" "}
          {formatAction(item.action_type)}{" "}
          <span className="text-primary font-medium">
            {formatEntity(item.entity_type)}
          </span>
          {item.entity_name && (
            <span className="text-slate-500"> "{item.entity_name}"</span>
          )}
          {isStatusChange && item.new_value && (
            <span className="text-slate-500">
              {" → "}
              <span className="font-medium">{formatStatus(item.new_value)}</span>
            </span>
          )}
          {isStageChange && item.new_value && (
            <span className="text-slate-500">
              {" → "}
              <span className="font-medium">{formatStatus(item.new_value)}</span>
            </span>
          )}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <p className="text-xs text-slate-400">
            {new Date(item.created_at).toLocaleString("vi-VN")}
          </p>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            isAdminAudit ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
          }`}>
            {SOURCE_LABELS[item.source_table] ?? item.source_table}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ActivityClient({ initialData, currentUser }: ActivityClientProps) {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState<FiltersState>({
    entityType: "",
    actionType: "",
    actorId: "",
    actorName: "",
    search: "",
    dateFrom: "",
    dateTo: "",
    page: 1,
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchActivities = useCallback((newFilters: FiltersState) => {
    startTransition(async () => {
      const query = buildQuery({ ...newFilters, page: 1 });
      const res = await fetch(`/api/activity?${query}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
        setFilters((prev) => ({ ...prev, page: 1 }));
      }
    });
  }, []);

  const goToPage = useCallback((page: number) => {
    startTransition(async () => {
      const query = buildQuery({ ...filters, page });
      const res = await fetch(`/api/activity?${query}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
        setFilters((prev) => ({ ...prev, page }));
      }
    });
  }, [filters]);

  const clearFilters = () => {
    const cleared: FiltersState = {
      entityType: "", actionType: "", actorId: "", actorName: "",
      search: "", dateFrom: "", dateTo: "", page: 1,
    };
    startTransition(async () => {
      const res = await fetch("/api/activity");
      if (res.ok) {
        const result = await res.json();
        setData(result);
        setFilters(cleared);
      }
    });
  };

  const exportCsv = () => {
    const query = buildQuery(filters);
    window.open(`/api/activity/export?${query}`, "_blank");
  };

  const hasFilters = filters.entityType || filters.actionType ||
    filters.actorId || filters.actorName || filters.search ||
    filters.dateFrom || filters.dateTo;

  const canExport = currentUser && ["admin", "super_admin"].includes(currentUser.role);

  return (
    <div className="space-y-4">
      {/* Header + Export */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm hoạt động..."
              value={filters.search}
              onChange={(e) => {
                const v = e.target.value;
                setFilters((f) => ({ ...f, search: v }));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchActivities({ ...filters, search: filters.search });
              }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <button
            onClick={() => fetchActivities(filters)}
            className="px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Tìm
          </button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
              showFilters ? "border-primary text-primary bg-primary/5" : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            <Filter className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <X className="size-4 inline mr-1" />
              Xóa lọc
            </button>
          )}
          {canExport && (
            <button
              onClick={exportCsv}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
            >
              <Download className="size-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Entity</label>
              <select
                value={filters.entityType}
                onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Tất cả</option>
                <option value="task">Task</option>
                <option value="project">Project</option>
                <option value="campaign">Campaign</option>
                <option value="admin_user">Admin User</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Action</label>
              <select
                value={filters.actionType}
                onChange={(e) => setFilters((f) => ({ ...f, actionType: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Tất cả</option>
                <option value="created">Tạo mới</option>
                <option value="status_changed">Chuyển trạng thái</option>
                <option value="stage_changed">Chuyển giai đoạn</option>
                <option value="comment_created">Bình luận</option>
                <option value="user.role_changed">Đổi vai trò</option>
                <option value="user.status_changed">Đổi trạng thái user</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Từ ngày</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Đến ngày</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => fetchActivities(filters)}
              className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Áp dụng bộ lọc
            </button>
          </div>
        </div>
      )}

      {/* Active filters summary */}
      {hasFilters && (
        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
          <span>Đang lọc:</span>
          {filters.entityType && (
            <span className="px-2 py-0.5 bg-slate-100 rounded-full">
              Entity: {formatEntity(filters.entityType)}
            </span>
          )}
          {filters.actionType && (
            <span className="px-2 py-0.5 bg-slate-100 rounded-full">
              Action: {formatAction(filters.actionType)}
            </span>
          )}
          {filters.dateFrom && (
            <span className="px-2 py-0.5 bg-slate-100 rounded-full">
              Từ: {filters.dateFrom}
            </span>
          )}
          {filters.dateTo && (
            <span className="px-2 py-0.5 bg-slate-100 rounded-full">
              Đến: {filters.dateTo}
            </span>
          )}
          {filters.search && (
            <span className="px-2 py-0.5 bg-slate-100 rounded-full">
              Tìm: "{filters.search}"
            </span>
          )}
        </div>
      )}

      {/* Results summary */}
      <div className="text-sm text-slate-500">
        Hiển thị {data.data.length > 0 ? (data.page - 1) * data.pageSize + 1 : 0}–{Math.min(data.page * data.pageSize, data.total)} trong tổng số {data.total} hoạt động
      </div>

      {/* Activity list */}
      <div className="bg-white rounded-xl border border-slate-200 p-2">
        <div className="space-y-1">
          {data.data.map((item) => (
            <ActivityItem key={item.id} item={item} />
          ))}

          {data.data.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Activity className="size-12 mx-auto mb-3 opacity-30" />
              <p>Không có hoạt động nào được tìm thấy</p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => goToPage(data.page - 1)}
            disabled={data.page <= 1 || isPending}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(data.totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (data.totalPages <= 7) {
                pageNum = i + 1;
              } else if (data.page <= 4) {
                pageNum = i + 1;
              } else if (data.page >= data.totalPages - 3) {
                pageNum = data.totalPages - 6 + i;
              } else {
                pageNum = data.page - 3 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  disabled={isPending}
                  className={`size-8 text-sm rounded-lg transition-colors ${
                    data.page === pageNum
                      ? "bg-primary text-white"
                      : "border border-slate-200 hover:bg-slate-50"
                  } disabled:opacity-40`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => goToPage(data.page + 1)}
            disabled={data.page >= data.totalPages || isPending}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {isPending && (
        <div className="text-center text-sm text-slate-400 py-2">
          Đang tải...
        </div>
      )}
    </div>
  );
}
