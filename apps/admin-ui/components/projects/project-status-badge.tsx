import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/workspace/types";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Đang hoạt động",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  completed: {
    label: "Hoàn thành",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  archived: {
    label: "Đã lưu trữ",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
  on_hold: {
    label: "Tạm dừng",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  planning: {
    label: "Đang lên kế hoạch",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
};

const DEFAULT_STATUS = {
  label: "Không xác định",
  className: "bg-slate-100 text-slate-600 border-slate-200",
};

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function ProjectStatusBadge({
  status,
  className,
}: ProjectStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || DEFAULT_STATUS;
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      <span
        className={cn(
          "mr-1.5 inline-block size-1.5 rounded-full",
          status === "active" && "bg-green-500",
          status === "completed" && "bg-blue-500",
          status === "archived" && "bg-slate-400",
          status === "on_hold" && "bg-yellow-500",
          status === "planning" && "bg-purple-500"
        )}
      />
      {config.label}
    </Badge>
  );
}
