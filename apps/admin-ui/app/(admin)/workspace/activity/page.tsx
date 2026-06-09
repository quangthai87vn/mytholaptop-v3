import { Activity } from "lucide-react";
import { getActivities } from "@/lib/workspace/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import ActivityClient from "@/components/activity/activity-client";

export const dynamic = "force-dynamic";

export default async function WorkspaceActivityPage() {
  const user = await getCurrentUser();
  const isIntern = user?.role === "intern";

  const initialData = await getActivities({
    page: 1,
    pageSize: 20,
    // Interns only see their own activities or activities on their assigned tasks
    internId: isIntern ? user!.id : undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Activity className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nhật ký hoạt động</h1>
          <p className="text-sm text-slate-500">
            Lịch sử thay đổi của Task, Project, Campaign và tài khoản Admin
          </p>
        </div>
      </div>

      <ActivityClient initialData={initialData} currentUser={user} />
    </div>
  );
}
