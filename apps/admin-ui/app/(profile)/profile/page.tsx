"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  ShieldCheck,
  Clock,
  CalendarDays,
  KeyRound,
  Edit3,
  Loader2,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth/store";
import { adminFetch } from "@/lib/api/admin-fetch";
import { ROLE_LABELS, ROLE_BADGE_COLORS, type Role, type Permission } from "@/lib/auth/permissions";

interface ProfileUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  status: "active" | "inactive";
  last_login_at: string | null;
  created_at: string;
}

function getUserInitials(name: string): string {
  if (!name) return "...";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function PermissionBadge({ perm }: { perm: Permission }) {
  const parts = perm.split(".");
  return (
    <Badge variant="outline" className="text-[11px] font-normal">
      {parts[0]}.<span className="font-medium">{parts[1]}</span>
    </Badge>
  );
}

function ProfileCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="size-16 rounded-full bg-gray-200 animate-pulse" />
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-48" />
        <div className="h-3 bg-gray-200 rounded animate-pulse w-32" />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const checkSession = useAuthStore((s) => s.checkSession);

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/profile/me", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tải hồ sơ");
      setUser(data.user);
      setPermissions(data.permissions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi khi tải hồ sơ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Refresh auth store if user data changed
  useEffect(() => {
    if (user && currentUser) {
      if (user.full_name !== currentUser.full_name || user.role !== currentUser.role) {
        checkSession();
      }
    }
  }, [user, currentUser, checkSession]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
        <p className="text-sm text-gray-500 mt-1">Thông tin tài khoản và quyền hạn của bạn</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <Info className="size-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Card: Avatar + Basic Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="size-4 text-gray-400" />
            Thông tin cá nhân
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <ProfileCardSkeleton />
          ) : user ? (
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="size-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shrink-0 ring-2 ring-white shadow">
                {getUserInitials(user.full_name)}
              </div>

              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{user.full_name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={cn(ROLE_BADGE_COLORS[user.role])}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                      <Badge variant={user.status === "active" ? "default" : "secondary"}>
                        {user.status === "active" ? "Đang hoạt động" : "Không hoạt động"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => router.push("/profile/settings")}
                  >
                    <Edit3 className="size-3.5" />
                    Sửa hồ sơ
                  </Button>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2.5">
                    <Mail className="size-4 text-gray-400 shrink-0" />
                    <span className="text-gray-600">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className="size-4 text-gray-400 shrink-0" />
                    <span className="text-gray-600">
                      Tạo: {formatDate(user.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Clock className="size-4 text-gray-400 shrink-0" />
                    <span className="text-gray-600">
                      Đăng nhập gần nhất: {formatDate(user.last_login_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="size-4 text-gray-400 shrink-0" />
                    <span className="text-gray-600">
                      Vai trò: <span className="font-medium">{ROLE_LABELS[user.role]}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Card: Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="size-4 text-gray-400" />
            Quyền hiện có
          </CardTitle>
          <CardDescription>Read-only — chỉ dùng để tham khảo</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" style={{ width: `${120 + i * 30}px` }} />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {permissions.length === 0 ? (
                <p className="text-sm text-gray-400">Không có quyền nào được gán</p>
              ) : (
                permissions.map((p) => <PermissionBadge key={p} perm={p} />)
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card: Account Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="size-4 text-gray-400" />
            Bảo mật tài khoản
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Đổi mật khẩu</p>
              <p className="text-xs text-gray-500 mt-0.5">Cập nhật mật khẩu để bảo vệ tài khoản</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/profile/password")}
            >
              <KeyRound className="size-3.5" />
              Đổi mật khẩu
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
