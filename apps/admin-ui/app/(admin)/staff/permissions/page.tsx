"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronRight,
  AlertTriangle,
  Copy,
  Lock,
  Package,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/lib/auth/store";
import { adminFetch } from "@/lib/api/admin-fetch";
import { toast } from "sonner";
import {
  ROLE_LABELS,
  ROLE_BADGE_COLORS,
  type Role,
  type Permission,
} from "@/lib/auth/permissions";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RoleInfo {
  code: string;
  name: string;
  description: string;
  role_type: "system" | "custom";
  is_active: boolean;
  staffCount: number;
  permissions?: string[];
}

interface PermsResponse {
  roles: RoleInfo[];
  permissionGroups: Record<string, unknown>[];
  rolePermissions: RolePermissionsMap;
}

type RolePermissionsMap = Record<string, Permission[]>;

// ─── System Role Templates ─────────────────────────────────────────────────────

const SYSTEM_ROLE_TEMPLATES = [
  { code: "super_admin", name: "Super Admin",    description: "Toàn quyền quản trị hệ thống. Không giới hạn." },
  { code: "admin",       name: "Quản trị viên",  description: "Quản lý workspace, nội dung, nhân viên. Không quản lý credentials hệ thống." },
  { code: "editor",      name: "Biên tập viên",  description: "Tạo/sửa project, campaign, task, nội dung. Không xóa. Không chỉnh settings." },
  { code: "viewer",      name: "Người xem",       description: "Chỉ xem dữ liệu. Không tạo, sửa, xóa gì." },
  { code: "intern",      name: "Thực tập sinh",   description: "Làm việc theo task được giao, tạo nội dung cơ bản." },
];

// ─── Role color map ────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-100 text-red-800",
  admin:       "bg-purple-100 text-purple-800",
  editor:      "bg-blue-100 text-blue-800",
  viewer:      "bg-gray-100 text-gray-700",
  intern:      "bg-green-100 text-green-800",
};

// ─── Permission Groups ───────────────────────────────────────────────────────────

interface PermDef { key: Permission; label: string; level: "read" | "create" | "update" | "delete" }
interface PermGroupDef { group: string; groupKey: string; icon: React.ElementType; color: string; perms: PermDef[] }

const PERMISSION_GROUPS: PermGroupDef[] = [
  {
    group: "Quản lý Workspace", groupKey: "workspace", icon: Shield,
    color: "text-blue-600 bg-blue-50",
    perms: [
      { key: "projects.read", label: "Xem dự án", level: "read" },
      { key: "projects.create", label: "Tạo dự án", level: "create" },
      { key: "projects.update", label: "Sửa dự án", level: "update" },
      { key: "projects.delete", label: "Xóa dự án", level: "delete" },
      { key: "campaigns.read", label: "Xem chiến dịch", level: "read" },
      { key: "campaigns.create", label: "Tạo chiến dịch", level: "create" },
      { key: "campaigns.update", label: "Sửa chiến dịch", level: "update" },
      { key: "campaigns.delete", label: "Xóa chiến dịch", level: "delete" },
      { key: "tasks.read", label: "Xem công việc", level: "read" },
      { key: "tasks.create", label: "Tạo công việc", level: "create" },
      { key: "tasks.update", label: "Sửa công việc", level: "update" },
      { key: "tasks.delete", label: "Xóa công việc", level: "delete" },
      { key: "content.read", label: "Xem nội dung", level: "read" },
      { key: "content.create", label: "Tạo nội dung", level: "create" },
      { key: "content.update", label: "Sửa nội dung", level: "update" },
      { key: "content.delete", label: "Xóa nội dung", level: "delete" },
    ],
  },
  {
    group: "AI Content", groupKey: "ai", icon: Shield,
    color: "text-purple-600 bg-purple-50",
    perms: [
      { key: "ai_generate", label: "Generate nội dung AI", level: "create" },
      { key: "ai_engine.manage", label: "Cấu hình AI Engine", level: "update" },
    ],
  },
  {
    group: "Bình luận & Tài sản", groupKey: "comments_assets", icon: Shield,
    color: "text-slate-600 bg-slate-50",
    perms: [
      { key: "comments.read", label: "Xem bình luận", level: "read" },
      { key: "comments.create", label: "Viết bình luận", level: "create" },
      { key: "comments.update", label: "Sửa bình luận", level: "update" },
      { key: "comments.delete", label: "Xóa bình luận", level: "delete" },
      { key: "assets.read", label: "Xem tài sản", level: "read" },
      { key: "assets.create", label: "Upload tài sản", level: "create" },
      { key: "assets.update", label: "Sửa tài sản", level: "update" },
      { key: "assets.delete", label: "Xóa tài sản", level: "delete" },
      { key: "notifications.read", label: "Xem thông báo", level: "read" },
    ],
  },
  {
    group: "Cài đặt hệ thống", groupKey: "system", icon: Shield,
    color: "text-red-600 bg-red-50",
    perms: [
      { key: "users.read", label: "Xem người dùng", level: "read" },
      { key: "users.create", label: "Tạo người dùng", level: "create" },
      { key: "users.update", label: "Sửa người dùng", level: "update" },
      { key: "users.delete", label: "Xóa người dùng", level: "delete" },
      { key: "roles.read", label: "Xem vai trò", level: "read" },
      { key: "roles.manage", label: "Quản lý vai trò", level: "update" },
      { key: "permissions.read", label: "Xem phân quyền", level: "read" },
      { key: "settings.manage", label: "Cài đặt hệ thống", level: "update" },
      { key: "credentials.manage", label: "Quản lý credentials", level: "update" },
      { key: "migration.manage", label: "Di chuyển dữ liệu", level: "update" },
    ],
  },
];

const LEVEL_COLORS: Record<string, string> = {
  read:    "bg-gray-100 text-gray-700",
  create:  "bg-blue-100 text-blue-700",
  update:  "bg-amber-100 text-amber-700",
  delete:  "bg-red-100 text-red-700",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getSystemPerms(code: string): string[] {
  const MAP: Record<string, string[]> = {
    super_admin: [
      "users.read","users.create","users.update","users.delete",
      "roles.read","roles.manage","permissions.read",
      "settings.manage","credentials.manage",
      "ai_engine.manage","ai_generate","ai_providers.manage",
      "projects.read","projects.manage","projects.create","projects.update","projects.delete",
      "campaigns.read","campaigns.manage","campaigns.create","campaigns.update","campaigns.delete",
      "tasks.read","tasks.create","tasks.update","tasks.delete",
      "interns.manage","media.manage","migration.manage",
      "content.read","content.create","content.update","content.delete",
      "comments.read","comments.create","comments.update","comments.delete",
      "assets.read","assets.create","assets.update","assets.delete",
      "notifications.read",
    ],
    admin: [
      "users.read","roles.read","permissions.read","ai_generate",
      "projects.read","projects.manage","projects.create","projects.update",
      "campaigns.read","campaigns.manage","campaigns.create","campaigns.update",
      "tasks.read","tasks.create","tasks.update","tasks.delete",
      "interns.manage","media.manage","migration.manage",
      "content.read","content.create","content.update","content.delete",
      "comments.read","comments.create","comments.update","comments.delete",
      "assets.read","assets.create","assets.update","assets.delete",
      "notifications.read",
    ],
    editor: [
      "ai_generate",
      "tasks.read","tasks.create","tasks.update",
      "projects.read","projects.create","projects.update",
      "campaigns.read","campaigns.create","campaigns.update",
      "content.read","content.create","content.update",
      "comments.read","comments.create",
      "assets.read","assets.create",
      "notifications.read",
    ],
    viewer: [
      "tasks.read","projects.read","campaigns.read","content.read",
      "comments.read","assets.read",
      "notifications.read",
    ],
    intern: [
      "tasks.read","tasks.update",
      "comments.read","comments.create",
      "assets.read","assets.create",
      "notifications.read",
      "ai_generate",
    ],
  };
  return MAP[code] ?? [];
}

// ─── Role Form Modal ─────────────────────────────────────────────────────────────

interface RoleFormData { code: string; name: string; description: string; fromTemplate: string; }

function RoleFormModal({
  open, onClose, onSuccess, editingRole,
}: {
  open: boolean; onClose: () => void; onSuccess: () => void; editingRole: RoleInfo | null;
}) {
  const [form, setForm] = useState<RoleFormData>({
    code: "", name: "", description: "", fromTemplate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editingRole) {
        setForm({ code: editingRole.code, name: editingRole.name, description: editingRole.description, fromTemplate: "" });
      } else {
        setForm({ code: "", name: "", description: "", fromTemplate: "" });
      }
      setError(null);
    }
  }, [open, editingRole]);

  const isEditing = !!editingRole;
  const hasTemplate = form.fromTemplate !== "";

  function applyTemplate(code: string) {
    const t = SYSTEM_ROLE_TEMPLATES.find((x) => x.code === code);
    if (!t) return;
    setForm({ ...form, fromTemplate: code, name: `${t.name} (bản sao)`, description: `Dựa trên vai trò "${t.name}". ${t.description}` });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = isEditing
        ? { name: form.name, description: form.description }
        : { code: form.code, name: form.name, description: form.description };
      if (!isEditing && hasTemplate) {
        payload.permissions = getSystemPerms(form.fromTemplate);
      }
      const url = isEditing ? `/api/roles/${editingRole.code}` : "/api/roles";
      const method = isEditing ? "PUT" : "POST";
      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Lỗi không xác định."); return; }
      toast.success(isEditing ? "Đã cập nhật vai trò." : "Đã tạo vai trò mới.");
      onSuccess();
      onClose();
    } catch { setError("Lỗi kết nối."); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Sửa vai trò" : "Tạo vai trò mới"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Chỉnh sửa tên và mô tả vai trò." : "Tạo vai trò tùy chỉnh. Có thể chọn mẫu từ vai trò hệ thống."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <>
              <div className="space-y-1.5">
                <Label>Tạo từ mẫu</Label>
                <Select value={form.fromTemplate} onValueChange={applyTemplate}>
                  <SelectTrigger><SelectValue placeholder="— Tạo vai trò trống —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__blank__">— Tạo vai trò trống —</SelectItem>
                    {SYSTEM_ROLE_TEMPLATES.map((t) => (
                      <SelectItem key={t.code} value={t.code}>
                        <div className="flex items-center gap-2"><Shield className="size-3.5" /><span>{t.name}</span></div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasTemplate && (
                  <p className="text-xs text-green-700 flex items-center gap-1">
                    <Check className="size-3" />
                    Đã áp dụng quyền từ mẫu
                  </p>
                )}
              </div>
              <div className="border-t pt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="role-code">Mã vai trò</Label>
                  <Input id="role-code" value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                    placeholder="vd: content_editor" required maxLength={50} pattern="^[a-z0-9_]+$" />
                  <p className="text-xs text-muted-foreground">Chỉ chữ thường, số và _. VD: <code>content_editor</code></p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role-name">Tên vai trò</Label>
                  <Input id="role-name" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="VD: Nhân viên Content" required maxLength={100} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role-desc">Mô tả</Label>
                  <Textarea id="role-desc" value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Mô tả ngắn về vai trò này..." rows={3} maxLength={500} />
                </div>
              </div>
            </>
          )}
          {isEditing && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="role-name-e">Tên vai trò</Label>
                <Input id="role-name-e" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role-desc-e">Mô tả</Label>
                <Textarea id="role-desc-e" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3} maxLength={500} />
              </div>
            </>
          )}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {isEditing ? "Lưu thay đổi" : "Tạo vai trò"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Modal ───────────────────────────────────────────────────────────────

function DeleteRoleModal({
  open, onClose, role, onSuccess,
}: {
  open: boolean; onClose: () => void; role: RoleInfo | null; onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) setError(null); }, [open]);
  if (!role) return null;

  async function handleDelete() {
    const target = role!;
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/roles/${target.code}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Không thể xóa vai trò."); return; }
      toast.success(`Đã xóa vai trò "${target.name}".`);
      onSuccess();
      onClose();
    } catch { setError("Lỗi kết nối."); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />Xóa vai trò
          </DialogTitle>
          <DialogDescription>Xóa vai trò <strong>{role.name}</strong> ({role.code})?</DialogDescription>
        </DialogHeader>
        {role.staffCount > 0 && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm">
            <strong>Không thể xóa:</strong> Vai trò này đang có {role.staffCount} người dùng. Chuyển họ sang vai trò khác trước.
          </div>
        )}
        {error && <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading || role.staffCount > 0}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}Xóa vai trò
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const canManage = currentUser?.role === "super_admin" || currentUser?.role === "admin";

  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionsMap>({});
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<RoleInfo | null>(null);
  const [deleteRole, setDeleteRole] = useState<RoleInfo | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/permissions");
      if (!res.ok) {
        setError(res.status === 403 ? "Bạn không có quyền xem phân quyền." : "Lỗi khi tải phân quyền.");
        return;
      }
      const data: PermsResponse = await res.json();
      setRoles(data.roles);
      setRolePermissions(data.rolePermissions || {});

      const allCustom = data.roles.filter((r) => r.role_type === "custom");
      if (allCustom.length > 0 && !selectedRole) {
        setSelectedRole(allCustom[0].code);
      } else if (!selectedRole && data.roles.length > 0) {
        setSelectedRole(data.roles[0].code);
      }
    } catch { setError("Lỗi kết nối."); }
    finally { setLoading(false); }
  }, [selectedRole]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentRole = roles.find((r) => r.code === selectedRole);
  const currentPerms: Permission[] = rolePermissions[selectedRole] ?? [];
  const isSystemRole = currentRole?.role_type === "system";
  const isEditable = canManage && !isSystemRole;

  function togglePerm(key: Permission) {
    if (!isEditable) return;
    setRolePermissions((prev) => {
      const cur = prev[selectedRole] ?? [];
      const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
      return { ...prev, [selectedRole]: next };
    });
  }

  async function savePermissions() {
    if (!selectedRole || !isEditable) return;
    setSaving(true);
    setError(null);
    try {
      const perms = rolePermissions[selectedRole] ?? [];
      const res = await adminFetch(`/api/roles/${selectedRole}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: perms }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.code === "SYSTEM_ROLE"
          ? "Không thể chỉnh phân quyền cho vai trò hệ thống."
          : data.code === "FORBIDDEN"
          ? "Bạn không có quyền chỉnh phân quyền."
          : data.error || "Không thể lưu phân quyền.";
        toast.error(msg);
        return;
      }
      toast.success(`Đã lưu phân quyền cho vai trò "${currentRole?.name}"`);
      await fetchData();
    } catch { toast.error("Lỗi kết nối khi lưu."); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Phân quyền</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {!canManage ? "Bạn chỉ có thể xem phân quyền. Liên hệ Super Admin." : "Chọn vai trò để xem và chỉnh sửa quyền hạn."}
          </p>
        </div>
        {isEditable && selectedRole && (
          <Button onClick={savePermissions} disabled={saving} className="gap-2 shrink-0">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Lưu phân quyền
          </Button>
        )}
      </div>

      {/* System role warning */}
      {currentRole && isSystemRole && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-3">
          <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800">
            <strong>Vai trò hệ thống:</strong> Quyền của &ldquo;{currentRole.name}&rdquo; cố định.
            Dùng &ldquo;Nhân bản&rdquo; để tạo vai trò tùy chỉnh.
          </div>
        </div>
      )}

      {!canManage && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Lock className="size-4 text-blue-600 shrink-0" />
            <p className="text-sm text-blue-700">Bạn chỉ có quyền xem. Liên hệ Super Admin để yêu cầu thay đổi.</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <Button variant="ghost" size="sm" onClick={fetchData}>Thử lại</Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card><CardContent className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Đang tải phân quyền...</span>
        </CardContent></Card>
      )}

      {!loading && !error && (
        <>
          {/* Role selector */}
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <button key={role.code}
                onClick={() => setSelectedRole(role.code)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                  selectedRole === role.code
                    ? "border-primary bg-primary/5 text-primary font-semibold"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                <Shield className="size-3.5 shrink-0" />
                <span>{role.name}</span>
                {role.role_type === "custom" && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0">Tùy chỉnh</Badge>
                )}
              </button>
            ))}
          </div>

          {/* Current role info */}
          {currentRole && (
            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`size-10 rounded-full flex items-center justify-center ${ROLE_COLORS[currentRole.code] || "bg-gray-100"}`}>
                    <Shield className="size-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{currentRole.name}</CardTitle>
                    <CardDescription>{currentRole.description}</CardDescription>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Badge className={ROLE_BADGE_COLORS[currentRole.code as Role] || "bg-gray-100 text-gray-700"}>
                      {ROLE_LABELS[currentRole.code as Role] || currentRole.code}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {currentRole.role_type === "system" ? "Hệ thống" : "Tùy chỉnh"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Permission groups */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {PERMISSION_GROUPS.map((grp) => {
              if (grp.perms.length === 0) return null;
              const Icon = grp.icon;
              const activeCount = grp.perms.filter((p) => currentPerms.includes(p.key)).length;
              const hasAny = activeCount > 0;
              return (
                <div key={grp.groupKey} className={`border rounded-xl overflow-hidden ${!hasAny && !isEditable ? "opacity-50" : ""}`}>
                  <div className={`flex items-center justify-between px-4 py-3 bg-gray-50 border-b`}>
                    <div className="flex items-center gap-2">
                      <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${grp.color}`}>
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-800">{grp.group}</span>
                        <span className="ml-2 text-xs text-gray-400">{activeCount}/{grp.perms.length}</span>
                      </div>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {grp.perms.map((p) => {
                      const isOn = currentPerms.includes(p.key);
                      const isDisabled = isSystemRole;
                      return (
                        <div key={p.key}
                          className={`flex items-center justify-between px-4 py-2.5 ${isDisabled ? "opacity-60" : "hover:bg-gray-50"}`}
                          onClick={() => !isDisabled && isEditable && togglePerm(p.key)}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${LEVEL_COLORS[p.level]}`}>
                              {p.level === "read" ? "Xem" : p.level === "create" ? "Tạo" : p.level === "update" ? "Sửa" : "Xóa"}
                            </span>
                            <span className="text-sm text-gray-700 truncate">{p.label}</span>
                            <code className="text-[10px] text-gray-400 font-mono shrink-0">{p.key}</code>
                          </div>
                          {isEditable && !isDisabled ? (
                            <button className={`size-6 rounded-full flex items-center justify-center shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                              isOn ? "bg-green-500 text-white hover:bg-green-600" : "bg-gray-200 text-gray-400 hover:bg-gray-300"
                            }`}
                              onClick={(e) => { e.stopPropagation(); togglePerm(p.key); }}
                            >
                              {isOn ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                            </button>
                          ) : (
                            <div className={`size-6 rounded-full flex items-center justify-center shrink-0 ${isOn ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-300"}`}>
                              {isOn ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Advanced view */}
          {isEditable && (
            <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5"
              onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? <ChevronRight className="size-3.5" /> : <Check className="size-3.5" />}
              Nâng cao — xem permission keys thô
            </button>
          )}

          {showAdvanced && currentRole && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Shield className="size-4" />Permission keys cho &ldquo;{currentRole.name}&rdquo;</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {currentPerms.length === 0 ? (
                    <span className="text-sm text-gray-400">Không có quyền nào</span>
                  ) : currentPerms.map((p) => (
                    <Badge key={p} variant="outline" className="text-xs font-mono">{p}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
