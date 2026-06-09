"use client";

import { useState, useEffect } from "react";
import type { Project } from "@/lib/workspace/types";
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
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { toISOStringOrNull } from "@/lib/workspace/date-utils";

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

  type FormState = {
    name: string;
    description: string;
    color: string;
    start_date: string;
    end_date: string;
    budget: string;
    tags: string[];
  };

  const [form, setForm] = useState<FormState>({
    name: project?.name ?? "",
    description: project?.description ?? "",
    color: project?.color ?? "#E60012",
    start_date: project?.start_date ?? "",
    end_date: project?.end_date ?? "",
    budget: project?.budget != null ? String(project.budget) : "",
    tags: project?.tags ?? [],
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: project?.name ?? "",
        description: project?.description ?? "",
        color: project?.color ?? "#E60012",
        start_date: project?.start_date ?? "",
        end_date: project?.end_date ?? "",
        budget: project?.budget != null ? String(project.budget) : "",
        tags: project?.tags ?? [],
      });
    }
  }, [open, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const startISO = toISOStringOrNull(form.start_date);
      const endISO = toISOStringOrNull(form.end_date);
      await onSubmit({
        name: form.name,
        description: form.description || undefined,
        color: form.color,
        start_date: startISO ?? undefined,
        end_date: endISO ?? undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        tags: form.tags,
      });
      onOpenChange(false);
    } catch {
      // error shown by caller
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby="project-form-desc">
        <span id="project-form-desc" className="sr-only">Form tạo hoặc chỉnh sửa dự án</span>
        <DialogHeader>
          <DialogTitle>{project ? "Sửa dự án" : "Tạo dự án mới"}</DialogTitle>
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
              value={form.name}
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
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Ngày bắt đầu</Label>
              <DatePicker
                value={form.start_date}
                onChange={(v) => setForm((f) => ({ ...f, start_date: v ?? "" }))}
                placeholder="Chọn ngày"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ngày kết thúc</Label>
              <DatePicker
                value={form.end_date}
                onChange={(v) => setForm((f) => ({ ...f, end_date: v ?? "" }))}
                placeholder="Chọn ngày"
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
              value={form.budget}
              onChange={(e) =>
                setForm((f) => ({ ...f, budget: e.target.value }))
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
                  className={
                    "size-8 rounded-full border-2 transition-all " +
                    (form.color === color
                      ? "border-slate-900 scale-110 shadow-md"
                      : "border-transparent hover:scale-105")
                  }
                  style={{ backgroundColor: color }}
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  title={color}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading || !form.name.trim()}>
              {loading ? "Đang lưu..." : project ? "Lưu thay đổi" : "Tạo dự án"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
