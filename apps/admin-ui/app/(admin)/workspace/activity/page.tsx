import { query } from "@/lib/db";
import { Activity } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WorkspaceActivityPage() {
  const { rows: activities } = await query<{
    id: string;
    actor_name: string | null;
    action: string;
    new_value: string | null;
    field_changed: string | null;
    old_value: string | null;
    created_at: string;
    task_id: string | null;
  }>(`
    SELECT ta.id, ta.actor_name, ta.action, ta.new_value, ta.field_changed, ta.old_value, ta.created_at, ta.task_id
    FROM pm_task_activities ta
    ORDER BY ta.created_at DESC
    LIMIT 100
  `);

  const actionLabels: Record<string, string> = {
    created: "đã tạo",
    updated: "đã cập nhật",
    status_changed: "đã chuyển trạng thái",
    assigned: "đã giao",
    commented: "đã bình luận",
    attached: "đã đính kèm",
  };

  const statusLabels: Record<string, string> = {
    backlog: "Backlog",
    todo: "To Do",
    in_progress: "In Progress",
    review: "Review",
    done: "Done",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Activity className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hoạt động</h1>
          <p className="text-sm text-slate-500">
            Lịch sử hoạt động của team
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-xs font-bold text-slate-600">
                {activity.actor_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">
                    {activity.actor_name ?? "Hệ thống"}
                  </span>{" "}
                  {actionLabels[activity.action] ?? activity.action}
                  {activity.field_changed === "status" && activity.new_value && (
                    <span className="text-slate-500">
                      {" → "}
                      <span className="font-medium">
                        {statusLabels[activity.new_value] ?? activity.new_value}
                      </span>
                    </span>
                  )}
                  {activity.new_value && activity.field_changed !== "status" && (
                    <span className="text-slate-500"> "{activity.new_value}"</span>
                  )}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(activity.created_at).toLocaleString("vi-VN")}
                </p>
              </div>
            </div>
          ))}

          {activities.length === 0 && (
            <p className="text-center text-slate-500 py-8">Chưa có hoạt động nào</p>
          )}
        </div>
      </div>
    </div>
  );
}
