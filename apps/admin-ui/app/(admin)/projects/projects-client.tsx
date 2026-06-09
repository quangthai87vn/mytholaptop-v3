"use client";

import { useState, useCallback } from "react";
import type { Project } from "@/lib/workspace/types";
import { ProjectList } from "@/components/projects/project-list";
import { ProjectForm } from "@/components/projects/project-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pagination } from "@/components/ui/pagination";
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
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { adminFetch } from "@/lib/api/admin-fetch";
import type { MasterDataItem } from "@/lib/workspace/types-master-data";

interface ProjectMasterData {
  project_statuses: MasterDataItem[];
  priorities: MasterDataItem[];
}

interface ProjectsClientProps {
  projects: Project[];
  masterData?: ProjectMasterData;
  isSuperAdmin?: boolean;
  isIntern?: boolean;
  userId?: string;
}

export function ProjectsClient({ projects, masterData, isSuperAdmin = false, isIntern = false, userId }: ProjectsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get("priority") ?? "all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Delete confirmation state
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Archive confirmation state
  const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const filtered = projects.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    // Note: priority filter kept for UI but project priority removed in Phase 1-2
    // Priority filtering is now a no-op
    return true;
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const pendingDeleteProject = pendingDeleteId
    ? projects.find((p) => p.id === pendingDeleteId) ?? null
    : null;

  const pendingArchiveProject = pendingArchiveId
    ? projects.find((p) => p.id === pendingArchiveId) ?? null
    : null;

  const handleFilterChange = (key: string, value: string) => {
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || !value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push("/projects?" + params.toString());
  };

  const handleCreate = async (data: Partial<Project>) => {
    const res = await adminFetch("/api/projects", {
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
    const res = await adminFetch("/api/projects/" + editingProject.id, {
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

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    try {
      const res = await adminFetch("/api/projects/" + pendingDeleteId + "?hard=true", {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Xóa thất bại");
      }
      toast.success("Đã xóa vĩnh viễn dự án");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xóa thất bại");
    } finally {
      setIsDeleting(false);
      setPendingDeleteId(null);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!pendingArchiveId) return;
    setIsArchiving(true);
    try {
      const res = await adminFetch("/api/projects/" + pendingArchiveId, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lưu trữ thất bại");
      }
      toast.success("Đã lưu trữ dự án");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu trữ thất bại");
    } finally {
      setIsArchiving(false);
      setPendingArchiveId(null);
    }
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
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
            {masterData?.project_statuses.map((s) => (
              <SelectItem key={s.code} value={s.code}>
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </span>
              </SelectItem>
            ))}
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
            {masterData?.priorities.map((p) => (
              <SelectItem key={p.code} value={p.code}>
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto">
          {!isIntern && (
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
          )}
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
        projects={paginated}
        onEdit={isIntern ? undefined : (p) => {
          setEditingProject(p);
          setShowForm(true);
        }}
        onDelete={isSuperAdmin ? (id) => setPendingDeleteId(id) : undefined}
        onArchive={isIntern ? undefined : (id) => setPendingArchiveId(id)}
        onAdd={isIntern ? undefined : () => setShowForm(true)}
        canDelete={isSuperAdmin}
        isIntern={isIntern}
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        className="mt-4 border-t"
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

      {/* Delete confirmation — AlertDialog (no browser confirm) */}
      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa vĩnh viễn dự án?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteProject
                ? `"${pendingDeleteProject.name}" sẽ bị xóa vĩnh viễn. Hành động này KHÔNG thể hoàn tác.`
                : "Dự án này sẽ bị xóa vĩnh viễn. Hành động này KHÔNG thể hoàn tác."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Đang xóa..." : "Xóa vĩnh viễn"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive confirmation — AlertDialog */}
      <AlertDialog open={pendingArchiveId !== null} onOpenChange={(open) => { if (!open) setPendingArchiveId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lưu trữ dự án?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingArchiveProject
                ? `"${pendingArchiveProject.name}" sẽ bị lưu trữ. Bạn có thể khôi phục từ danh sách lưu trữ.`
                : "Dự án này sẽ bị lưu trữ."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveConfirm}
              disabled={isArchiving}
            >
              {isArchiving ? "Đang lưu trữ..." : "Lưu trữ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
