"use client";

import { useState, useEffect } from "react";
import type { Campaign } from "@/lib/workspace/types";
import type { MasterDataItem } from "@/lib/workspace/types-master-data";
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
import { DatePicker } from "@/components/ui/date-picker";
import { toISOStringOrNull } from "@/lib/workspace/date-utils";
import { toast } from "sonner";

interface CampaignMasterData {
  campaign_types: MasterDataItem[];
  campaign_statuses: MasterDataItem[];
  channels: MasterDataItem[];
}

interface CampaignFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Campaign>) => Promise<void>;
  campaign?: Campaign | null;
  projects?: Array<{ id: string; name: string }>;
  masterData?: CampaignMasterData;
}

export function CampaignForm({
  open,
  onOpenChange,
  onSubmit,
  campaign,
  projects = [],
  masterData,
}: CampaignFormProps) {
  const [loading, setLoading] = useState(false);

  type FormState = {
    project_id: string;
    name: string;
    description: string;
    campaign_type: string;
    status: string;
    start_date: string;
    end_date: string;
    budget: string;
    channels: string[];
    tags: string[];
  };

  const [form, setForm] = useState<FormState>({
    project_id: campaign?.project_id ?? "",
    name: campaign?.name ?? "",
    description: campaign?.description ?? "",
    campaign_type: campaign?.campaign_type ?? "",
    status: campaign?.status ?? "planning",
    start_date: campaign?.start_date ?? "",
    end_date: campaign?.end_date ?? "",
    budget: campaign?.budget != null ? String(campaign.budget) : "",
    channels: campaign?.channels ?? [],
    tags: campaign?.tags ?? [],
  });

  useEffect(() => {
    if (open) {
      setForm({
        project_id: campaign?.project_id ?? "",
        name: campaign?.name ?? "",
        description: campaign?.description ?? "",
        campaign_type: campaign?.campaign_type ?? "",
        status: campaign?.status ?? "planning",
        start_date: campaign?.start_date ?? "",
        end_date: campaign?.end_date ?? "",
        budget: campaign?.budget != null ? String(campaign.budget) : "",
        channels: campaign?.channels ?? [],
        tags: campaign?.tags ?? [],
      });
    }
  }, [open, campaign]);

  const toggleChannel = (code: string) => {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(code)
        ? f.channels.filter((c) => c !== code)
        : [...f.channels, code],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Tên chiến dịch không được để trống");
      return;
    }
    setLoading(true);
    try {
      const startISO = toISOStringOrNull(form.start_date);
      const endISO = toISOStringOrNull(form.end_date);
      await onSubmit({
        ...form,
        project_id: form.project_id || undefined,
        start_date: startISO ?? undefined,
        end_date: endISO ?? undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        channels: form.channels,
        tags: form.tags,
        status: form.status as Campaign["status"],
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby="campaign-form-desc">
        <span id="campaign-form-desc" className="sr-only">Form tạo hoặc chỉnh sửa chiến dịch marketing</span>
        <DialogHeader>
          <DialogTitle>{campaign ? "Sửa chiến dịch" : "Tạo chiến dịch mới"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Tên chiến dịch <span className="text-red-500">*</span>
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
              placeholder="Mô tả chiến dịch..."
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Project + Campaign Type + Status row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Project */}
            <div className="space-y-1.5">
              <Label>Dự án</Label>
              <Select
                value={form.project_id}
                onValueChange={(v) => setForm((f) => ({ ...f, project_id: v || "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="— Không thuộc dự án —" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campaign type — loaded from master data */}
            <div className="space-y-1.5">
              <Label>Loại chiến dịch</Label>
              <Select
                value={form.campaign_type}
                onValueChange={(v) => setForm((f) => ({ ...f, campaign_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại" />
                </SelectTrigger>
                <SelectContent>
                  {masterData?.campaign_types.map((opt) => (
                    <SelectItem key={opt.code} value={opt.code}>
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ backgroundColor: opt.color }} />
                        {opt.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>
                Trạng thái <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {masterData?.campaign_statuses?.length
                    ? masterData.campaign_statuses.map((s) => (
                        <SelectItem key={s.code} value={s.code}>
                          <span className="flex items-center gap-2">
                            <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </span>
                        </SelectItem>
                      ))
                    : [
                        { code: "planning", name: "Lên kế hoạch" },
                        { code: "active", name: "Đang chạy" },
                        { code: "paused", name: "Tạm dừng" },
                        { code: "completed", name: "Hoàn thành" },
                        { code: "cancelled", name: "Đã hủy" },
                      ].map((s) => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.name}
                        </SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>
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
              placeholder="VD: 5000000"
              value={form.budget}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  budget: e.target.value,
                }))
              }
            />
          </div>

          {/* Channels — loaded from master data, no quick-add */}
          <div className="space-y-2">
            <Label>Kênh phát hành</Label>
            <div className="flex flex-wrap gap-2">
              {masterData?.channels.map((ch) => {
                const selected = form.channels.includes(ch.code);
                return (
                  <button
                    key={ch.code}
                    type="button"
                    onClick={() => toggleChannel(ch.code)}
                    className={
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all " +
                      (selected
                        ? "text-white border-transparent"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300")
                    }
                    style={selected ? { backgroundColor: ch.color } : {}}
                  >
                    {ch.name}
                    {selected && (
                      <span className="size-3.5 rounded-full bg-white/30 flex items-center justify-center text-white text-[8px] font-bold">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (phân cách bằng dấu phẩy)</Label>
            <Input
              id="tags"
              placeholder="VD: summer-sale, laptop, khuyen-mai"
              value={form.tags.join(", ")}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  tags: e.target.value
                    ? e.target.value.split(",").map((t) => t.trim()).filter(Boolean)
                    : [],
                }))
              }
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading || !form.name.trim()}>
              {loading ? "Đang lưu..." : campaign ? "Lưu thay đổi" : "Tạo chiến dịch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
