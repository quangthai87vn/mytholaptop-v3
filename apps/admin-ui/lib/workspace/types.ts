// ============================================================
// Workspace Module — Shared TypeScript Types
// ============================================================

// ─── Projects & Campaigns ─────────────────────────────────────────

export type ProjectStatus = "active" | "completed" | "archived" | "on_hold" | "planning";
export type ProjectPriority = "low" | "medium" | "high" | "urgent";

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
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
  | "";

export type CampaignStatus =
  | "planning"
  | "active"
  | "paused"
  | "completed"
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
}

// ─── Tasks ───────────────────────────────────────────────────────

export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "review"
  | "done"
  | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type MediaStage =
  | "idea"
  | "writing"
  | "review"
  | "filming"
  | "editing"
  | "published";

export interface Task {
  id: string;
  project_id?: string;
  campaign_id?: string;
  parent_task_id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  stage?: MediaStage;
  assignee_ids: string[];
  reporter_id?: string;
  start_date?: string;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  tags: string[];
  attachments: Attachment[];
  dependencies: string[];
  progress: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

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

// ─── Media Workflow ───────────────────────────────────────────────

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

export type MediaPlatform =
  | "facebook"
  | "website"
  | "tiktok"
  | "zalo"
  | "youtube"
  | "instagram";

export type MediaStatus = MediaStage | "archived";

export interface MediaWorkflow {
  id: string;
  project_id?: string;
  campaign_id?: string;
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

export interface WorkflowStage {
  id: string;
  workflow_id: string;
  stage: MediaStage;
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
  stage?: MediaStage;
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

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "backlog", title: "Backlog", tasks: [], color: "hsl(220 14% 70%)" },
  { id: "todo", title: "To Do", tasks: [], color: "hsl(220 14% 70%)" },
  { id: "in_progress", title: "In Progress", tasks: [], color: "hsl(199 89% 48%)" },
  { id: "review", title: "Review", tasks: [], color: "hsl(38 92% 50%)" },
  { id: "done", title: "Done", tasks: [], color: "hsl(142 70% 45%)" },
];

export const MEDIA_PIPELINE_STAGES: {
  id: MediaStage;
  label: string;
  color: string;
}[] = [
  { id: "idea", label: "Ý tưởng", color: "hsl(220 14% 70%)" },
  { id: "writing", label: "Viết nội dung", color: "hsl(261 100% 65%)" },
  { id: "review", label: "Review", color: "hsl(38 92% 50%)" },
  { id: "filming", label: " Quay", color: "hsl(199 89% 48%)" },
  { id: "editing", label: "Edit", color: "hsl(25 95% 53%)" },
  { id: "published", label: "Đã đăng", color: "hsl(142 70% 45%)" },
];

export const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  low: { label: "Thấp", color: "text-green-700", bgColor: "bg-green-100", icon: "↓" },
  medium: {
    label: "Trung bình",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    icon: "→",
  },
  high: {
    label: "Cao",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: "↑",
  },
  urgent: {
    label: "Khẩn cấp",
    color: "text-red-900",
    bgColor: "bg-red-200",
    icon: "!!!",
  },
};

export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; bgColor: string }
> = {
  backlog: {
    label: "Backlog",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  },
  todo: { label: "To Do", color: "text-slate-700", bgColor: "bg-slate-100" },
  in_progress: {
    label: "In Progress",
    color: "text-cyan-700",
    bgColor: "bg-cyan-100",
  },
  review: {
    label: "Review",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  done: {
    label: "Done",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
};

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

export const PLATFORM_LABELS: Record<MediaPlatform, string> = {
  facebook: "Facebook",
  website: "Website",
  tiktok: "TikTok",
  zalo: "Zalo",
  youtube: "YouTube",
  instagram: "Instagram",
};

export const POSITION_LABELS: Record<InternPosition, string> = {
  content_intern: "Content Intern",
  video_intern: "Video Intern",
  design_intern: "Design Intern",
  marketing_intern: "Marketing Intern",
};
