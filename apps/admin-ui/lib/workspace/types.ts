// ============================================================
// Workspace Module — Shared TypeScript Types
// ============================================================

// ─── Projects & Campaigns ─────────────────────────────────────────

export type ProjectStatus = "active" | "completed" | "archived" | "on_hold" | "planning";

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  color: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  owner_id?: string;
  team_ids: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  _count?: {
    tasks: number;
    campaigns: number;
  };
}

export type CampaignType =
  | "product_launch"
  | "seasonal"
  | "social_media"
  | "seo"
  | "advertising"
  | "email_marketing"
  | "influencer"
  | string;

export interface CampaignTypeConfig {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  is_active: boolean;
}

export type CampaignStatus =
  | "planning"
  | "active"
  | "paused"
  | "completed"
  | "archived"
  | "cancelled";

export interface Campaign {
  id: string;
  project_id?: string;
  name: string;
  description?: string;
  campaign_type: CampaignType;
  status: CampaignStatus;
  start_date?: string;
  end_date?: string;
  budget?: number;
  target_metrics: Record<string, number>;
  actual_metrics: Record<string, number>;
  channels: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
  /** Number of tasks in this campaign — fetched from DB via lateral join */
  _task_count?: number;
  /** Number of completed tasks (completed only, NOT cancelled) in this campaign */
  _completed_task_count?: number;
  /** Number of media/content production tasks in this campaign */
  _media_task_count?: number;
  /** Number of completed media tasks in this campaign */
  _media_completed_count?: number;
  /** Unique assignees count in this campaign */
  _unique_assignees?: number;
  /** Assignee IDs array — for avatar display */
  _assignee_ids?: string[];
}

// ─── Tasks ───────────────────────────────────────────────────────

/**
 * @deprecated TaskStatus values are driven by pm_master_data (task_status category).
 * The canonical list is the active rows in pm_master_data for that category.
 * Union types below are SUGGESTED codes — DB may have different active values.
 * Use buildKanbanColumns() + getMasterDataItems("task_status") for actual values.
 */
export type TaskStatus =
  | "idea"        // Ý tưởng
  | "assigned"    // Đã giao
  | "working"     // Đang thực hiện
  | "review"      // Chờ duyệt
  | "rework"      // Cần sửa
  | "completed"   // Hoàn thành
  | "cancelled";  // Hủy

/**
 * Task types are driven by pm_master_data (task_type category).
 * Canonical list: active rows in pm_master_data for that category.
 * The codes below are the simplified set (migration 034).
 * Updated: widened to string for pm_master_data compatibility.
 */
export type TaskType = string;

/**
 * @deprecated MediaPlatform values are driven by pm_master_data (channel category).
 * Canonical list is the active rows in pm_master_data for that category.
 */
export type MediaPlatform =
  | "facebook"
  | "website"
  | "tiktok"
  | "zalo"
  | "youtube"
  | "instagram";

export interface Task {
  id: string;
  project_id?: string;
  campaign_id?: string;
  parent_task_id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  task_type?: TaskType;
  /** Single platform code (legacy, for backward compat) */
  platform?: MediaPlatform;
  assignee_ids: string[];
  reporter_id?: string;
  start_date?: string;
  due_date?: string;
  published_at?: string;
  published_url?: string;
  estimated_hours?: number;
  actual_hours?: number;
  attachments: Attachment[];
  dependencies: string[];
  progress: number;
  metadata: Record<string, unknown>;
  // P9: Checklist support
  checklist_items?: TaskChecklistItem[];
  checklist_progress?: TaskChecklistProgress;

  // P9: Content production detail fields (kept in DB/model but NOT in TaskForm UI)
  content_title?: string;
  content_hook?: string;
  content_goal?: ContentGoal;
  related_product?: string;
  content_body?: string | null;
  call_to_action?: string;
  reference_links?: string[];
  output_links?: string[];

  // Phase 3: Content status (độc lập với task status)
  content_status?: string;
  approved_by?: string;
  approved_at?: string;

  // Employee submission result
  submitted_at?: string;
  submitted_by?: string;
  completion_note?: string;

  created_at: string;
  updated_at: string;
  updated_by_user_id?: string;
  completed_at?: string;

  /** Linked pm_workflow record (auto-created when task_type.creates_workflow = true) */
  workflow_id?: string | null;

  // P10: Platform-specific link fields (separate columns, not in metadata)
  website_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
  facebook_url?: string | null;

  // Archive fields: is_archived is independent of task status (cancelled vs Huỷ)
  is_archived?: boolean;
  archived_at?: string | null;
  archived_by?: string | null;
  archived_by_name?: string | null;

  priority?: TaskPriority;
  thumbnail_url?: string | null;
  /** @deprecated removed Phase 1-2 but kept for TypeScript compat */
  workflow_stage?: string;
  /** @deprecated removed Phase 1-2 but kept for TypeScript compat */
  tags?: string[];
}

/**
 * @deprecated ContentGoal values are driven by pm_master_data (content_goal category).
 * Canonical list is the active rows in pm_master_data for that category.
 */
export type ContentGoal =
  | "ban_hang"
  | "giao_duc"
  | "review"
  | "huong_dan"
  | "gioi_thieu"
  | "cham_soc";

/**
 * @deprecated CONTENT_GOAL_LABELS are driven by pm_master_data (content_goal category).
 * This Record is fallback only.
 */
export const CONTENT_GOAL_LABELS: Record<string, string> = {
  ban_hang: "Bán hàng",
  giao_duc: "Giáo dục",
  review: "Review",
  huong_dan: "Hướng dẫn",
  gioi_thieu: "Giới thiệu sản phẩm",
  cham_soc: "Chăm sóc khách hàng",
};

export interface Attachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  parent_comment_id?: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  is_ai_generated: boolean;
  mentions: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // P6.7.1: pre-loaded role from admin_users JOIN
  author_role?: "super_admin" | "admin" | "editor" | "viewer";
  replies?: TaskComment[];
}

export interface TaskActivity {
  id: string;
  task_id: string;
  actor_id?: string;
  actor_name?: string;
  action: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── Common Pagination ─────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Checklist (P9) ─────────────────────────────────────────────

export interface TaskChecklistItem {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TaskChecklistProgress {
  completed: number;
  total: number;
  percentage: number;
}

// ─── Content Workflow Stage (Phase 3) ──────────────────────────
// Độc lập với task workflow status
// draft → writing → internal_review → revision → approved → published

/**
 * @deprecated ContentStatus values are driven by pm_master_data (content_status category).
 * Canonical list is the active rows in pm_master_data for that category.
 */
export type ContentStatus =
  | "draft"
  | "writing"
  | "internal_review"
  | "revision"
  | "approved"
  | "published";

/**
 * @deprecated CONTENT_STATUS_LABELS are driven by pm_master_data (content_status category).
 * This Record is fallback only.
 */
export const CONTENT_STATUS_LABELS: Record<string, string> = {
  draft: "Bản nháp",
  writing: "Đang viết",
  internal_review: "Chờ duyệt nội bộ",
  revision: "Cần chỉnh sửa",
  approved: "Đã duyệt",
  published: "Đã xuất bản",
};

export const CONTENT_STATUS_COLORS: Record<string, string> = {
  draft: "text-slate-600 bg-slate-100",
  writing: "text-cyan-700 bg-cyan-100",
  internal_review: "text-orange-700 bg-orange-100",
  revision: "text-yellow-700 bg-yellow-100",
  approved: "text-green-700 bg-green-100",
  published: "text-blue-700 bg-blue-100",
};

/** @deprecated removed Phase 1-2 — kept for TypeScript compat with downstream consumers */
export type WorkflowStage = string;

export type ContentWorkflowStage =
  | "draft"
  | "writing"
  | "internal_review"
  | "revision"
  | "approved"
  | "published";

// ─── Per-Task Activity Entry (P9) ────────────────────────────

export type TaskActivityAction =
  | "created"
  | "updated"
  | "status_changed"
  | "stage_changed"
  | "assigned"
  | "unassigned"
  | "checklist_added"
  | "checklist_completed"
  | "checklist_uncompleted"
  | "checklist_deleted"
  | "commented"
  | "asset_added"
  | "asset_deleted"
  | "approved"
  | "rejected"
  | "revision_requested"
  | "published";

export interface TaskActivityEntry {
  id: string;
  task_id: string;
  actor_id: string;
  actor_name: string;
  action: TaskActivityAction;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ─── Media Workflow (DEPRECATED — use Task with task_type instead) ──
// Kept for backward compatibility. New features should use Task.task_type.

export type MediaContentType =
  | "facebook_post"
  | "seo_article"
  | "video_script"
  | "tiktok_video"
  | "youtube_video"
  | "zalo_message"
  | "image_prompt"
  | "product_photo"
  | "email_marketing";

export type MediaStatus = WorkflowStage | "archived";

export interface MediaWorkflow {
  id: string;
  project_id?: string;
  campaign_id?: string;
  task_id?: string; // links to pm_tasks.id
  title: string;
  description?: string;
  content_type: MediaContentType;
  platform?: MediaPlatform;
  status: MediaStatus;
  ai_prompt?: string;
  ai_generated_content?: string;
  ai_model_used?: string;
  ai_generated_at?: string;
  published_at?: string;
  published_url?: string;
  engagement_metrics: Record<string, number>;
  assignee_ids: string[];
  due_date?: string;
  tags: string[];
  attachments: Attachment[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type WorkflowStageValue =
  | "idea"
  | "writing"
  | "internal_review"
  | "revision"
  | "approved"
  | "shooting"
  | "editing"
  | "scheduled"
  | "published";

export interface WorkflowStageRecord {
  id: string;
  workflow_id: string;
  stage: WorkflowStageValue;
  content?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  reviewer_notes?: string;
  order_index: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowComment {
  id: string;
  workflow_id: string;
  stage?: WorkflowStageValue;
  author_id: string;
  author_name: string;
  content: string;
  is_ai_generated: boolean;
  created_at: string;
}

export interface AISuggestion {
  id: string;
  workflow_id?: string;
  task_id?: string;
  suggestion_type: string;
  content: string;
  confidence_score?: number;
  used: boolean;
  ai_model?: string;
  created_at: string;
}

// ─── Interns ─────────────────────────────────────────────────────

export type InternPosition =
  | "content_intern"
  | "video_intern"
  | "design_intern"
  | "marketing_intern";

export type InternStatus = "active" | "inactive" | "graduated" | "resigned";

export type PerformanceRating = "excellent" | "good" | "needs_improvement" | "poor";

export interface Intern {
  id: string;
  user_id?: string;
  full_name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  university?: string;
  major?: string;
  year_of_study?: number;
  position: InternPosition;
  start_date: string;
  end_date?: string;
  mentor_id?: string;
  status: InternStatus;
  skills: string[];
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface InternKPI {
  id: string;
  intern_id: string;
  period_type: "weekly" | "monthly";
  period_start: string;
  period_end: string;
  tasks_assigned: number;
  tasks_completed: number;
  tasks_overdue: number;
  completion_rate: number;
  on_time_count: number;
  late_count: number;
  deadline_accuracy: number;
  revision_count: number;
  quality_score: number;
  content_created: number;
  content_published: number;
  avg_engagement: number;
  expected_hours?: number;
  actual_hours?: number;
  attendance_rate: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyPerformance {
  id: string;
  intern_id: string;
  week_start: string;
  overall_score: number;
  productivity_score: number;
  quality_score: number;
  teamwork_score: number;
  initiative_score: number;
  accomplishments?: string;
  areas_for_improvement?: string;
  mentor_feedback?: string;
  intern_self_reflection?: string;
  rating: PerformanceRating;
  created_at: string;
}

export interface InternRanking {
  id: string;
  intern_id: string;
  intern?: Intern;
  period_type: "weekly" | "monthly";
  period_start: string;
  period_end: string;
  overall_rank: number;
  productivity_rank: number;
  quality_rank: number;
  deadline_rank: number;
  overall_score: number;
  productivity_score: number;
  quality_score: number;
  deadline_score: number;
  trend: "up" | "down" | "stable";
  trend_change?: number;
  created_at: string;
}

// ─── Status History ───────────────────────────────────────────────

export interface StatusHistory {
  id: string;
  entity_type: "task" | "media_workflow";
  entity_id: string;
  from_status?: string;
  to_status: string;
  changed_by?: string;
  changed_by_name?: string;
  note?: string;
  created_at: string;
}

// ─── API Response Types ────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WorkspaceStats {
  active_projects: number;
  due_this_week: number;
  overdue_tasks: number;
  overdue_campaigns: number;
  media_ready: number;
  total_interns: number;
  published_this_month: number;
}

// ─── Kanban Board ─────────────────────────────────────────────────

export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  color: string;
}

/**
 * @deprecated Use buildKanbanColumns(masterDataItems) from @/lib/workspace/master-data-helpers
 * to derive columns dynamically from pm_master_data (task_status category).
 * This constant is kept for backward compat with calendar filters only.
 */
export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "idea",       title: "Ý tưởng",       tasks: [], color: "hsl(270 60% 60%)" },
  { id: "assigned",   title: "Đã giao",       tasks: [], color: "hsl(220 14% 60%)" },
  { id: "working",    title: "Đang thực hiện", tasks: [], color: "hsl(199 89% 48%)" },
  { id: "review",     title: "Chờ duyệt",     tasks: [], color: "hsl(38  92% 50%)" },
  { id: "rework",     title: "Cần sửa",       tasks: [], color: "hsl(25  95% 53%)" },
  { id: "completed",  title: "Hoàn thành",     tasks: [], color: "hsl(142 70% 45%)" },
  { id: "cancelled",  title: "Hủy",           tasks: [], color: "hsl(0   70% 55%)" },
];

export const MEDIA_PIPELINE_STAGES: {
  id: WorkflowStageValue;
  label: string;
  color: string;
}[] = [
  { id: "idea", label: "Ý tưởng", color: "hsl(220 14% 70%)" },
  { id: "writing", label: "Viết nội dung", color: "hsl(261 100% 65%)" },
  { id: "internal_review", label: "Review nội bộ", color: "hsl(38 92% 50%)" },
  { id: "revision", label: "Chỉnh sửa", color: "hsl(25 95% 53%)" },
  { id: "approved", label: "Đã duyệt", color: "hsl(142 70% 45%)" },
  { id: "scheduled", label: "Đã lên lịch", color: "hsl(280 60% 60%)" },
  { id: "published", label: "Đã đăng", color: "hsl(142 70% 45%)" },
];

// PRIORITY_CONFIG removed — task priority and project priority removed in Phase 1-2

/**
 * @deprecated STATUS_CONFIG is fallback only. Use pm_master_data for dynamic colors/labels.
 * Active UI components get status options from getMasterDataItems("task_status").
 */
export const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  idea: {
    label: "Ý tưởng",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  assigned: {
    label: "Đã giao",
    color: "text-slate-700",
    bgColor: "bg-slate-100",
  },
  working: {
    label: "Đang thực hiện",
    color: "text-cyan-700",
    bgColor: "bg-cyan-100",
  },
  review: {
    label: "Chờ duyệt",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  rework: {
    label: "Cần sửa",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
  completed: {
    label: "Hoàn thành",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  cancelled: {
    label: "Hủy",
    color: "text-slate-500",
    bgColor: "bg-slate-100",
  },
};

/** @deprecated Priority values are now stored in a dedicated column with values: low, normal, high, urgent. */
export const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string; textColor: string; icon: string }> = {};

export type TaskPriority = "low" | "normal" | "high" | "urgent";

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bgColor: string; textColor: string; icon: string }> = {
  low:    { label: "Thấp",        color: "#16a34a", bgColor: "bg-green-100",   textColor: "text-green-700",  icon: "●" },
  normal: { label: "Bình thường", color: "#2563eb", bgColor: "bg-blue-100",    textColor: "text-blue-700",   icon: "●" },
  high:   { label: "Cao",         color: "#ea580c", bgColor: "bg-orange-100",  textColor: "text-orange-700", icon: "●" },
  urgent: { label: "Khẩn cấp",    color: "#dc2626", bgColor: "bg-red-100",     textColor: "text-red-700",    icon: "●" },
};

/**
 * TASK_TYPE_LABELS is driven by pm_master_data (task_type category).
 * This Record is simplified set (migration 034). Use getMasterDataItems("task_type") for actual values.
 */
export const TASK_TYPE_LABELS: Record<string, string> = {
  article: "Bài viết",
  video: "Video",
  image: "Hình ảnh",
  livestream: "Livestream",
  train: "Training",
  team_meeting: "Họp team",
  inventory_check: "Kiểm tra tồn kho",
  technical_fix: "Sửa lỗi website/app",
  product_data_entry: "Nhập dữ liệu sản phẩm",
  other: "Khác",
};

/**
 * TASK_TYPE_CONFIG is driven by pm_master_data (task_type category).
 * This Record is simplified set (migration 034).
 */
export const TASK_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  article:        { label: "Bài viết",            color: "text-blue-700",    bgColor: "bg-blue-100" },
  video:          { label: "Video",               color: "text-pink-700",    bgColor: "bg-pink-100" },
  image:          { label: "Hình ảnh",            color: "text-orange-700", bgColor: "bg-orange-100" },
  livestream:      { label: "Livestream",           color: "text-violet-700", bgColor: "bg-violet-100" },
  train:          { label: "Training",            color: "text-purple-700", bgColor: "bg-purple-100" },
  team_meeting:   { label: "Họp team",           color: "text-cyan-700",   bgColor: "bg-cyan-100" },
  inventory_check: { label: "Kiểm tra tồn kho",   color: "text-yellow-700", bgColor: "bg-yellow-100" },
  technical_fix:   { label: "Sửa lỗi website/app", color: "text-red-700",   bgColor: "bg-red-100" },
  product_data_entry: { label: "Nhập dữ liệu sản phẩm", color: "text-green-700", bgColor: "bg-green-100" },
  other:          { label: "Khác",               color: "text-slate-600",   bgColor: "bg-slate-100" },
};

/**
 * @deprecated PLATFORM_LABELS is driven by pm_master_data (channel category).
 * This Record is fallback only.
 */
export const PLATFORM_LABELS: Record<string, string> = {
  facebook: "Facebook",
  website: "Website",
  tiktok: "TikTok",
  zalo: "Zalo",
  youtube: "YouTube",
  instagram: "Instagram",
};

/**
 * @deprecated WORKFLOW_STAGE_LABELS is driven by pm_master_data (workflow_stage category).
 * This Record is fallback only.
 */
export const WORKFLOW_STAGE_LABELS: Record<string, string> = {
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

export const WORKFLOW_STAGE_CONFIG: Array<{ id: WorkflowStage; label: string; color: string }> = [
  { id: "idea", label: "Ý tưởng", color: "hsl(270 60% 60%)" },
  { id: "writing", label: "Viết nội dung", color: "hsl(200 70% 50%)" },
  { id: "internal_review", label: "Review nội bộ", color: "hsl(30 90% 55%)" },
  { id: "revision", label: "Chỉnh sửa", color: "hsl(45 90% 50%)" },
  { id: "approved", label: "Đã duyệt", color: "hsl(160 60% 45%)" },
  { id: "shooting", label: "Quay", color: "hsl(0 70% 55%)" },
  { id: "editing", label: "Edit", color: "hsl(280 60% 55%)" },
  { id: "scheduled", label: "Đã lên lịch", color: "hsl(280 60% 60%)" },
  { id: "published", label: "Đã đăng", color: "hsl(142 70% 45%)" },
];

export const CONTENT_TYPE_LABELS: Record<MediaContentType, string> = {
  facebook_post: "Bài Facebook",
  seo_article: "Bài SEO",
  video_script: "Kịch bản video",
  tiktok_video: "Video TikTok",
  youtube_video: "Video YouTube",
  zalo_message: "Tin nhắn Zalo",
  image_prompt: "Prompt hình ảnh",
  product_photo: "Ảnh sản phẩm",
  email_marketing: "Email Marketing",
};

export const POSITION_LABELS: Record<InternPosition, string> = {
  content_intern: "Content Intern",
  video_intern: "Video Intern",
  design_intern: "Design Intern",
  marketing_intern: "Marketing Intern",
};

// ─── Workspace Members ────────────────────────────────────────────────

export type MemberType = "intern" | "employee" | "freelancer" | "collaborator";

export type JobRole =
  | "content_writer"
  | "designer"
  | "video_editor"
  | "seo"
  | "reviewer"
  | "social_media"
  | "photographer"
  | "manager"
  | "other";

export interface WorkspaceMemberStats {
  tasksAssigned: number;
  tasksCompleted: number;
  tasksOverdue: number;
  completionRate: number;
}

export interface WorkspaceMember {
  id: string;
  fullName: string;
  email: string;
  memberType: MemberType;
  jobRole: JobRole;
  systemRole: string;
  status: "active" | "inactive";
  avatarUrl?: string;
  joinedAt: string;
  stats: WorkspaceMemberStats;
}

export const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  intern: "Thực tập sinh",
  employee: "Nhân viên",
  freelancer: "Freelancer",
  collaborator: "Cộng tác viên",
};

export const JOB_ROLE_LABELS: Record<JobRole, string> = {
  content_writer: "Content Writer",
  designer: "Designer",
  video_editor: "Video Editor",
  seo: "SEO",
  reviewer: "Reviewer",
  social_media: "Social Media",
  photographer: "Photographer",
  manager: "Manager",
  other: "Khác",
};

// ─── Activity / Audit Trail — P6.8 ────────────────────────────────

export type ActivitySourceTable =
  | "task_activity"
  | "status_history"
  | "admin_audit"
  | "notification_event";

export type ActivityEntityType =
  | "task"
  | "project"
  | "campaign"
  | "media_workflow"
  | "admin_user"
  | "system";

export interface ActivityLog {
  id: string;
  source_table: ActivitySourceTable;
  entity_id: string | null;
  entity_type: ActivityEntityType;
  entity_name: string;
  actor_id: string | null;
  actor_name: string | null;
  action_type: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ActivityFilters {
  entityType?: ActivityEntityType | ActivityEntityType[];
  actionType?: string | string[];
  actorId?: string;
  actorName?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

// ─── Workflow Creation Helpers ─────────────────────────────────────────

import type { MasterDataItem } from "@/lib/workspace/types-master-data";

/**
 * Returns true if a task type is configured to create a media workflow.
 * Uses metadata.creates_workflow from pm_master_data (task_type category).
 */
export function taskTypeCreatesWorkflow(
  taskTypeCode: string,
  masterDataItems?: MasterDataItem[]
): boolean {
  const item = masterDataItems?.find(
    (i) => i.category === "task_type" && i.code === taskTypeCode
  );
  if (!item) return false;
  const meta = item.metadata as Record<string, unknown> | null | undefined;
  return meta?.creates_workflow === true;
}

/**
 * Returns the default platform IDs for a task type.
 */
export function taskTypeDefaultPlatforms(
  taskTypeCode: string,
  masterDataItems?: MasterDataItem[]
): string[] {
  const item = masterDataItems?.find(
    (i) => i.category === "task_type" && i.code === taskTypeCode
  );
  const meta = item?.metadata as Record<string, unknown> | null | undefined;
  const raw = meta?.default_platform_ids;
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string");
}

