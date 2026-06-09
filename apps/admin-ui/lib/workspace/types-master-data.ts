// ============================================================
// Master Data Module — TypeScript Types
// ============================================================

export type MasterDataCategory =
  | "task_type"
  | "task_status"
  | "priority"
  | "workflow_stage"
  | "channel"
  | "content_tag"
  | "department"
  | "campaign_type"
  | "campaign_status"
  | "project_status"
  | "project_color"
  | "content_goal"
  | "content_status";

/** JSONB metadata stored in pm_master_data.metadata for task_type items */
export interface TaskTypeWorkflowConfig {
  creates_workflow: boolean;
  workflow_type?: string | null;
  /** Default platform codes pre-filled when creating a task of this type */
  default_platform_ids?: string[] | null;
}

/** Extract TaskTypeWorkflowConfig from MasterDataItem.metadata (safe parser) */
export function getTaskTypeWorkflowConfig(
  metadata: Record<string, unknown> | null | undefined
): TaskTypeWorkflowConfig {
  if (!metadata || typeof metadata !== "object") {
    return { creates_workflow: false };
  }
  const cfg = metadata as Record<string, unknown>;
  const defaultPlatformIds = cfg.default_platform_ids;
  return {
    creates_workflow: cfg.creates_workflow === true,
    workflow_type: typeof cfg.workflow_type === "string" ? cfg.workflow_type : null,
    default_platform_ids: Array.isArray(defaultPlatformIds)
      ? defaultPlatformIds.filter((v) => typeof v === "string") as string[]
      : null,
  };
}

export interface MasterDataItem {
  id: string;
  category: MasterDataCategory;
  code: string;
  name: string;
  description?: string;
  color: string;
  bg_color: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  column_bg_color?: string;
  column_border_color?: string;
  /** JSONB config — used for task_type workflow settings: { creates_workflow, workflow_type } */
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface MasterDataGroup {
  category: MasterDataCategory;
  items: MasterDataItem[];
}

export interface CreateMasterDataInput {
  category: MasterDataCategory;
  code: string;
  name: string;
  description?: string;
  color?: string;
  bg_color?: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
  column_bg_color?: string;
  column_border_color?: string;
  /** JSONB config — for task_type: { creates_workflow: boolean, workflow_type?: string } */
  metadata?: Record<string, unknown> | null;
}

export interface UpdateMasterDataInput {
  name?: string;
  description?: string;
  color?: string;
  bg_color?: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
  column_bg_color?: string;
  column_border_color?: string;
  /** JSONB config — for task_type: { creates_workflow: boolean, workflow_type?: string } */
  metadata?: Record<string, unknown> | null;
}

export const MASTER_DATA_CATEGORIES: Array<{
  id: MasterDataCategory;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    id: "task_type",
    label: "Loại công việc",
    icon: "Tag",
    description: "Các loại công việc content: bài viết, video, thiết kế...",
  },
  {
    id: "task_status",
    label: "Trạng thái công việc",
    icon: "ListTodo",
    description: "Trạng thái Kanban: Backlog, To Do, In Progress...",
  },
  {
    id: "priority",
    label: "Mức ưu tiên",
    icon: "Gauge",
    description: "Mức ưu tiên: Khẩn cấp, Cao, Trung bình, Thấp",
  },
  {
    id: "workflow_stage",
    label: "Giai đoạn Workflow",
    icon: "GitBranch",
    description: "Giai đoạn trong quy trình: Ý tưởng, Viết, Review...",
  },
  {
    id: "channel",
    label: "Kênh phát hành",
    icon: "Radio",
    description: "Kênh đăng bài: Facebook, TikTok, YouTube, Website...",
  },
  {
    id: "content_tag",
    label: "Tags nội dung",
    icon: "Hash",
    description: "Tags phân loại nội dung: facebook, summer-sale, laptop...",
  },
  {
    id: "department",
    label: "Phòng ban",
    icon: "Building2",
    description: "Phòng ban / nhóm phụ trách dự án",
  },
  {
    id: "campaign_type",
    label: "Loại chiến dịch",
    icon: "Megaphone",
    description: "Loại chiến dịch marketing: khai trương, theo mùa, mạng xã hội...",
  },
  {
    id: "campaign_status",
    label: "Trạng thái chiến dịch",
    icon: "TrendingUp",
    description: "Trạng thái chiến dịch: Lên kế hoạch, Đang chạy, Tạm dừng...",
  },
  {
    id: "project_status",
    label: "Trạng thái dự án",
    icon: "FolderKanban",
    description: "Trạng thái dự án: Hoạt động, Hoàn thành, Lưu trữ...",
  },
  {
    id: "project_color",
    label: "Màu dự án",
    icon: "Palette",
    description: "Bảng màu chọn trước cho dự án (màu thương hiệu)",
  },
  {
    id: "content_goal",
    label: "Mục tiêu nội dung",
    icon: "Target",
    description: "Mục tiêu của nội dung: bán hàng, giáo dục, review...",
  },
  {
    id: "content_status",
    label: "Trạng thái nội dung",
    icon: "FileText",
    description: "Trạng thái nội dung trong quy trình: bản nháp, đang viết, đã đăng...",
  },
];
