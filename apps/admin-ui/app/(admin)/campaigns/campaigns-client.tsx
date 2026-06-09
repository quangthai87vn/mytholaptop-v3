"use client";

import { useState, useCallback } from "react";
import type { Campaign, CampaignStatus, Project } from "@/lib/workspace/types";
import { CampaignList } from "@/components/campaigns/campaign-list";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { adminFetch } from "@/lib/api/admin-fetch";
import type { MasterDataItem } from "@/lib/workspace/types-master-data";

interface CampaignMasterData {
  campaign_types: MasterDataItem[];
  campaign_statuses: MasterDataItem[];
  channels: MasterDataItem[];
}

interface CampaignsClientProps {
  campaigns: Campaign[];
  projects?: Project[];
  masterData?: CampaignMasterData;
  isSuperAdmin?: boolean;
  isIntern?: boolean;
  userId?: string;
  staffMap?: Record<string, string>;
}

export function CampaignsClient({ campaigns, projects = [], masterData, isSuperAdmin = false, isIntern = false, userId, staffMap = {} }: CampaignsClientProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = campaigns.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    return true;
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const pendingArchiveCampaign = pendingArchiveId
    ? campaigns.find((c) => c.id === pendingArchiveId) ?? null
    : null;

  const pendingDeleteCampaign = pendingDeleteId
    ? campaigns.find((c) => c.id === pendingDeleteId) ?? null
    : null;

  const refreshMasterData = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleCreate = async (data: Partial<Campaign>) => {
    const res = await adminFetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Tạo thất bại");
    }
    toast.success("Đã tạo chiến dịch mới");
    router.refresh();
  };

  const handleUpdate = async (data: Partial<Campaign>) => {
    if (!editingCampaign) return;
    const res = await adminFetch("/api/campaigns/" + editingCampaign.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Cập nhật thất bại");
    }
    toast.success("Đã cập nhật chiến dịch");
    setEditingCampaign(null);
    router.refresh();
  };

  const handleArchiveConfirm = async () => {
    if (!pendingArchiveId) return;
    setIsArchiving(true);
    try {
      const res = await adminFetch("/api/campaigns/" + pendingArchiveId, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lưu trữ thất bại");
      }
      toast.success("Đã lưu trữ chiến dịch");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu trữ thất bại");
    } finally {
      setIsArchiving(false);
      setPendingArchiveId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    try {
      const res = await adminFetch("/api/campaigns/" + pendingDeleteId + "?hard=true", {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Xóa thất bại");
      }
      toast.success("Đã xóa chiến dịch");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xóa thất bại");
    } finally {
      setIsDeleting(false);
      setPendingDeleteId(null);
    }
  };

  const archiveDesc = pendingArchiveCampaign
    ? "\"" + pendingArchiveCampaign.name + "\" sẽ bị ẩn khỏi danh sách. Bạn có thể khôi phục sau nếu cần."
    : "Chiến dịch sẽ bị ẩn khỏi danh sách. Bạn có thể khôi phục sau nếu cần.";

  const deleteDesc = pendingDeleteCampaign
    ? "\"" + pendingDeleteCampaign.name + "\" sẽ bị xóa vĩnh viễn. Hành động này KHÔNG thể hoàn tác."
    : "Chiến dịch sẽ bị xóa vĩnh viễn. Hành động này KHÔNG thể hoàn tác.";

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-slate-200 p-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Tìm kiếm chiến dịch..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {masterData?.campaign_statuses.map((s) => (
              <SelectItem key={s.code} value={s.code}>
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto">
          {!isIntern && (
            <Button
              onClick={() => {
                setEditingCampaign(null);
                setShowForm(true);
              }}
              className="gap-2"
            >
              <Plus className="size-4" />
              Tạo chiến dịch
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Tổng chiến dịch", value: campaigns.length, color: "text-slate-700" },
          { label: "Đang chạy", value: campaigns.filter((c) => c.status === "active").length, color: "text-green-600" },
          { label: "Lên kế hoạch", value: campaigns.filter((c) => c.status === "planning").length, color: "text-blue-600" },
          { label: "Hoàn thành", value: campaigns.filter((c) => c.status === "completed").length, color: "text-purple-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-slate-200 p-3 text-center">
            <div className={"text-2xl font-bold " + s.color}>{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Campaign list */}
      <CampaignList
        campaigns={paginated}
        onEdit={isIntern ? undefined : (c) => {
          setEditingCampaign(c);
          setShowForm(true);
        }}
        onDelete={isSuperAdmin ? (id) => setPendingDeleteId(id) : undefined}
        onArchive={isIntern ? undefined : (id) => setPendingArchiveId(id)}
        onAdd={isIntern ? undefined : () => setShowForm(true)}
        canDelete={isSuperAdmin}
        statusOptions={masterData?.campaign_statuses ?? []}
        typeOptions={masterData?.campaign_types ?? []}
        staffMap={staffMap}
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
      <CampaignForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingCampaign(null);
        }}
        onSubmit={editingCampaign ? handleUpdate : handleCreate}
        campaign={editingCampaign}
        projects={projects}
        masterData={masterData}
      />

      {/* Archive Dialog */}
      <ConfirmDialog
        open={pendingArchiveId !== null}
        onOpenChange={(open) => { if (!open) setPendingArchiveId(null); }}
        title="Lưu trữ chiến dịch?"
        description={archiveDesc}
        confirmLabel="Lưu trữ"
        variant="warning"
        loading={isArchiving}
        onConfirm={handleArchiveConfirm}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        title="Xóa vĩnh viễn chiến dịch?"
        description={deleteDesc}
        warning="Tất cả dữ liệu liên quan đến chiến dịch này sẽ bị mất."
        confirmLabel="Xóa vĩnh viễn"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
