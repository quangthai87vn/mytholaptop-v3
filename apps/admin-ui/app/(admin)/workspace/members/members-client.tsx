"use client";

import { useState } from "react";
import type { WorkspaceMember } from "@/lib/workspace/types";
import { MEMBER_TYPE_LABELS, JOB_ROLE_LABELS } from "@/lib/workspace/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  CheckSquare,
  TrendingUp,
  Search,
  BadgeCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { ROLE_BADGE_COLORS } from "@/lib/auth/permissions";

interface MembersClientProps {
  initialMembers: WorkspaceMember[];
  initialStats: {
    total: number;
    active: number;
    tasksAssigned: number;
    avgCompletion: number;
  };
}

function MemberRow({ member }: { member: WorkspaceMember }) {
  const roleColors = ROLE_BADGE_COLORS[member.systemRole as keyof typeof ROLE_BADGE_COLORS] || ROLE_BADGE_COLORS.viewer;
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      {/* Avatar + Name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {member.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.avatarUrl}
              alt={member.fullName}
              className="size-9 rounded-full object-cover"
            />
          ) : (
            <div className="size-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600">
              {member.fullName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-medium text-slate-900 text-sm">{member.fullName}</div>
            <div className="text-xs text-slate-500">{member.email}</div>
          </div>
        </div>
      </td>
      {/* Member Type */}
      <td className="px-4 py-3">
        <Badge variant="outline" className="text-xs">
          {MEMBER_TYPE_LABELS[member.memberType]}
        </Badge>
      </td>
      {/* Job Role */}
      <td className="px-4 py-3 text-sm text-slate-700">
        {JOB_ROLE_LABELS[member.jobRole]}
      </td>
      {/* System Role */}
      <td className="px-4 py-3">
        <Badge className={`text-xs ${roleColors}`}>
          {member.systemRole}
        </Badge>
      </td>
      {/* Tasks */}
      <td className="px-4 py-3 text-center">
        <span className="text-sm font-medium text-slate-700">{member.stats.tasksAssigned}</span>
      </td>
      {/* Completed */}
      <td className="px-4 py-3 text-center">
        <span className="text-sm font-medium text-green-600">{member.stats.tasksCompleted}</span>
      </td>
      {/* Overdue */}
      <td className="px-4 py-3 text-center">
        {member.stats.tasksOverdue > 0 ? (
          <span className="text-sm font-medium text-red-600 flex items-center justify-center gap-1">
            <AlertCircle className="size-3" />
            {member.stats.tasksOverdue}
          </span>
        ) : (
          <span className="text-sm text-slate-400">0</span>
        )}
      </td>
      {/* KPI */}
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                member.stats.completionRate >= 80 ? "bg-green-500" :
                member.stats.completionRate >= 50 ? "bg-yellow-500" : "bg-red-500"
              }`}
              style={{ width: `${member.stats.completionRate}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-600 w-8 text-right">
            {member.stats.completionRate}%
          </span>
        </div>
      </td>
      {/* Status */}
      <td className="px-4 py-3">
        {member.status === "active" ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600">
            <BadgeCheck className="size-3.5" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <AlertCircle className="size-3.5" />
            Inactive
          </span>
        )}
      </td>
    </tr>
  );
}

export function MembersClient({ initialMembers, initialStats }: MembersClientProps) {
  const [search, setSearch] = useState("");
  const [memberTypeFilter, setMemberTypeFilter] = useState("all");
  const [jobRoleFilter, setJobRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [stats] = useState(initialStats);
  const [members] = useState(initialMembers);

  const filtered = members.filter((m) => {
    if (search && !m.fullName.toLowerCase().includes(search.toLowerCase()) &&
        !m.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (memberTypeFilter !== "all" && m.memberType !== memberTypeFilter) return false;
    if (jobRoleFilter !== "all" && m.jobRole !== jobRoleFilter) return false;
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="size-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                <div className="text-xs text-slate-500">Tổng nhân sự</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
                <UserCheck className="size-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.active}</div>
                <div className="text-xs text-slate-500">Đang hoạt động</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <CheckSquare className="size-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.tasksAssigned}</div>
                <div className="text-xs text-slate-500">Công việc đang làm</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="size-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.avgCompletion}%</div>
                <div className="text-xs text-slate-500">Tỷ lệ hoàn thành</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Tìm theo tên, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={memberTypeFilter} onValueChange={setMemberTypeFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Loại nhân sự" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value="intern">Thực tập sinh</SelectItem>
            <SelectItem value="employee">Nhân viên</SelectItem>
            <SelectItem value="freelancer">Freelancer</SelectItem>
            <SelectItem value="collaborator">Cộng tác viên</SelectItem>
          </SelectContent>
        </Select>

        <Select value={jobRoleFilter} onValueChange={setJobRoleFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả vai trò</SelectItem>
            <SelectItem value="content_writer">Content Writer</SelectItem>
            <SelectItem value="designer">Designer</SelectItem>
            <SelectItem value="video_editor">Video Editor</SelectItem>
            <SelectItem value="seo">SEO</SelectItem>
            <SelectItem value="reviewer">Reviewer</SelectItem>
            <SelectItem value="social_media">Social Media</SelectItem>
            <SelectItem value="photographer">Photographer</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 text-slate-400 animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Nhân sự</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Loại</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Vai trò</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">System Role</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Đang làm</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Hoàn thành</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Quá hạn</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">KPI</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <MemberRow key={member.id} member={member} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-dashed border-slate-300">
          <Users className="size-12 text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-600">Không tìm thấy nhân sự</h3>
          <p className="text-sm text-slate-400 mt-1">
            {search ? `Không có kết quả cho "${search}"` : "Chưa có nhân sự nào trong workspace."}
          </p>
        </div>
      )}
    </div>
  );
}
