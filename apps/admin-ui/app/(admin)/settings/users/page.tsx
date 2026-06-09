/**
 * Canonical User Management Page — /settings/users
 *
 * Tích hợp 3 tab:
 * - Người dùng (users): quản lý tài khoản nhân viên
 * - Vai trò (roles): quản lý roles (CRUD)
 * - Phân quyền (permissions): xem/sửa permission matrix
 *
 * RBAC:
 * - users.read → thấy tab Người dùng
 * - roles.read → thấy tab Vai trò
 * - permissions.read → thấy tab Phân quyền
 */

"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Users, Shield, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth/store";
import { hasPermission } from "@/lib/auth/permissions";

import UsersTab from "@/app/(admin)/staff/staff-users-tab";
import RolesPage from "@/app/(admin)/staff/roles/page";
import PermissionsPage from "@/app/(admin)/staff/permissions/page";
import type { AdminUser } from "@/lib/auth/session";

type Tab = "users" | "roles" | "permissions";

const TABS: { key: Tab; label: string; icon: typeof Users; permission: string }[] = [
  { key: "users", label: "Người dùng", icon: Users, permission: "users.read" },
  { key: "roles", label: "Vai trò", icon: Shield, permission: "roles.read" },
  { key: "permissions", label: "Phân quyền", icon: ShieldCheck, permission: "permissions.read" },
];

function TabContent({ tab }: { tab: Tab }) {
  switch (tab) {
    case "users":
      return <UsersTab />;
    case "roles":
      return <RolesPage />;
    case "permissions":
      return <PermissionsPage />;
  }
}

function LoadingFallback() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Đang tải...</p>
      </CardContent>
    </Card>
  );
}

export default function SettingsUsersPage() {
  const searchParams = useSearchParams();
  const urlTab = (searchParams.get("tab") as Tab) || "users";
  const [activeTab, setActiveTab] = useState<Tab>(urlTab);
  const currentUser = useAuthStore((s) => s.user);

  const visibleTabs = TABS.filter((t) => {
    if (!currentUser) return false;
    return hasPermission(currentUser, t.permission as never);
  });

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertCircle className="size-8 text-destructive" />
          <p className="text-destructive font-medium">Bạn chưa đăng nhập.</p>
        </CardContent>
      </Card>
    );
  }

  if (visibleTabs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertCircle className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">Bạn không có quyền truy cập trang này.</p>
        </CardContent>
      </Card>
    );
  }

  // Sync tab from URL param on mount
  if (urlTab !== activeTab && TABS.some((t) => t.key === urlTab)) {
    // Only sync on first render
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Người dùng</h1>
        <p className="text-muted-foreground">
          Quản lý tài khoản nhân viên, vai trò và phân quyền truy cập.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                ${isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                }
              `}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <Suspense fallback={<LoadingFallback />}>
        <TabContent tab={activeTab} />
      </Suspense>
    </div>
  );
}
