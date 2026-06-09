import {
  getWorkspaceStats,
  getTasks,
  getInternRankings,
  getProjects,
  getInterns,
  getOverdueCampaigns,
} from "@/lib/workspace/db";
import { query } from "@/lib/db";
import { WorkspaceStatsWidget } from "@/components/dashboard/workspace-stats-widget";
import { DeadlineAlertWidget } from "@/components/dashboard/deadline-alert-widget";
import { CampaignAlertWidget } from "@/components/dashboard/campaign-alert-widget";
import { MediaStatsWidget } from "@/components/dashboard/media-stats-widget";
import { TeamActivityWidget } from "@/components/dashboard/team-activity-widget";
import { ContentCalendarWidget } from "@/components/dashboard/content-calendar-widget";
import { NotificationAlertWidget } from "@/components/dashboard/notification-alert-widget";
import { TeamPerformanceWidget } from "@/components/dashboard/team-performance-widget";
import { ContentPipelineWidget } from "@/components/dashboard/content-pipeline-widget";
import { ApprovalMetricsWidget } from "@/components/dashboard/approval-metrics-widget";
import { PublishMetricsWidget } from "@/components/dashboard/publish-metrics-widget";
import { KpiCharts } from "@/components/dashboard/kpi-charts";
import { TasksByEmployeeWidget } from "@/components/dashboard/tasks-by-employee-widget";
import { OverdueTasksWidget } from "@/components/dashboard/overdue-tasks-widget";
import { CampaignProgressWidget } from "@/components/dashboard/campaign-progress-widget";
import { TasksCompletedThisWeekWidget } from "@/components/dashboard/tasks-completed-week-widget";
import { Kanban } from "lucide-react";
import { InternCard } from "@/components/interns/intern-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Target, CheckSquare, Clapperboard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const [stats, tasks, rankings, projects, interns, overdueCampaigns] = await Promise.all([
    getWorkspaceStats(),
    getTasks(),
    getInternRankings("weekly", 5),
    getProjects(),
    getInterns({ status: "active" }),
    getOverdueCampaigns(),
  ]);

  // Fetch recent activities (use view for unified activity stream)
  const { rows: rawActivities } = await query<{
    id: string;
    actor_name: string | null;
    action_type: string;
    new_value: string | null;
    created_at: string;
  }>(`
    SELECT id, actor_name, action_type, new_value, created_at
    FROM v_workspace_activities
    ORDER BY created_at DESC
    LIMIT 15
  `);
  const activities = rawActivities.map((r) => ({ ...r, action: r.action_type }));

  const topInternRankings = rankings.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Kanban className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Workspace</h1>
            <p className="text-sm text-slate-500">
              Tổng quan dự án, công việc và nội dung
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <Link href="/projects">
            <Button variant="outline" size="sm" className="gap-2">
              <Target className="size-4" />
              Dự án
            </Button>
          </Link>
          <Link href="/tasks">
            <Button variant="outline" size="sm" className="gap-2">
              <CheckSquare className="size-4" />
              Công việc
            </Button>
          </Link>
          <Link href="/media-workflow">
            <Button variant="outline" size="sm" className="gap-2">
              <Clapperboard className="size-4" />
              Media
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <WorkspaceStatsWidget stats={stats} />

      {/* Content calendar widget */}
      <ContentCalendarWidget />

      {/* Notification alerts */}
      <NotificationAlertWidget />

      {/* Row 1: Team performance + Content pipeline + Campaign progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <TeamPerformanceWidget />
        <ContentPipelineWidget />
        <CampaignProgressWidget />
      </div>

      {/* Row 2: Tasks by employee + Overdue tasks + Tasks completed this week */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <TasksByEmployeeWidget />
        <OverdueTasksWidget />
        <TasksCompletedThisWeekWidget />
      </div>

      {/* Row 3: Publish metrics + Weekly trend chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <PublishMetricsWidget />
        </div>
        <div className="lg:col-span-2">
          <KpiCharts weeks={8} />
        </div>
      </div>

      {/* Row 4: Approval metrics */}
      <ApprovalMetricsWidget />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Campaign overdue alerts */}
          {overdueCampaigns.length > 0 && (
            <CampaignAlertWidget campaigns={overdueCampaigns} />
          )}

          {/* Deadline alerts */}
          <DeadlineAlertWidget tasks={tasks} />

          {/* Media stats */}
          <MediaStatsWidget tasks={tasks} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Team activity */}
          <TeamActivityWidget activities={activities} />

          {/* Top interns */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 text-sm">
                Top thực tập sinh tuần này
              </h3>
              <Link href="/interns/ranking">
                <Button variant="ghost" size="sm" className="text-xs h-7 text-slate-500">
                  Xem bảng xếp hạng →
                </Button>
              </Link>
            </div>

            {topInternRankings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {topInternRankings.map((ranking) => {
                  const internData = interns.find((i) => i.id === ranking.intern_id);
                  if (!internData) return null;
                  return (
                    <InternCard
                      key={ranking.id}
                      intern={internData}
                      ranking={ranking}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-slate-500">Chưa có dữ liệu thực tập sinh</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent projects */}
      {projects.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">Dự án gần đây</h3>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="text-xs h-7 text-slate-500">
                Tất cả dự án →
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {projects.slice(0, 4).map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="p-4 rounded-lg border border-slate-200 hover:border-primary/30 hover:shadow-sm transition-all group"
              >
                <div
                  className="size-2 rounded-full mb-3"
                  style={{ backgroundColor: project.color || "#E60012" }}
                />
                <h4 className="font-medium text-sm text-slate-900 group-hover:text-primary transition-colors truncate">
                  {project.name}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {project._count?.tasks ?? 0} công việc
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
