"use client";

import type { Project } from "@/lib/workspace/types";
import { ProjectCard } from "./project-card";
import { Kanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectListProps {
  projects: Project[];
  onEdit?: (project: Project) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onAdd?: () => void;
  /** Chỉ super_admin mới được xóa vĩnh viễn */
  canDelete?: boolean;
  /** INTERN không thấy nút archive/edit/create */
  isIntern?: boolean;
}

export function ProjectList({
  projects,
  onEdit,
  onDelete,
  onArchive,
  onAdd,
  canDelete = false,
  isIntern = false,
}: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Kanban className="size-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">
          Chưa có dự án nào
        </h3>
        <p className="text-slate-500 mb-6 max-w-sm">
          Bắt đầu bằng cách tạo dự án đầu tiên để quản lý công việc và chiến dịch của bạn.
        </p>
        {onAdd && !isIntern && (
          <Button onClick={onAdd} className="gap-2">
            <Plus className="size-4" />
            Tạo dự án đầu tiên
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onEdit={onEdit}
          onDelete={canDelete ? onDelete : undefined}
          onArchive={onArchive}
          canDelete={canDelete}
        />
      ))}
    </div>
  );
}
