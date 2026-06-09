/**
 * Workspace API Validation — Zod Schemas
 *
 * All category fields (task_type, status, platform, content_goal, content_status,
 * campaign_type, campaign_status) use z.string() — values are validated against
 * pm_master_data at API runtime.
 *
 * Hardcoded arrays are kept ONLY for intern/project schemas (not master-data-driven).
 * Legacy status aliases (todo→idea, backlog→idea) are handled in API routes.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

// ============================================================
// Shared Primitives
// ============================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const uuidOptional = z
  .string()
  .regex(UUID_REGEX, "Phải là UUID hợp lệ")
  .optional()
  .or(z.literal(""));

const isoDateOptional = z
  .string()
  .refine(
    (val) => {
      if (!val || val === "") return true;
      const d = new Date(val);
      return !isNaN(d.getTime());
    },
    { message: "Phải là ngày hợp lệ (ISO 8601)" }
  )
  .optional()
  .or(z.literal(""));

// ============================================================
// Task Schemas
// ============================================================

/**
 * Category fields use z.string() — validated against pm_master_data in API route.
 * start_date / due_date are optional (not required to save).
 */
export const createTaskSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được để trống").max(500),
  description: z.string().max(10000).optional(),
  // status: optional; API resolves default from master_data if omitted
  status: z.string().max(100).optional(),
  // task_type: optional; empty string = no type selected
  task_type: z.string().max(100).optional().or(z.literal("")),
  // platform: optional
  platform: z.string().max(100).optional(),
  project_id: uuidOptional,
  campaign_id: uuidOptional,
  parent_task_id: uuidOptional,
  reporter_id: uuidOptional,
  assignee_ids: z.array(z.string().regex(UUID_REGEX, "Mỗi phần tử trong assignee_ids phải là UUID")).default([]),
  // Dates are optional — do NOT require them to save
  start_date: isoDateOptional,
  due_date: isoDateOptional,
  published_at: isoDateOptional,
  published_url: z.string().url().optional().or(z.literal("")),
  estimated_hours: z.number().min(0).max(1000).optional(),
  actual_hours: z.number().min(0).max(1000).optional(),
  progress: z.number().min(0).max(100).default(0),
  attachments: z.array(
    z.object({
      name: z.string().min(1).max(255),
      url: z.string().url(),
      size: z.number().min(0),
      type: z.string().max(100),
    })
  ).default([]),
  dependencies: z.array(z.string().regex(UUID_REGEX)).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
  // P9: Content detail fields
  content_title: z.string().max(500).optional(),
  content_hook: z.string().max(1000).optional(),
  content_goal: z.string().max(100).optional(),
  related_product: z.string().max(500).optional(),
  content_body: z.string().max(20000).optional(),
  call_to_action: z.string().max(500).optional(),
  reference_links: z.array(z.string().max(1000)).default([]),
  output_links: z.array(z.string().max(1000)).default([]),
  content_status: z.string().max(100).optional(),
  completion_note: z.string().max(2000).optional(),
  // P10: Platform-specific link fields
  website_url: z.string().url("Website URL không hợp lệ").optional().or(z.literal("")),
  youtube_url: z.string().url("YouTube URL không hợp lệ").optional().or(z.literal("")),
  tiktok_url: z.string().url("TikTok URL không hợp lệ").optional().or(z.literal("")),
  facebook_url: z.string().url("Facebook URL không hợp lệ").optional().or(z.literal("")),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional(),
  status: z.string().max(100).optional(),
  task_type: z.string().max(100).optional().or(z.literal("")),
  platform: z.string().max(100).optional(),
  project_id: uuidOptional,
  campaign_id: uuidOptional,
  parent_task_id: uuidOptional,
  reporter_id: uuidOptional,
  assignee_ids: z.array(z.string().regex(UUID_REGEX)).default([]),
  start_date: isoDateOptional,
  due_date: isoDateOptional,
  published_at: isoDateOptional,
  published_url: z.string().url().optional().or(z.literal("")),
  estimated_hours: z.number().min(0).max(1000).optional(),
  actual_hours: z.number().min(0).max(1000).optional(),
  progress: z.number().min(0).max(100).optional(),
  attachments: z.array(
    z.object({
      name: z.string().min(1).max(255),
      url: z.string().url(),
      size: z.number().min(0),
      type: z.string().max(100),
    })
  ).default([]),
  dependencies: z.array(z.string().regex(UUID_REGEX)).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
  content_title: z.string().max(500).optional(),
  content_hook: z.string().max(1000).optional(),
  content_goal: z.string().max(100).optional(),
  related_product: z.string().max(500).optional(),
  content_body: z.string().max(20000).optional(),
  call_to_action: z.string().max(500).optional(),
  reference_links: z.array(z.string().max(1000)).default([]),
  output_links: z.array(z.string().max(1000)).default([]),
  content_status: z.string().max(100).optional(),
  completion_note: z.string().max(2000).optional(),
  // P10: Platform-specific link fields
  website_url: z.string().url("Website URL không hợp lệ").optional().or(z.literal("")),
  youtube_url: z.string().url("YouTube URL không hợp lệ").optional().or(z.literal("")),
  tiktok_url: z.string().url("TikTok URL không hợp lệ").optional().or(z.literal("")),
  facebook_url: z.string().url("Facebook URL không hợp lệ").optional().or(z.literal("")),
});

// ============================================================
// Campaign Schemas
// ============================================================

export const createCampaignSchema = z.object({
  name: z.string().min(1, "Tên chiến dịch không được để trống").max(255),
  description: z.string().max(5000).optional(),
  project_id: uuidOptional,
  // campaign_type: optional; validated against pm_master_data at runtime
  campaign_type: z.string().max(100).optional().or(z.literal("")),
  // status: required for create
  status: z.string().max(100, "Status không hợp lệ"),
  start_date: isoDateOptional,
  end_date: isoDateOptional,
  budget: z.number().min(0).max(1e12).optional(),
  target_metrics: z.record(z.string(), z.number()).default({}),
  actual_metrics: z.record(z.string(), z.number()).default({}),
  channels: z.array(z.string().max(50)).default([]),
  tags: z.array(z.string().max(100)).default([]),
}).superRefine((data, ctx) => {
  if (data.start_date && data.end_date) {
    const s = new Date(data.start_date);
    const e = new Date(data.end_date);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s > e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ngày bắt đầu phải trước ngày kết thúc",
        path: ["start_date"],
      });
    }
  }
});

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  project_id: uuidOptional,
  campaign_type: z.string().max(100).optional().or(z.literal("")),
  status: z.string().max(100).optional(),
  start_date: isoDateOptional,
  end_date: isoDateOptional,
  budget: z.number().min(0).max(1e12).optional(),
  target_metrics: z.record(z.string(), z.number()).default({}),
  actual_metrics: z.record(z.string(), z.number()).default({}),
  channels: z.array(z.string().max(50)).default([]),
  tags: z.array(z.string().max(100)).default([]),
}).superRefine((data, ctx) => {
  if (data.start_date && data.end_date) {
    const s = new Date(data.start_date);
    const e = new Date(data.end_date);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s > e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ngày bắt đầu phải trước ngày kết thúc",
        path: ["start_date"],
      });
    }
  }
});

// ============================================================
// Project Schemas
// ============================================================

export const createProjectSchema = z.object({
  name: z.string().min(1, "Tên dự án không được để trống").max(255),
  description: z.string().max(10000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).default("#E60012"),
  start_date: isoDateOptional,
  end_date: isoDateOptional,
  budget: z.number().min(0).max(1e12).optional(),
  owner_id: uuidOptional,
  team_ids: z.array(z.string().regex(UUID_REGEX)).default([]),
  tags: z.array(z.string().max(100)).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
}).superRefine((data, ctx) => {
  if (data.start_date && data.end_date) {
    const s = new Date(data.start_date);
    const e = new Date(data.end_date);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s > e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ngày bắt đầu phải trước ngày kết thúc",
        path: ["start_date"],
      });
    }
  }
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(10000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
  start_date: isoDateOptional,
  end_date: isoDateOptional,
  budget: z.number().min(0).max(1e12).optional(),
  owner_id: uuidOptional,
  team_ids: z.array(z.string().regex(UUID_REGEX)).default([]),
  tags: z.array(z.string().max(100)).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
}).superRefine((data, ctx) => {
  if (data.start_date && data.end_date) {
    const s = new Date(data.start_date);
    const e = new Date(data.end_date);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s > e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ngày bắt đầu phải trước ngày kết thúc",
        path: ["start_date"],
      });
    }
  }
});

// ============================================================
// Intern Schemas
// ============================================================

const INTERN_POSITIONS = ["content_intern", "video_intern", "design_intern", "marketing_intern"];
const INTERN_STATUSES = ["active", "inactive", "graduated", "resigned"];

export const createInternSchema = z.object({
  user_id: uuidOptional,
  full_name: z.string().min(1, "Họ tên không được để trống").max(255),
  email: z.string().email().max(255).optional().or(z.literal("")),
  phone: z.string().regex(/^[\d\s\-\+\(\)]{6,20}$/).optional().or(z.literal("")),
  avatar_url: z.string().url().optional().or(z.literal("")),
  university: z.string().max(255).optional(),
  major: z.string().max(255).optional(),
  year_of_study: z.number().int().min(1).max(10).optional(),
  position: z.enum(INTERN_POSITIONS, { error: "Position không hợp lệ" }),
  start_date: z
    .string()
    .refine(
      (val) => {
        if (!val || val === "") return false;
        const d = new Date(val);
        return !isNaN(d.getTime());
      },
      { message: "start_date phải là ngày hợp lệ (ISO 8601)" }
    ),
  end_date: isoDateOptional,
  mentor_id: uuidOptional,
  status: z.enum(INTERN_STATUSES, { error: "Status không hợp lệ" }).default("active"),
  skills: z.array(z.string().max(100)).default([]),
  bio: z.string().max(2000).optional(),
});

export const updateInternSchema = z.object({
  user_id: uuidOptional,
  full_name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional().or(z.literal("")),
  phone: z.string().regex(/^[\d\s\-\+\(\)]{6,20}$/).optional().or(z.literal("")),
  avatar_url: z.string().url().optional().or(z.literal("")),
  university: z.string().max(255).optional(),
  major: z.string().max(255).optional(),
  year_of_study: z.number().int().min(1).max(10).optional(),
  position: z.enum(INTERN_POSITIONS, { error: "Position không hợp lệ" }).optional(),
  start_date: isoDateOptional,
  end_date: isoDateOptional,
  mentor_id: uuidOptional,
  status: z.enum(INTERN_STATUSES, { error: "Status không hợp lệ" }).optional(),
  skills: z.array(z.string().max(100)).default([]),
  bio: z.string().max(2000).optional(),
});

// ============================================================
// Task Asset Schemas — P6.2
// ============================================================

const ASSET_TYPES = [
  "script", "thumbnail", "raw_video", "final_video",
  "caption", "prompt", "canva_link", "google_drive_link",
  "reference", "other",
];

const STORAGE_PROVIDERS = ["local", "medusa", "s3", "google_drive", "canva"];

export const createTaskAssetSchema = z.object({
  asset_type: z.enum(ASSET_TYPES, { error: "Asset type không hợp lệ" }),
  title: z.string().max(255).optional().default(""),
  description: z.string().max(5000).optional(),
  file_name: z.string().min(1, "File name không được để trống").max(500),
  file_url: z.string().url().optional().or(z.literal("")),
  mime_type: z.string().max(100).optional(),
  file_size: z.number().int().min(0).max(1e12).optional(),
  storage_provider: z.enum(STORAGE_PROVIDERS).default("local"),
  original_url: z.string().url().optional().or(z.literal("")),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const createExternalLinkAssetSchema = z.object({
  asset_type: z.enum(["canva_link", "google_drive_link", "reference", "other"], {
    error: "Asset type không hợp lệ cho external link",
  }),
  title: z.string().min(1, "Tiêu đề không được để trống").max(255),
  description: z.string().max(5000).optional(),
  file_url: z.string().url({ message: "URL không hợp lệ" }),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

// ============================================================
// Approval Schemas — P6.3
// ============================================================

const APPROVAL_ACTIONS = [
  "submit_review", "approve", "reject", "request_revision", "publish",
];

export const performApprovalSchema = z.object({
  action: z.enum(APPROVAL_ACTIONS, { error: "Action không hợp lệ" }),
  comment: z.string().max(5000).optional(),
});

// ============================================================
// Validation Helper
// ============================================================

export interface ValidationError {
  field: string;
  message: string;
}

export function buildValidationResponse(
  issues: z.ZodIssue[]
): NextResponse {
  const details: ValidationError[] = issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message || "Giá trị không hợp lệ",
  }));

  return NextResponse.json(
    {
      error: "Dữ liệu không hợp lệ",
      code: "VALIDATION_ERROR",
      message:
        details.length === 1
          ? details[0].message
          : `Có ${details.length} lỗi validation`,
      details,
    },
    { status: 400 }
  );
}
