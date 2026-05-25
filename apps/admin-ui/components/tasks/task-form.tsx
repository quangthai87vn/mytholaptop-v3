"use client";

import { useState } from "react";
import type { Task, Project, Campaign, TaskStatus, TaskPriority } from "@/lib/workspace/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_CONFIG } from "@/lib/workspace/types";

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Task>) => Promise<void>;
  task?: Task | null;
  projects?: Project[];
  campaigns?: Campaign[];
  defaultStatus?: TaskStatus;
}

export function TaskForm({
  open,
  onOpenChange,
  onSubmit,
  task,
  projects = [],
  campaigns = [],
  defaultStatus = "todo",
}: TaskFormProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<Task>>({
    title: task?.title ?? "",
    description: task?.description ?? "",
    project_id: task?.project_id ?? "",
    campaign_id: task?.campaign_id ?? "",
    status: task?.status ?? defaultStatus,
    priority: task?.priority ?? "medium",
    due_date: task?.due_date ?? "",
    stage: task?.stage ?? undefined,
    tags: task?.tags ?? [],
  });

  const filteredCampaigns = campaigns.filter(
    (c) => !form.project_id || c.project_id === form.project_id
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) return;
    setLoading(true);
    try {
      await onSubmit({
        ...form,
        tags: form.tags ?? [],
        assignee_ids: form.assignee_ids ?? [],
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task ? "Sửa công việc" : "Tạo công việc mới"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">
              Tiêu đề <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="VD: Viết bài Facebook về Summer Sale"
              value={form.title ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              placeholder="Chi tiết công việc..."
              rows={3}
              value={form.description ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          {/* Project & Campaign */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Dự án</Label>
              <Select
                value={form.project_id ?? ""}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    project_id: v || undefined,
                    campaign_id: undefined,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn dự án" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Chiến dịch</Label>
              <Select
                value={form.campaign_id ?? ""}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, campaign_id: v || undefined }))
                }
                disabled={!form.project_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn chiến dịch" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCampaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status, Priority, Stage */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Trạng thái</Label>
              <Select
                value={form.status ?? "todo"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as TaskStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Độ ưu tiên</Label>
              <Select
                value={form.priority ?? "medium"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, priority: v as TaskPriority }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.icon} {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="due_date">Hạn chót</Label>
              <Input
                id="due_date"
                type="date"
                value={form.due_date ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, due_date: e.target.value || undefined }))
                }
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (phân cách bằng dấu phẩy)</Label>
            <Input
              id="tags"
              placeholder="VD: facebook, summer-sale, laptop"
              value={(form.tags ?? []).join(", ")}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  tags: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                }))
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={loading || !form.title?.trim()}>
              {loading ? "Đang lưu..." : task ? "Lưu thay đổi" : "Tạo công việc"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
