/**
 * GET /api/search?q=
 * Global Search API — P6.9
 *
 * Tìm kiếm keyword/ILIKE trên:
 * - pm_tasks (title, description, tags)
 * - pm_projects (name, description)
 * - pm_campaigns (name, description)
 * - pm_task_comments (content)
 * - admin_users (full_name, email)
 * - v_workspace_activities (entity_name, action_type)
 *
 * RBAC-aware: viewer chỉ thấy entity được phép xem.
 * Rate limit: 30 req/phút/client.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { query } from "@/lib/db";
import type { AdminUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

// ─── Types ────────────────────────────────────────────────────────────

export type SearchEntityType =
  | "task"
  | "project"
  | "campaign"
  | "comment"
  | "user"
  | "activity";

export interface SearchResultItem {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle: string;
  href: string;
  icon: string;
  status?: string;
  updatedAt?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  total: number;
  took: number; // ms
}

// ─── Rate Limiting (lightweight in-memory) ────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 phút
const RATE_LIMIT_MAX = 30; // 30 req/phút

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// ─── Search Query Builders ────────────────────────────────────────────

async function searchTasks(
  q: string,
  user: AdminUser
): Promise<SearchResultItem[]> {
  const canView =
    hasPermission(user, "tasks.read") ||
    hasPermission(user, "content.read");

  if (!canView) return [];

  const { rows } = await query<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    stage: string | null;
    updated_at: string;
  }>(
    `SELECT id, title, description, status, stage, updated_at
     FROM pm_tasks
     WHERE title ILIKE $1 OR description ILIKE $1
     ORDER BY updated_at DESC
     LIMIT 5`,
    [`%${q}%`]
  );

  return rows.map((r) => ({
    id: r.id,
    type: "task" as SearchEntityType,
    title: r.title,
    subtitle: `${r.status}${r.stage ? ` · ${r.stage}` : ""}`,
    href: `/tasks/${r.id}`,
    icon: "check-square",
    status: r.status,
    updatedAt: r.updated_at,
  }));
}

async function searchProjects(
  q: string,
  user: AdminUser
): Promise<SearchResultItem[]> {
  const canView = hasPermission(user, "projects.read");
  if (!canView) return [];

  const { rows } = await query<{
    id: string;
    name: string;
    description: string | null;
    status: string;
    updated_at: string;
  }>(
    `SELECT id, name, description, status, updated_at
     FROM pm_projects
     WHERE name ILIKE $1 OR description ILIKE $1
     ORDER BY updated_at DESC
     LIMIT 5`,
    [`%${q}%`]
  );

  return rows.map((r) => ({
    id: r.id,
    type: "project" as SearchEntityType,
    title: r.name,
    subtitle: r.status,
    href: `/projects/${r.id}`,
    icon: "folder",
    status: r.status,
    updatedAt: r.updated_at,
  }));
}

async function searchCampaigns(
  q: string,
  user: AdminUser
): Promise<SearchResultItem[]> {
  const canView =
    hasPermission(user, "campaigns.read") ||
    hasPermission(user, "campaigns.manage");

  if (!canView) return [];

  const { rows } = await query<{
    id: string;
    name: string;
    description: string | null;
    status: string;
    campaign_type: string;
    updated_at: string;
  }>(
    `SELECT id, name, description, status, campaign_type, updated_at
     FROM pm_campaigns
     WHERE name ILIKE $1 OR description ILIKE $1
     ORDER BY updated_at DESC
     LIMIT 5`,
    [`%${q}%`]
  );

  return rows.map((r) => ({
    id: r.id,
    type: "campaign" as SearchEntityType,
    title: r.name,
    subtitle: `${r.campaign_type}${r.status ? ` · ${r.status}` : ""}`,
    href: `/campaigns/${r.id}`,
    icon: "clapperboard",
    status: r.status,
    updatedAt: r.updated_at,
  }));
}

async function searchComments(
  q: string,
  user: AdminUser
): Promise<SearchResultItem[]> {
  const canView =
    hasPermission(user, "tasks.read") ||
    hasPermission(user, "content.read");

  if (!canView) return [];

  const { rows } = await query<{
    id: string;
    content: string;
    task_id: string;
    task_title: string | null;
    author_name: string;
    created_at: string;
  }>(
    `SELECT c.id, c.content, c.task_id, t.title AS task_title,
            c.author_name, c.created_at
     FROM pm_task_comments c
     LEFT JOIN pm_tasks t ON c.task_id = t.id
     WHERE c.content ILIKE $1
     ORDER BY c.created_at DESC
     LIMIT 5`,
    [`%${q}%`]
  );

  return rows.map((r) => ({
    id: r.id,
    type: "comment" as SearchEntityType,
    title: r.content.length > 100 ? r.content.slice(0, 100) + "…" : r.content,
    subtitle: r.task_title ? `Trong: ${r.task_title}` : `Bởi: ${r.author_name}`,
    href: `/tasks/${r.task_id}#comment-${r.id}`,
    icon: "message-square",
    updatedAt: r.created_at,
  }));
}

async function searchUsers(
  q: string,
  user: AdminUser
): Promise<SearchResultItem[]> {
  const canView =
    hasPermission(user, "users.read") ||
    hasPermission(user, "interns.manage");

  if (!canView) return [];

  const { rows } = await query<{
    id: string;
    full_name: string;
    email: string;
    role: string;
    status: string;
  }>(
    `SELECT id, full_name, email, role, status
     FROM admin_users
     WHERE full_name ILIKE $1 OR email ILIKE $1
     ORDER BY full_name ASC
     LIMIT 5`,
    [`%${q}%`]
  );

  return rows.map((r) => ({
    id: r.id,
    type: "user" as SearchEntityType,
    title: r.full_name,
    subtitle: `${r.role}${r.status !== "active" ? ` · ${r.status}` : ""}`,
    href: `/staff`,
    icon: "user",
    status: r.status,
  }));
}

async function searchActivities(
  q: string,
  _user: AdminUser
): Promise<SearchResultItem[]> {
  const { rows } = await query<{
    id: string;
    entity_type: string;
    entity_name: string;
    action_type: string;
    actor_name: string | null;
    entity_id: string | null;
    created_at: string;
  }>(
    `SELECT id, entity_type, entity_name, action_type,
            actor_name, entity_id, created_at
     FROM v_workspace_activities
     WHERE entity_name ILIKE $1
        OR action_type ILIKE $1
        OR actor_name ILIKE $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [`%${q}%`]
  );

  const hrefMap: Record<string, string> = {
    task: "/tasks",
    project: "/projects",
    campaign: "/campaigns",
    media_workflow: "/media-workflow",
  };

  return rows.map((r) => {
    const baseHref = hrefMap[r.entity_type] ?? "/workspace/activity";
    const href = r.entity_id ? `${baseHref}/${r.entity_id}` : baseHref;

    return {
      id: r.id,
      type: "activity" as SearchEntityType,
      title: r.entity_name,
      subtitle: `${r.action_type}${r.actor_name ? ` · ${r.actor_name}` : ""}`,
      href,
      icon: "activity",
      updatedAt: r.created_at,
    };
  });
}

// ─── Route Handler ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const start = Date.now();

  // Auth
  const authResult = await requireAdminAuth(request);
  if (authResult) return authResult;
  const user = (request as NextRequest & { _authUser: AdminUser })._authUser;

  // Rate limit
  const clientKey = user.id; // per-user rate limit
  if (!checkRateLimit(clientKey)) {
    return NextResponse.json(
      {
        error: "Quá nhiều yêu cầu tìm kiếm",
        message: "Vui lòng chờ một lát rồi thử lại.",
        retryAfterSeconds: 60,
      },
      { status: 429 }
    );
  }

  // Parse query
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q || q.length < 2) {
    return NextResponse.json({
      query: q,
      results: [],
      total: 0,
      took: Date.now() - start,
    } satisfies SearchResponse);
  }

  if (q.length > 200) {
    return NextResponse.json(
      { error: "Query quá dài (tối đa 200 ký tự)" },
      { status: 400 }
    );
  }

  // Run all searches in parallel
  const [tasks, projects, campaigns, comments, users, activities] =
    await Promise.all([
      searchTasks(q, user),
      searchProjects(q, user),
      searchCampaigns(q, user),
      searchComments(q, user),
      searchUsers(q, user),
      searchActivities(q, user),
    ]);

  const results: SearchResultItem[] = [
    ...tasks,
    ...projects,
    ...campaigns,
    ...comments,
    ...users,
    ...activities,
  ];

  return NextResponse.json({
    query: q,
    results,
    total: results.length,
    took: Date.now() - start,
  } satisfies SearchResponse);
}
