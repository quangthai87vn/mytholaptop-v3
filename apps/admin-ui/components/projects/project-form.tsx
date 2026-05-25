"use client";

import { useState } from "react";
import type { Project, ProjectStatus, ProjectPriority } from "@/lib/workspace/types";
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

const COLOR_PRESETS = [
  "#E60012", "#DC2626", "#2563EB", "#7C3AED",
  "#059669", "#D97706", "#DB2777", "#475569",
];

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Project>) => Promise<void>;
  project?: Project | null;
}

export function ProjectForm({
  open,
  onOpenChange,
  onSubmit,
  project,
}: ProjectFormProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<Project>>({
    name: project?.name ?? "",
    description: project?.description ?? "",
    status: project?.status ?? "active",
    priority: project?.priority ?? "medium",
    color: project?.color ?? "#E60012",
    start_date: project?.start_date ?? "",
    end_date: project?.end_date ?? "",
    budget: project?.budget,
    tags: project?.tags ?? [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) return;
    setLoading(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {project ? "Sửa dự án" : "Tạo dự án mới"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Tên dự án <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="VD: Summer Sale 2026"
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              placeholder="Mô tả ngắn về dự án..."
              rows={3}
              value={form.description ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          {/* Status & Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Trạng thái</Label>
              <Select
                value={form.status ?? "active"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as ProjectStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="planning">Lên kế hoạch</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="on_hold">Tạm dừng</SelectItem>
                  <SelectItem value="archived">Lưu trữ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Độ ưu tiên</Label>
              <Select
                value={form.priority ?? "medium"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, priority: v as ProjectPriority }))
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
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Ngày bắt đầu</Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date">Ngày kết thúc</Label>
              <Input
                id="end_date"
                type="date"
                value={form.end_date ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, end_date: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-1.5">
            <Label htmlFor="budget">Ngân sách (VNĐ)</Label>
            <Input
              id="budget"
              type="number"
              placeholder="VD: 50000000"
              value={form.budget ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  budget: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label>Màu dự án</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`size-8 rounded-full border-2 transition-all ${
                    form.color === color
                      ? "border-slate-900 scale-110 shadow-md"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  title={color}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={loading || !form.name?.trim()}>
              {loading ? "Đang lưu..." : project ? "Lưu thay đổi" : "Tạo dự án"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
