"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/workspace/types";
import { ProjectStatusBadge } from "./project-status-badge";
import { Calendar, Target, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  /** RBAC: chỉ super_admin mới thấy nút xóa */
  canDelete?: boolean;
  /** INTERN không thấy nút sửa/lưu trữ */
  isIntern?: boolean;
}

export function ProjectCard({
  project,
  onEdit,
  onDelete,
  onArchive,
  canDelete = false,
  isIntern = false,
}: ProjectCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  const taskCount = project._count?.tasks ?? 0;
  const campaignCount = project._count?.campaigns ?? 0;
  const hasChildren = taskCount > 0 || campaignCount > 0;

  const isOverdue =
    project.end_date &&
    new Date(project.end_date) < new Date() &&
    project.status !== "completed";

  const handleArchive = () => {
    setShowArchiveDialog(false);
    onArchive?.(project.id);
  };

  const handleDelete = () => {
    setShowDeleteDialog(false);
    onDelete?.(project.id);
  };

  return (
    <>
      <div
        className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden"
        onClick={() => (window.location.href = `/projects/${project.id}`)}
      >
        {/* Colored left border */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: project.color || "#E60012" }}
        />

        {/* Card content */}
        <div className="p-5 pl-6">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>

            {/* Action buttons (shown on hover) */}
            {!isIntern && (
            <div
              className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                  onClick={() => onEdit(project)}
                >
                  <span className="sr-only">Sửa</span>
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </Button>
              )}
              {onArchive && project.status !== "archived" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-orange-500"
                  onClick={() => setShowArchiveDialog(true)}
                  title="Lưu trữ"
                >
                  <span className="sr-only">Lưu trữ</span>
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </Button>
              )}
              {onDelete && canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                  onClick={() => setShowDeleteDialog(true)}
                  title="Xóa vĩnh viễn"
                >
                  <span className="sr-only">Xóa</span>
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              )}
            </div>
            )}
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap gap-2 mb-4">
            <ProjectStatusBadge status={project.status} />
            {isOverdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-700">
                Quá hạn
              </span>
            )}
          </div>

          {/* Meta info */}
          <div className="space-y-2 text-sm text-slate-500">
            {(project.start_date || project.end_date) && (
              <div className="flex items-center gap-2">
                <Calendar className="size-4 shrink-0" />
                <span>
                  {project.start_date
                    ? new Date(project.start_date).toLocaleDateString("vi-VN")
                    : "—"}
                  {" – "}
                  {project.end_date
                    ? new Date(project.end_date).toLocaleDateString("vi-VN")
                    : "—"}
                </span>
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Target className="size-4 shrink-0" />
                <span>{taskCount} công việc</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clapperboard className="size-4 shrink-0" />
                <span>{campaignCount} chiến dịch</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-100">
              {project.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs"
                >
                  #{tag}
                </span>
              ))}
              {project.tags.length > 3 && (
                <span className="px-2 py-0.5 text-slate-400 text-xs">
                  +{project.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Archive Dialog */}
      <ConfirmDialog
        open={showArchiveDialog}
        onOpenChange={setShowArchiveDialog}
        title="Lưu trữ dự án?"
        description={`"${project.name}" sẽ bị ẩn khỏi danh sách. Bạn có thể khôi phục sau nếu cần.`}
        warning={
          hasChildren
            ? `Dự án này có ${taskCount} công việc và ${campaignCount} chiến dịch. Chúng sẽ không bị xóa.`
            : undefined
        }
        confirmLabel="Lưu trữ"
        variant="warning"
        onConfirm={handleArchive}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Xóa vĩnh viễn dự án?"
        description={`"${project.name}" sẽ bị xóa vĩnh viễn. Hành động này KHÔNG thể hoàn tác.`}
        warning="Tất cả dữ liệu liên quan đến dự án này sẽ bị mất."
        variant="destructive"
        confirmLabel="Xóa vĩnh viễn"
        onConfirm={handleDelete}
      />
    </>
  );
}
