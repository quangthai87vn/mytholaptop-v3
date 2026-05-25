"use client";

import { cn } from "@/lib/utils";
import type { Intern, InternRanking } from "@/lib/workspace/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { POSITION_LABELS } from "@/lib/workspace/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface InternRankingTableProps {
  rankings: InternRanking[];
  periodType?: "weekly" | "monthly";
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = ["bg-red-100 text-red-700", "bg-blue-100 text-blue-700", "bg-green-100 text-green-700", "bg-purple-100 text-purple-700", "bg-yellow-100 text-yellow-700"];
  return colors[name.charCodeAt(0) % colors.length];
}

export function InternRankingTable({ rankings }: InternRankingTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead>Thực tập sinh</TableHead>
            <TableHead>Vị trí</TableHead>
            <TableHead className="text-center">Hoàn thành</TableHead>
            <TableHead className="text-center">Đúng hạn</TableHead>
            <TableHead className="text-center">Chất lượng</TableHead>
            <TableHead className="text-center">Tổng điểm</TableHead>
            <TableHead className="text-center">Xu hướng</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((ranking) => {
            const intern = ranking.intern;
            if (!intern) return null;
            const isTop3 = ranking.overall_rank <= 3;

            return (
              <TableRow
                key={ranking.id}
                className={cn(
                  "cursor-pointer hover:bg-slate-50 transition-colors",
                  isTop3 && "bg-yellow-50/50"
                )}
                onClick={() => (window.location.href = `/interns/${ranking.intern_id}`)}
              >
                {/* Rank */}
                <TableCell className="text-center">
                  {ranking.overall_rank === 1 ? (
                    <span className="text-lg">🥇</span>
                  ) : ranking.overall_rank === 2 ? (
                    <span className="text-lg">🥈</span>
                  ) : ranking.overall_rank === 3 ? (
                    <span className="text-lg">🥉</span>
                  ) : (
                    <span className="font-medium text-slate-500">{ranking.overall_rank}</span>
                  )}
                </TableCell>

                {/* Name */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className={getAvatarColor(intern.full_name)}>
                        {getInitials(intern.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-slate-900 text-sm">{intern.full_name}</div>
                      {intern.university && (
                        <div className="text-xs text-slate-500">{intern.university}</div>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Position */}
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {POSITION_LABELS[intern.position as keyof typeof POSITION_LABELS] ?? intern.position}
                  </Badge>
                </TableCell>

                {/* Completion */}
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-medium">
                      {Number(ranking.productivity_score).toFixed(0)}%
                    </span>
                    <Progress
                      value={Number(ranking.productivity_score)}
                      className="h-1 w-16"
                    />
                  </div>
                </TableCell>

                {/* Deadline */}
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-medium">
                      {Number(ranking.deadline_score).toFixed(0)}%
                    </span>
                    <Progress
                      value={Number(ranking.deadline_score)}
                      className="h-1 w-16"
                    />
                  </div>
                </TableCell>

                {/* Quality */}
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg
                        key={i}
                        className={cn(
                          "size-3",
                          i < Math.round(Number(ranking.quality_score) / 20)
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-slate-200"
                        )}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="ml-1 text-xs text-slate-500">
                      {Number(ranking.quality_score).toFixed(1)}
                    </span>
                  </div>
                </TableCell>

                {/* Overall score */}
                <TableCell className="text-center">
                  <span className={cn(
                    "inline-flex items-center justify-center size-8 rounded-full text-sm font-bold",
                    Number(ranking.overall_score) >= 85 ? "bg-green-100 text-green-700" :
                    Number(ranking.overall_score) >= 70 ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    {Number(ranking.overall_score).toFixed(0)}
                  </span>
                </TableCell>

                {/* Trend */}
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {ranking.trend === "up" && (
                      <TrendingUp className="size-4 text-green-500" />
                    )}
                    {ranking.trend === "down" && (
                      <TrendingDown className="size-4 text-red-500" />
                    )}
                    {ranking.trend === "stable" && (
                      <Minus className="size-4 text-slate-400" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}

          {rankings.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                Chưa có dữ liệu xếp hạng
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
