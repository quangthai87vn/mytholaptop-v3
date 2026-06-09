/**
 * Employee Detail Page — /settings/users/[id]
 *
 * Tab-based management page for employee profiles.
 * Canonical route: /settings/users/[id]
 *
 * Tabs:
 * 1. Thông tin cơ bản — personal info + avatar
 * 2. Thông tin tài khoản — account/role/password
 * 3. Quá trình công tác — employment history
 * 4. Phân quyền & trạng thái — permissions + status overview
 * 5. Hoạt động — recent activity log
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  User,
  Shield,
  Briefcase,
  Activity,
  KeyRound,
  BadgeCheck,
  BadgeX,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { adminFetch } from "@/lib/api/admin-fetch";
import { useAuthStore } from "@/lib/auth/store";
import { ROLE_LABELS, ROLE_BADGE_COLORS, canManageUser, type Role } from "@/lib/auth/permissions";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StaffDetail {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  status: "active" | "inactive";
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  phone: string | null;
  citizen_id: string | null;
  address: string | null;
  birth_date: string | null;
  gender: string | null;
  emergency_contact: string | null;
  employee_type: string | null;
  job_title: string | null;
  department: string | null;
  start_date: string | null;
  end_date: string | null;
  employment_status: string | null;
  manager_id: string | null;
  notes: string | null;
  disabled_at: string | null;
  disabled_by: string | null;
}

interface StaffListItem {
  id: string;
  full_name: string;
  role: Role;
}

type Tab = "basic" | "account" | "employment" | "permissions" | "activity";

const TABS: { key: Tab; label: string; icon: typeof User }[] = [
  { key: "basic", label: "Thông tin cơ bản", icon: User },
  { key: "account", label: "Thông tin tài khoản", icon: Shield },
  { key: "employment", label: "Quá trình công tác", icon: Briefcase },
  { key: "permissions", label: "Phân quyền & trạng thái", icon: BadgeCheck },
  { key: "activity", label: "Hoạt động", icon: Activity },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateInputValue(dateStr: string | null): string {
  if (!dateStr) return "";
  // dateStr có thể là ISO full timestamp hoặc YYYY-MM-DD
  // Dùng regex để tránh timezone shift khi parse
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  try {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

function getInitials(name: string): string {
  if (!name) return "??";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

const GENDER_LABELS: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

const EMPLOYEE_TYPE_LABELS: Record<string, string> = {
  intern: "Thực tập sinh",
  employee: "Nhân viên",
  freelancer: "Freelancer",
  collaborator: "Cộng tác viên",
};

const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  working: "Đang làm",
  on_leave: "Tạm nghỉ",
  suspended: "Tạm ngưng",
  terminated: "Nghỉ việc",
};

// ─── Tab: Basic Info ──────────────────────────────────────────────────────────

function BasicInfoTab({
  staff,
  isSelf,
  isAdmin,
  onSave,
  saving,
}: {
  staff: StaffDetail;
  isSelf: boolean;
  isAdmin: boolean;
  onSave: (data: Partial<StaffDetail>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    full_name: staff.full_name || "",
    phone: staff.phone || "",
    citizen_id: staff.citizen_id || "",
    address: staff.address || "",
    birth_date: toDateInputValue(staff.birth_date),
    gender: staff.gender || "",
    emergency_contact: staff.emergency_contact || "",
    notes: staff.notes || "",
    avatar_url: staff.avatar_url || "",
  });

  const canEdit = isSelf || isAdmin;

  useEffect(() => {
    setForm({
      full_name: staff.full_name || "",
      phone: staff.phone || "",
      citizen_id: staff.citizen_id || "",
      address: staff.address || "",
      birth_date: toDateInputValue(staff.birth_date),
      gender: staff.gender || "",
      emergency_contact: staff.emergency_contact || "",
      notes: staff.notes || "",
      avatar_url: staff.avatar_url || "",
    });
  }, [staff]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      toast.error("Họ tên không được để trống.");
      return;
    }
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Avatar preview */}
        <div className="space-y-3">
          <Label>Ảnh đại diện</Label>
          <div className="flex items-center gap-4">
            <Avatar className="size-20">
              <AvatarImage src={form.avatar_url || undefined} alt={form.full_name} />
              <AvatarFallback className="text-lg">{getInitials(form.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1.5">
              <Input
                placeholder="https://example.com/avatar.png"
                value={form.avatar_url}
                onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
                disabled={!canEdit}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Nhập URL ảnh. Hỗ trợ JPG, PNG, GIF. Tối đa 2MB.
              </p>
            </div>
          </div>
        </div>

        {/* Status display */}
        <div className="space-y-3">
          <Label>Trạng thái tài khoản</Label>
          <div className="flex items-center gap-3 pt-1">
            {staff.status === "active" && !staff.disabled_at ? (
              <Badge variant="success" className="gap-1.5 text-sm px-3 py-1.5">
                <CheckCircle2 className="size-4" />
                Hoạt động
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1.5 text-sm px-3 py-1.5">
                <XCircle className="size-4" />
                Đã vô hiệu hóa
              </Badge>
            )}
          </div>
          {staff.disabled_at && (
            <p className="text-xs text-muted-foreground">
              Bị vô hiệu hóa lúc: {formatDate(staff.disabled_at)}
            </p>
          )}
        </div>

        {/* Họ tên */}
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Họ tên {canEdit && "*"}</Label>
          <Input
            id="full_name"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            disabled={!canEdit}
            required
            minLength={2}
          />
        </div>

        {/* Email (readonly) */}
        <div className="space-y-1.5">
          <Label>Email đăng nhập</Label>
          <Input value={staff.email} disabled />
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone">Số điện thoại</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="0273 381 2345"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            disabled={!canEdit}
          />
        </div>

        {/* CCCD */}
        <div className="space-y-1.5">
          <Label htmlFor="citizen_id">CCCD / CMND</Label>
          <Input
            id="citizen_id"
            placeholder="012 345 678"
            value={form.citizen_id}
            onChange={(e) => setForm((f) => ({ ...f, citizen_id: e.target.value }))}
            disabled={!canEdit}
          />
        </div>

        {/* Birth date */}
        <div className="space-y-1.5">
          <Label htmlFor="birth_date">Ngày sinh</Label>
          <Input
            id="birth_date"
            type="date"
            value={form.birth_date}
            onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
            disabled={!canEdit}
          />
        </div>

        {/* Gender */}
        <div className="space-y-1.5">
          <Label htmlFor="gender">Giới tính</Label>
          <select
            id="gender"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={form.gender}
            onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
            disabled={!canEdit}
          >
            <option value="">— Chọn —</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </select>
        </div>

        {/* Emergency contact */}
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="emergency_contact">Liên hệ khẩn cấp</Label>
          <Input
            id="emergency_contact"
            placeholder="Nguyễn Văn B - 0901 234 567"
            value={form.emergency_contact}
            onChange={(e) => setForm((f) => ({ ...f, emergency_contact: e.target.value }))}
            disabled={!canEdit}
          />
        </div>

        {/* Address */}
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="address">Địa chỉ</Label>
          <Input
            id="address"
            placeholder="123 Trần Hưng Đạo, P.1, TP. Mỹ Tho, Tiền Giang"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            disabled={!canEdit}
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="notes">Ghi chú</Label>
          <textarea
            id="notes"
            className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Ghi chú về nhân viên..."
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            disabled={!canEdit}
          />
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Đang lưu...</> : <><Save className="mr-2 size-4" /> Lưu thông tin</>}
          </Button>
        </div>
      )}
    </form>
  );
}

// ─── Tab: Account Info ────────────────────────────────────────────────────────

function AccountTab({
  staff,
  isSelf,
  isSuperAdmin,
  onSave,
  saving,
}: {
  staff: StaffDetail;
  isSelf: boolean;
  isSuperAdmin: boolean;
  onSave: (data: { password?: string; role?: Role; status?: "active" | "inactive" }) => void;
  saving: boolean;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [canEditRoleStatus, setCanEditRoleStatus] = useState(isSuperAdmin);
  const [editRole, setEditRole] = useState<Role>(staff.role);
  const [editStatus, setEditStatus] = useState<"active" | "inactive">(staff.status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password) {
      if (password.length < 8) {
        setError("Mật khẩu phải có ít nhất 8 ký tự.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Mật khẩu xác nhận không khớp.");
        return;
      }
    }

    const data: { password?: string; role?: Role; status?: "active" | "inactive" } = {};
    if (password) data.password = password;
    if (canEditRoleStatus && editRole !== staff.role) data.role = editRole;
    if (canEditRoleStatus && editStatus !== staff.status) data.status = editStatus;

    onSave(data);
    if (password) {
      setPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email */}
      <div className="space-y-1.5">
        <Label>Email đăng nhập</Label>
        <Input value={staff.email} disabled />
      </div>

      {/* Role — only super_admin can edit */}
      {canEditRoleStatus && (
        <div className="space-y-1.5">
          <Label htmlFor="edit-role">Vai trò</Label>
          <select
            id="edit-role"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={editRole}
            onChange={(e) => setEditRole(e.target.value as Role)}
          >
            {isSuperAdmin && <option value="super_admin">Super Admin</option>}
            <option value="admin">Quản trị viên</option>
            <option value="editor">Biên tập viên</option>
            <option value="viewer">Người xem</option>
            <option value="intern">Thực tập sinh</option>
          </select>
          <p className="text-xs text-muted-foreground">
            {staff.role === "super_admin" && "Không thể thay đổi vai trò của Super Admin cuối cùng."}
          </p>
        </div>
      )}

      {!canEditRoleStatus && (
        <div className="space-y-1.5">
          <Label>Vai trò</Label>
          <Badge className={ROLE_BADGE_COLORS[staff.role]}>
            <Shield className="size-3 mr-1" />
            {ROLE_LABELS[staff.role]}
          </Badge>
          <p className="text-xs text-muted-foreground">
            Chỉ Super Admin mới có quyền thay đổi vai trò.
          </p>
        </div>
      )}

      {/* Status */}
      <div className="space-y-1.5">
        <Label>Trạng thái tài khoản</Label>
        <div className="flex items-center gap-3">
          {staff.status === "active" && !staff.disabled_at ? (
            <Badge variant="success" className="gap-1.5">
              <CheckCircle2 className="size-3.5" /> Hoạt động
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1.5">
              <XCircle className="size-3.5" /> Đã vô hiệu hóa
            </Badge>
          )}
        </div>
      </div>

      {/* Password change */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <KeyRound className="size-4" /> Đổi mật khẩu
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          {isSelf
            ? "Nhập mật khẩu mới để thay đổi. Để trống nếu không đổi."
            : "Chỉ Super Admin mới có quyền đổi mật khẩu cho nhân viên."}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Mật khẩu mới</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Ít nhất 8 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Nhập lại mật khẩu</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Đang lưu...</> : <><Save className="mr-2 size-4" /> Lưu thay đổi</>}
        </Button>
      </div>
    </form>
  );
}

// ─── Tab: Employment ─────────────────────────────────────────────────────────

function EmploymentTab({
  staff,
  isSelf,
  isAdmin,
  onSave,
  saving,
}: {
  staff: StaffDetail;
  isSelf: boolean;
  isAdmin: boolean;
  onSave: (data: Partial<StaffDetail>) => void;
  saving: boolean;
}) {
  const canEdit = isSelf || isAdmin;
  const [form, setForm] = useState({
    employee_type: staff.employee_type || "",
    job_title: staff.job_title || "",
    department: staff.department || "",
    start_date: toDateInputValue(staff.start_date),
    end_date: toDateInputValue(staff.end_date),
    employment_status: staff.employment_status || "",
    manager_id: staff.manager_id || "",
  });

  useEffect(() => {
    setForm({
      employee_type: staff.employee_type || "",
      job_title: staff.job_title || "",
      department: staff.department || "",
      start_date: toDateInputValue(staff.start_date),
      end_date: toDateInputValue(staff.end_date),
      employment_status: staff.employment_status || "",
      manager_id: staff.manager_id || "",
    });
  }, [staff]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Employee type */}
        <div className="space-y-1.5">
          <Label htmlFor="employee_type">Loại nhân sự</Label>
          <select
            id="employee_type"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={form.employee_type}
            onChange={(e) => setForm((f) => ({ ...f, employee_type: e.target.value }))}
            disabled={!canEdit}
          >
            <option value="">— Chọn —</option>
            <option value="intern">Thực tập sinh</option>
            <option value="employee">Nhân viên</option>
            <option value="freelancer">Freelancer</option>
            <option value="collaborator">Cộng tác viên</option>
          </select>
        </div>

        {/* Job title */}
        <div className="space-y-1.5">
          <Label htmlFor="job_title">Vị trí công việc</Label>
          <select
            id="job_title"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={form.job_title}
            onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
            disabled={!canEdit}
          >
            <option value="">— Chọn —</option>
            <option value="Content Writer">Content Writer</option>
            <option value="Designer">Designer</option>
            <option value="Video Editor">Video Editor</option>
            <option value="SEO">SEO</option>
            <option value="Reviewer">Reviewer</option>
            <option value="Sales">Sales</option>
            <option value="Technician">Technician</option>
            <option value="Admin">Admin</option>
            <option value="Other">Khác</option>
          </select>
        </div>

        {/* Department */}
        <div className="space-y-1.5">
          <Label htmlFor="department">Bộ phận / Phòng</Label>
          <Input
            id="department"
            placeholder="Marketing, IT, Kinh doanh..."
            value={form.department}
            onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            disabled={!canEdit}
          />
        </div>

        {/* Start date */}
        <div className="space-y-1.5">
          <Label htmlFor="start_date">Ngày bắt đầu</Label>
          <Input
            id="start_date"
            type="date"
            value={form.start_date}
            onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            disabled={!canEdit}
          />
        </div>

        {/* End date */}
        <div className="space-y-1.5">
          <Label htmlFor="end_date">Ngày kết thúc (nếu có)</Label>
          <Input
            id="end_date"
            type="date"
            value={form.end_date}
            onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            disabled={!canEdit}
          />
        </div>

        {/* Employment status */}
        <div className="space-y-1.5">
          <Label htmlFor="employment_status">Trạng thái làm việc</Label>
          <select
            id="employment_status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={form.employment_status}
            onChange={(e) => setForm((f) => ({ ...f, employment_status: e.target.value }))}
            disabled={!canEdit}
          >
            <option value="">— Chọn —</option>
            <option value="working">Đang làm</option>
            <option value="on_leave">Tạm nghỉ</option>
            <option value="suspended">Tạm ngưng</option>
            <option value="terminated">Nghỉ việc</option>
          </select>
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Đang lưu...</> : <><Save className="mr-2 size-4" /> Lưu công tác</>}
          </Button>
        </div>
      )}
    </form>
  );
}

// ─── Tab: Permissions & Status ────────────────────────────────────────────────

function PermissionsTab({ staff }: { staff: StaffDetail }) {
  return (
    <div className="space-y-6">
      {/* Role display */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Vai trò hiện tại</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge className={`text-sm px-3 py-1.5 ${ROLE_BADGE_COLORS[staff.role]}`}>
              <Shield className="size-4 mr-1.5" />
              {ROLE_LABELS[staff.role]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Vai trò xác định quyền truy cập của nhân viên trong hệ thống.
          </p>
        </CardContent>
      </Card>

      {/* Account status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Trạng thái tài khoản</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            {staff.status === "active" && !staff.disabled_at ? (
              <Badge variant="success" className="gap-1.5 text-sm px-3 py-1.5">
                <BadgeCheck className="size-4" /> Hoạt động
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1.5 text-sm px-3 py-1.5">
                <BadgeX className="size-4" /> Đã vô hiệu hóa
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Đăng nhập cuối</p>
              <p className="font-medium">{formatDate(staff.last_login_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Ngày tạo tài khoản</p>
              <p className="font-medium">{formatDate(staff.created_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cập nhật lần cuối</p>
              <p className="font-medium">{formatDate(staff.updated_at)}</p>
            </div>
            {staff.disabled_at && (
              <div>
                <p className="text-muted-foreground">Bị vô hiệu hóa lúc</p>
                <p className="font-medium text-destructive">{formatDate(staff.disabled_at)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employment status */}
      {staff.employment_status && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Trạng thái công tác</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-sm">
              {staff.employment_status === "working" && (
                <Badge variant="success" className="gap-1.5">
                  <CheckCircle2 className="size-3.5" />
                  {EMPLOYMENT_STATUS_LABELS[staff.employment_status]}
                </Badge>
              )}
              {staff.employment_status === "on_leave" && (
                <Badge variant="outline" className="gap-1.5">
                  Đang nghỉ: {EMPLOYMENT_STATUS_LABELS[staff.employment_status]}
                </Badge>
              )}
              {(staff.employment_status === "suspended" || staff.employment_status === "terminated") && (
                <Badge variant="secondary" className="gap-1.5">
                  {EMPLOYMENT_STATUS_LABELS[staff.employment_status]}
                </Badge>
              )}
              {staff.start_date && (
                <span className="text-muted-foreground">
                  Từ {formatDate(staff.start_date)}
                  {staff.end_date && ` → ${formatDate(staff.end_date)}`}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab: Activity ─────────────────────────────────────────────────────────────

function ActivityTab({ staffId }: { staffId: string }) {
  const [activities, setActivities] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await adminFetch(`/api/activity?target_user_id=${staffId}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data.data || []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [staffId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <Activity className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground text-center">
            Chưa có nhật ký hoạt động.
          </p>
        </CardContent>
      </Card>
    );
  }

  const ACTION_LABELS: Record<string, string> = {
    "user.created": "Tạo tài khoản",
    "user.role_changed": "Đổi vai trò",
    "user.status_changed": "Đổi trạng thái",
    "user.password_reset": "Đổi mật khẩu",
    "user.disabled": "Vô hiệu hóa",
    "settings.company_updated": "Cập nhật công ty",
    "settings.medusa_updated": "Cập nhật Medusa",
    "settings.woo_updated": "Cập nhật WooCommerce",
    "migration": "Chạy migration",
    "login": "Đăng nhập",
  };

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const action = (activity.action as string) || "";
        const actor = (activity.actor_name as string) || "Hệ thống";
        const createdAt = (activity.created_at as string) || "";
        return (
          <Card key={(activity.id as string) || Math.random()}>
            <CardContent className="py-3 px-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <div className="size-2 rounded-full bg-primary mt-2" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {ACTION_LABELS[action] || action}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {actor} &middot; {formatDate(createdAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function EmployeeDetailPage() {
  const params = useParams();
  const staffId = params.id as string;
  const currentUser = useAuthStore((s) => s.user);

  const [staff, setStaff] = useState<StaffDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("basic");
  const [saving, setSaving] = useState(false);

  const isSelf = currentUser?.id === staffId;
  const isSuperAdmin = currentUser?.role === "super_admin";
  const isAdmin = currentUser?.role === "admin";

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await adminFetch(`/api/staff/${staffId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setLoadError("Không tìm thấy nhân viên.");
        } else {
          setLoadError("Không thể tải thông tin nhân viên.");
        }
        return;
      }
      const data = await res.json();
      setStaff(data.data);
    } catch {
      setLoadError("Lỗi kết nối khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleSave = async (data: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await adminFetch(`/api/staff/${staffId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Lưu thất bại.");
        return;
      }
      toast.success("Đã lưu thay đổi!");
      setStaff(result.data);
    } catch {
      toast.error("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  if (loadError || !staff) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertCircle className="size-8 text-destructive" />
          <p className="text-destructive font-medium">{loadError || "Không tìm thấy nhân viên."}</p>
          <Button variant="outline" asChild>
            <Link href="/settings/users">
              <ArrowLeft className="mr-2 size-4" /> Quay lại
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/settings/users">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">
            {staff.full_name || staff.email}
          </h1>
          <p className="text-sm text-muted-foreground">
            {staff.job_title || staff.email}
          </p>
        </div>
      </div>

      {/* Profile card */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={staff.avatar_url || undefined} alt={staff.full_name} />
              <AvatarFallback className="text-lg">{getInitials(staff.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-semibold">{staff.full_name || "—"}</h2>
                <Badge className={`${ROLE_BADGE_COLORS[staff.role]} gap-1`}>
                  <Shield className="size-3" />
                  {ROLE_LABELS[staff.role]}
                </Badge>
                {staff.status === "active" && !staff.disabled_at ? (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="size-3" /> Hoạt động
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="size-3" /> Đã vô hiệu hóa
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{staff.email}</p>
              {(staff.phone || staff.department) && (
                <p className="text-sm text-muted-foreground">
                  {[staff.phone, staff.department].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                  }
                `}
              >
                <Icon className="size-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "basic" && (
          <BasicInfoTab
            staff={staff}
            isSelf={isSelf}
            isAdmin={isAdmin || isSuperAdmin}
            onSave={handleSave}
            saving={saving}
          />
        )}
        {activeTab === "account" && (
          <AccountTab
            staff={staff}
            isSelf={isSelf}
            isSuperAdmin={isSuperAdmin}
            onSave={handleSave}
            saving={saving}
          />
        )}
        {activeTab === "employment" && (
          <EmploymentTab
            staff={staff}
            isSelf={isSelf}
            isAdmin={isAdmin || isSuperAdmin}
            onSave={handleSave}
            saving={saving}
          />
        )}
        {activeTab === "permissions" && <PermissionsTab staff={staff} />}
        {activeTab === "activity" && <ActivityTab staffId={staffId} />}
      </div>
    </div>
  );
}
