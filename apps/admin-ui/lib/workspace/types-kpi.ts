// ============================================================
// KPI Types — P6.6 KPI & Performance Analytics
// ============================================================

// ─── Overview KPI ────────────────────────────────────────────────

export interface WorkspaceKpiOverview {
  // Task counts
  tasksInProgress: number;
  tasksPublished: number;
  tasksOverdue: number;
  tasksDueThisWeek: number;
  // Approval metrics (30d)
  approvalsApproved30d: number;
  approvalsRejected30d: number;
  approvalsSubmitted30d: number;
  // Published by platform
  publishedFacebook: number;
  publishedWebsite: number;
  publishedTiktok: number;
  publishedYoutube: number;
  publishedZalo: number;
  // Misc
  approvedNotPublished: number;
  publishedThisMonth: number;
  publishedThisWeek: number;
  // Campaigns
  activeCampaigns: number;
  overdueCampaigns: number;
  // Interns
  activeInterns: number;
}

// ─── User KPI ───────────────────────────────────────────────────

export interface UserKpi {
  userId: string;
  userName: string;
  role: string;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksOverdue: number;
  tasksDueThisWeek: number;
  approvalsApproved30d: number;
  approvalsRejected30d: number;
  published30d: number;
  avgCompletionDays: number;
  completionRate: number;   // tasksCompleted / tasksAssigned (0–1)
  overdueRate: number;       // tasksOverdue / tasksAssigned (0–1)
}

// ─── Weekly Trend ───────────────────────────────────────────────

export interface WeeklyTrendPoint {
  weekStart: string;   // ISO date
  completed: number;
  approved: number;
  published: number;
}

// ─── Content KPI ───────────────────────────────────────────────

export interface ContentKpi {
  totalTasks: number;
  inProgress: number;
  published: number;
  overdue: number;
  approvedNotPublished: number;
  scheduled: number;
  byPlatform: Record<string, number>;
  publishedThisWeek: number;
  publishedThisMonth: number;
}

// ─── Campaign KPI ───────────────────────────────────────────────

export interface CampaignKpi {
  total: number;
  active: number;
  completed: number;
  overdue: number;
  completionRate: number; // completed / (active + completed)
}

// ─── Permission helpers ─────────────────────────────────────────

export type KpiRole = "viewer" | "editor" | "admin" | "super_admin";

export function canViewUserKpi(role: KpiRole): boolean {
  return role !== "viewer";
}

export function canViewTeamKpi(role: KpiRole): boolean {
  return role === "admin" || role === "super_admin";
}
