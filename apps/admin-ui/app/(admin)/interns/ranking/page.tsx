import { getInternRankings } from "@/lib/workspace/db";
import { InternRankingTable } from "@/components/interns/intern-ranking-table";
import { Trophy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function InternsRankingPage() {
  const [weeklyRankings, monthlyRankings] = await Promise.all([
    getInternRankings("weekly", 20),
    getInternRankings("monthly", 20),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-yellow-50 flex items-center justify-center">
          <Trophy className="size-5 text-yellow-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bảng xếp hạng</h1>
          <p className="text-sm text-slate-500">Xếp hạng thực tập sinh theo tuần và tháng</p>
        </div>
      </div>

      <Tabs defaultValue="weekly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="weekly">Tuần này</TabsTrigger>
          <TabsTrigger value="monthly">Tháng này</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <InternRankingTable rankings={weeklyRankings} />
        </TabsContent>

        <TabsContent value="monthly">
          <InternRankingTable rankings={monthlyRankings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
