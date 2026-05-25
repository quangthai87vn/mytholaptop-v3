"use client";

import { cn } from "@/lib/utils";
import type { Intern, InternRanking, InternKPI } from "@/lib/workspace/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { POSITION_LABELS } from "@/lib/workspace/types";
import { TrendingUp, TrendingDown, Minus, Award, Target, Clock, Star } from "lucide-react";

interface InternCardProps {
  intern: Intern;
  ranking?: InternRanking | null;
  kpi?: InternKPI | null;
  onClick?: () => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-red-100 text-red-700",
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-purple-100 text-purple-700",
    "bg-yellow-100 text-yellow-700",
    "bg-pink-100 text-pink-700",
    "bg-indigo-100 text-indigo-700",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

export function InternCard({ intern, ranking, kpi, onClick }: InternCardProps) {
  const score = Number(ranking?.overall_score ?? kpi?.quality_score ?? 0);
  const trend = ranking?.trend ?? "stable";

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer overflow-hidden"
    >
      <div className="p-5">
        {/* Top row: avatar + rank + status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="size-12">
                <AvatarFallback className={getAvatarColor(intern.full_name)}>
                  {getInitials(intern.full_name)}
                </AvatarFallback>
              </Avatar>
              {ranking && ranking.overall_rank <= 3 && (
                <div className="absolute -top-1 -right-1 size-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    backgroundColor: ranking.overall_rank === 1 ? "#FFD700" : ranking.overall_rank === 2 ? "#C0C0C0" : "#CD7F32",
                    color: ranking.overall_rank === 1 ? "#7C4000" : "#fff",
                  }}
                >
                  {ranking.overall_rank === 1 ? "🥇" : ranking.overall_rank === 2 ? "🥈" : "🥉"}
                </div>
              )}
            </div>

            {/* Name & info */}
            <div>
              <h3 className="font-semibold text-slate-900 text-sm leading-tight">
                {intern.full_name}
              </h3>
              {intern.university && (
                <p className="text-xs text-slate-500 truncate max-w-[150px]">
                  {intern.university}
                </p>
              )}
            </div>
          </div>

          {/* Status badge */}
          <Badge
            className={cn(
              "text-[10px] px-1.5 py-0 h-5",
              intern.status === "active"
                ? "bg-green-100 text-green-700 border-green-200"
                : "bg-slate-100 text-slate-500 border-slate-200"
            )}
          >
            {intern.status === "active" ? "Hoạt động" : intern.status}
          </Badge>
        </div>

        {/* Position badge */}
        <div className="mb-3">
          <Badge variant="outline" className="text-xs">
            {POSITION_LABELS[intern.position] ?? intern.position}
          </Badge>
        </div>

        {/* Score circle */}
        {ranking && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="relative size-12">
                <svg className="size-12 -rotate-90">
                  <circle
                    cx="24" cy="24" r="20"
                    fill="none"
                    stroke="hsl(220 14% 90%)"
                    strokeWidth="4"
                  />
                  <circle
                    cx="24" cy="24" r="20"
                    fill="none"
                    stroke={score >= 85 ? "#22c55e" : score >= 70 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="4"
                    strokeDasharray={`${(score / 100) * 125.6} 125.6`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-slate-700">{score.toFixed(0)}</span>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                <div className="font-medium text-slate-700">Điểm tổng</div>
                <div className="flex items-center gap-1">
                  {trend === "up" && <TrendingUp className="size-3 text-green-500" />}
                  {trend === "down" && <TrendingDown className="size-3 text-red-500" />}
                  {trend === "stable" && <Minus className="size-3 text-slate-400" />}
                  <span className={
                    trend === "up" ? "text-green-600" :
                    trend === "down" ? "text-red-600" : "text-slate-400"
                  }>
                    {trend === "up" ? "Tăng" : trend === "down" ? "Giảm" : "Ổn định"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPI metrics */}
        {kpi && (
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-slate-500">
                <Target className="size-3" />
                <span>Hoàn thành</span>
              </div>
              <span className="font-medium text-slate-700">
                {kpi.tasks_completed}/{kpi.tasks_assigned}
              </span>
            </div>
            <Progress value={kpi.completion_rate} className="h-1.5" />

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-slate-500">
                <Clock className="size-3" />
                <span>Đúng hạn</span>
              </div>
              <span className="font-medium text-slate-700">
                {kpi.deadline_accuracy.toFixed(0)}%
              </span>
            </div>
            <Progress value={kpi.deadline_accuracy} className="h-1.5" />
          </div>
        )}

        {/* Skills */}
        {intern.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-100">
            {intern.skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]"
              >
                {skill.replace(/_/g, " ")}
              </span>
            ))}
            {intern.skills.length > 3 && (
              <span className="text-slate-400 text-[10px]">
                +{intern.skills.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
