"use client";

import { useState } from "react";
import type { Intern, InternRanking } from "@/lib/workspace/types";
import { InternCard } from "@/components/interns/intern-card";
import { InternRankingTable } from "@/components/interns/intern-ranking-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, GraduationCap, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { POSITION_LABELS } from "@/lib/workspace/types";

interface InternsClientProps {
  interns: Intern[];
  rankings: InternRanking[];
}

export function InternsClient({ interns, rankings }: InternsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");

  const filtered = interns.filter((intern) => {
    if (search && !intern.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (positionFilter !== "all" && intern.position !== positionFilter) return false;
    return true;
  });

  const topRankings = rankings.slice(0, 3);

  const stats = {
    total: interns.length,
    content: interns.filter((i) => i.position === "content_intern").length,
    video: interns.filter((i) => i.position === "video_intern").length,
    design: interns.filter((i) => i.position === "design_intern").length,
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-xs text-slate-500">Tổng thực tập sinh</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.content}</div>
          <div className="text-xs text-slate-500">Content</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.video}</div>
          <div className="text-xs text-slate-500">Video</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.design}</div>
          <div className="text-xs text-slate-500">Design</div>
        </div>
      </div>

      {/* Top performers */}
      {topRankings.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="size-5 text-yellow-600" />
            <h3 className="font-semibold text-slate-900">Top performers tuần này</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {topRankings.map((ranking, i) => {
              const intern = interns.find((int) => int.id === ranking.intern_id);
              if (!intern) return null;
              return (
                <div
                  key={ranking.id}
                  className="flex items-center gap-3 bg-white rounded-lg p-3 border border-yellow-100 cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => router.push(`/interns/${intern.id}`)}
                >
                  <div className="text-2xl">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{intern.full_name}</div>
                    <div className="text-xs text-slate-500">
                      {Number(ranking.overall_score).toFixed(1)} điểm
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs: Grid / Ranking */}
      <Tabs defaultValue="grid" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="grid" className="gap-1.5">
              <GraduationCap className="size-4" />
              Danh sách
            </TabsTrigger>
            <TabsTrigger value="ranking" className="gap-1.5">
              <Trophy className="size-4" />
              Xếp hạng
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Tìm kiếm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 w-[200px]"
              />
            </div>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Vị trí" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả vị trí</SelectItem>
                {Object.entries(POSITION_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="grid" className="mt-0">
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((intern) => {
                const ranking = rankings.find((r) => r.intern_id === intern.id);
                return (
                  <InternCard
                    key={intern.id}
                    intern={intern}
                    ranking={ranking ?? null}
                    onClick={() => router.push(`/interns/${intern.id}`)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <GraduationCap className="size-12 text-slate-300 mb-3" />
              <h3 className="text-lg font-semibold text-slate-600">Không tìm thấy thực tập sinh</h3>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ranking" className="mt-0">
          <InternRankingTable rankings={rankings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
