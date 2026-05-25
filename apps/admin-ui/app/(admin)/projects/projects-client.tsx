"use client";

import { useState } from "react";
import type { Project } from "@/lib/workspace/types";
import { ProjectList } from "@/components/projects/project-list";
import { ProjectForm } from "@/components/projects/project-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { PRIORITY_CONFIG } from "@/lib/workspace/types";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

interface ProjectsClientProps {
  projects: Project[];
}

export function ProjectsClient({ projects }: ProjectsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get("priority") ?? "all");

  const filtered = projects.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (priorityFilter !== "all" && p.priority !== priorityFilter) return false;
    return true;
  });

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || !value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/projects?${params.toString()}`);
  };

  const handleCreate = async (data: Partial<Project>) => {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Tạo thất bại");
    }
    toast.success("Đã tạo dự án mới");
    router.refresh();
  };

  const handleUpdate = async (data: Partial<Project>) => {
    if (!editingProject) return;
    const res = await fetch(`/api/projects/${editingProject.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Cập nhật thất bại");
    }
    toast.success("Đã cập nhật dự án");
    setEditingProject(null);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa dự án này?")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Xóa thất bại");
      return;
    }
    toast.success("Đã xóa dự án");
    router.refresh();
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-slate-200 p-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Tìm kiếm dự án..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            handleFilterChange("status", v);
          }}
        >
          <SelectTrigger className="w-[170px] h-9">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="planning">Lên kế hoạch</SelectItem>
            <SelectItem value="completed">Hoàn thành</SelectItem>
            <SelectItem value="on_hold">Tạm dừng</SelectItem>
            <SelectItem value="archived">Lưu trữ</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={priorityFilter}
          onValueChange={(v) => {
            setPriorityFilter(v);
            handleFilterChange("priority", v);
          }}
        >
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Độ ưu tiên" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                {cfg.icon} {cfg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Button
            onClick={() => {
              setEditingProject(null);
              setShowForm(true);
            }}
            className="gap-2"
          >
            <Plus className="size-4" />
            Tạo dự án
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Tổng dự án", value: projects.length, color: "text-slate-700" },
          { label: "Đang hoạt động", value: projects.filter((p) => p.status === "active").length, color: "text-green-600" },
          { label: "Hoàn thành", value: projects.filter((p) => p.status === "completed").length, color: "text-blue-600" },
          { label: "Quá hạn", value: projects.filter((p) => p.end_date && new Date(p.end_date) < new Date() && p.status !== "completed").length, color: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-slate-200 p-3 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Project list */}
      <ProjectList
        projects={filtered}
        onEdit={(p) => {
          setEditingProject(p);
          setShowForm(true);
        }}
        onDelete={handleDelete}
        onAdd={() => setShowForm(true)}
      />

      {/* Create/Edit form */}
      <ProjectForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingProject(null);
        }}
        onSubmit={editingProject ? handleUpdate : handleCreate}
        project={editingProject}
      />
    </>
  );
}
