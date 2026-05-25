import { getInterns, getInternRankings } from "@/lib/workspace/db";
import { InternCard } from "@/components/interns/intern-card";
import { GraduationCap } from "lucide-react";
import { InternsClient } from "./interns-client";

export const dynamic = "force-dynamic";

export default async function InternsPage() {
  const [interns, rankings] = await Promise.all([
    getInterns({ status: "active" }),
    getInternRankings("weekly", 10),
    Promise.resolve([]), // KPIs loaded client-side per intern
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <GraduationCap className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Thực tập sinh</h1>
            <p className="text-sm text-slate-500">
              Quản lý và theo dõi thực tập sinh
            </p>
          </div>
        </div>
      </div>

      <InternsClient
        interns={interns}
        rankings={rankings}
      />
    </div>
  );
}
