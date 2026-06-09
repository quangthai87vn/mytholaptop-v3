"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  Home,
  ChevronRight,
  Bell,
  Plus,
  Search,
  ShoppingCart,
  Package,
  Users,
  Sparkles,
  RefreshCw,
  XCircle,
  Settings,
  LogOut,
  Lock,
  Check,
  AlertTriangle,
  Clock,
  Calendar,
  UserCheck,
  Send,
  Clapperboard,
  CheckCircle2,
  Loader2,
  LayoutDashboard,
  CheckSquare,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandPalette } from "@/components/search/command-palette";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth/store";
import { ROLE_LABELS } from "@/lib/auth/permissions";

// ─────────────────────────────────────────────
// Notification Types
// ─────────────────────────────────────────────

type NotificationType =
  | "task_assigned"
  | "task_due_soon"
  | "task_overdue"
  | "task_approved"
  | "task_rejected"
  | "task_submit_review"
  | "publish_scheduled"
  | "campaign_deadline"
  | "system"
  | "order"
  | "stock"
  | "sync"
  | "zns"
  | "care";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  time: string;
  read: boolean;
  href?: string;
  entityType?: string;
  entityId?: string;
}

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

const PAGE_TITLES: Record<string, string> = {
  // Workspace
  "/dashboard": "Dashboard",
  "/workspace": "Workspace",
  "/projects": "Dự án",
  "/projects/[id]": "Chi tiết dự án",
  "/campaigns": "Chiến dịch",
  "/campaigns/[id]": "Chi tiết chiến dịch",
  "/tasks": "Công việc",
  "/tasks/[id]": "Chi tiết công việc",
  "/content": "Nội dung",
  "/content/[id]": "Chi tiết nội dung",
  "/media-workflow": "Media Workflow",
  "/media-workflow/[id]": "Chi tiết workflow",
  "/calendar": "Calendar",
  "/team": "Team",
  "/team/interns": "Thực tập sinh",
  "/team/members": "Thành viên",
  "/team/roles": "Vai trò",
  "/reports": "Reports",
  // Products
  "/products": "Sản phẩm",
  "/products/categories": "Danh mục",
  "/products/tags": "Thẻ",
  "/products/brands": "Thương hiệu",
  "/products/attributes": "Thuộc tính",
  "/products/variants": "Biến thể",
  "/products/inventory": "Kho hàng",
  "/products/sync": "Đồng bộ",
  // Sales
  "/sales": "Bán hàng",
  "/sales/orders": "Đơn hàng",
  "/sales/pos": "POS",
  "/sales/payments": "Thanh toán",
  "/sales/shipping": "Giao hàng",
  "/sales/refunds": "Trả hàng & hoàn tiền",
  "/sales/carts": "Giỏ hàng đang dở",
  "/sales/promotions": "Khuyến mãi",
  "/sales/quotes": "Báo giá",
  "/sales/logs": "Nhật ký bán hàng",
  // Customers
  "/customers": "Khách hàng",
  "/customers/groups": "Nhóm khách hàng",
  "/customers/purchase-history": "Lịch sử mua hàng",
  "/customers/warranty-debt": "Bảo hành & công nợ",
  "/customers/zns": "ZNS & CSKH",
  "/customers/care-scenarios": "Kịch bản chăm sóc",
  "/customers/segments": "Phân khúc khách hàng",
  "/customers/activity-log": "Nhật ký tương tác",
  // Profile
  "/profile": "Hồ sơ cá nhân",
  "/profile/password": "Đổi mật khẩu",
  "/profile/settings": "Cài đặt tài khoản",
  // Settings
  "/settings": "Cài đặt",
  "/settings/ai": "AI Engine",
  "/settings/notifications": "Thông báo",
  "/settings/team": "Team",
  "/settings/data": "Dữ liệu",
  "/settings/system": "Hệ thống",
  // Legacy (for compatibility — will redirect in P8.x)
  "/content/ai-generator": "Tạo bài viết AI",
  "/content/facebook-posts": "Bài viết Facebook",
  "/content/website-posts": "Bài viết Website",
  "/content/video-scripts": "Kịch bản video",
  "/content/image-prompts": "Prompt hình ảnh",
  "/content/calendar": "Lịch đăng bài",
  "/content/library": "Thư viện nội dung",
  "/content/templates": "Mẫu nội dung",
  "/content/settings": "AI Engine",
  "/content/media-prompts": "Media Workflow",
  "/workspace/activity": "Hoạt động",
  "/workspace/calendar": "Calendar",
  "/staff": "Team",
  "/staff/roles": "Vai trò",
  "/staff/permissions": "Phân quyền",
  "/interns": "Thực tập sinh",
  "/migration": "Di chuyển",
  "/notifications": "Thông báo",
};

const BREADCRUMB_SEGMENTS: Record<string, string> = {
  dashboard: "Dashboard",
  workspace: "Workspace",
  projects: "Dự án",
  campaigns: "Chiến dịch",
  tasks: "Công việc",
  content: "Nội dung",
  calendar: "Calendar",
  team: "Team",
  reports: "Reports",
  products: "Hàng hoá",
  sales: "Bán hàng",
  customers: "Khách hàng",
  settings: "Cài đặt",
  ai: "AI Engine",
  profile: "Hồ sơ cá nhân",
  migration: "Di chuyển",
};

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Tạo đơn hàng", href: "/sales/pos", icon: ShoppingCart, description: "POS - Tạo đơn hàng mới" },
  { label: "Thêm dự án", href: "/projects", icon: Target, description: "Tạo dự án mới" },
  { label: "Tạo chiến dịch", href: "/campaigns", icon: Clapperboard, description: "Tạo chiến dịch mới" },
  { label: "Giao việc", href: "/tasks", icon: CheckSquare, description: "Tạo công việc mới" },
  { label: "Tạo nội dung AI", href: "/content", icon: Sparkles, description: "Tạo nội dung bằng AI" },
  { label: "Xem dashboard", href: "/dashboard", icon: LayoutDashboard, description: "Tổng quan workspace" },
];

const NOTIF_ICONS: Record<NotificationType, LucideIcon> = {
  task_assigned: UserCheck,
  task_due_soon: Clock,
  task_overdue: AlertTriangle,
  task_approved: CheckCircle2,
  task_rejected: XCircle,
  task_submit_review: Send,
  publish_scheduled: Calendar,
  campaign_deadline: Clapperboard,
  system: Bell,
  order: ShoppingCart,
  stock: Package,
  sync: RefreshCw,
  zns: XCircle,
  care: Users,
};

const NOTIF_COLORS: Record<NotificationType, string> = {
  task_assigned: "text-blue-600 bg-blue-50",
  task_due_soon: "text-orange-600 bg-orange-50",
  task_overdue: "text-red-600 bg-red-50",
  task_approved: "text-green-600 bg-green-50",
  task_rejected: "text-red-600 bg-red-50",
  task_submit_review: "text-orange-600 bg-orange-50",
  publish_scheduled: "text-purple-600 bg-purple-50",
  campaign_deadline: "text-pink-600 bg-pink-50",
  system: "text-slate-600 bg-slate-50",
  order: "text-blue-600 bg-blue-50",
  stock: "text-amber-600 bg-amber-50",
  sync: "text-purple-600 bg-purple-50",
  zns: "text-primary bg-primary/10",
  care: "text-green-600 bg-green-50",
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getPageTitle(pathname: string): string {
  return PAGE_TITLES[pathname] || "";
}

function buildBreadcrumbs(pathname: string) {
  if (!pathname || pathname === "/") return [];
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg, idx) => ({
    label: BREADCRUMB_SEGMENTS[seg] ?? seg,
    href: "/" + segments.slice(0, idx + 1).join("/"),
  }));
}

function notifTimeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  return `${Math.floor(diffHour / 24)} ngày trước`;
}

function notifHref(notif: Notification): string {
  if (notif.entityType === "task" && notif.entityId) return `/tasks/${notif.entityId}`;
  if (notif.entityType === "campaign" && notif.entityId) return `/campaigns/${notif.entityId}`;
  if (notif.href) return notif.href;
  return "#";
}

function getUserInitials(fullName: string | null | undefined): string {
  if (!fullName) return "...";
  return fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getUserLabel(role: string | null | undefined): string {
  if (!role) return "—";
  return ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role;
}

// ─────────────────────────────────────────────
// AdminHeader
// ─────────────────────────────────────────────

interface AdminHeaderProps {
  onMobileMenuOpen: () => void;
}

export function AdminHeader({ onMobileMenuOpen }: AdminHeaderProps) {
  const currentUser = useAuthStore((s) => s.user);
  const isChecking = useAuthStore((s) => s.isChecking);
  const pathname = usePathname();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);

  const pageTitle = getPageTitle(pathname);
  const breadcrumbs = buildBreadcrumbs(pathname);

  // Filter quick actions by user permissions
  const visibleActions = useMemo(() => {
    const perms = new Set(currentUser?.permissions ?? []);
    const isSuperAdmin = currentUser?.role === "super_admin";
    return QUICK_ACTIONS.filter((action) => {
      if (action.href === "/content") {
        return isSuperAdmin || perms.has("ai_generate");
      }
      return true;
    });
  }, [currentUser]);

  // Fetch real notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=10", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const items: Notification[] = (data.data ?? []).map((n: Record<string, unknown>) => ({
          id: String(n.id),
          type: n.type as NotificationType,
          title: String(n.title),
          message: (n.message as string) || "",
          time: notifTimeAgo(String(n.createdAt)),
          read: Boolean(n.isRead),
          href: notifHref({
            id: String(n.id),
            type: n.type as NotificationType,
            title: String(n.title),
            message: (n.message as string) || "",
            time: notifTimeAgo(String(n.createdAt)),
            read: Boolean(n.isRead),
            entityType: (n.entityType as string) || undefined,
            entityId: (n.entityId as string) || undefined,
          }),
          entityType: (n.entityType as string) || undefined,
          entityId: (n.entityId as string) || undefined,
        }));
        setNotifications(items);
        setUnreadCount(data.unread ?? 0);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // P6.9: Ctrl+K / Cmd+K to open command palette
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const markRead = useCallback(async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", notificationIds: [id] }),
        credentials: "include",
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // fail silently
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
        credentials: "include",
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // fail silently
    }
  }, []);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-30 flex h-[68px] items-center border-b border-gray-200 bg-white/95 backdrop-blur-sm",
          "transition-all duration-300 ease-in-out"
        )}
      >
        {/* LEFT */}
        <div className="flex items-center gap-3 px-4 lg:pl-6 min-w-0">
          <Button variant="ghost" size="icon" className="size-9 shrink-0 md:hidden" onClick={onMobileMenuOpen} aria-label="Mở menu">
            <Menu className="size-5" />
          </Button>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-gray-400 leading-none">
            <Link href="/" className="flex items-center hover:text-gray-600 transition-colors" aria-label="Trang chủ">
              <Home className="size-3.5" />
            </Link>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <span key={crumb.href} className="flex items-center gap-1">
                  <ChevronRight className="size-3 text-gray-300" />
                  {isLast ? (
                    <span className="font-medium text-gray-700 truncate max-w-[140px]">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} className="hover:text-gray-600 transition-colors truncate max-w-[100px]">
                      {crumb.label}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>
          {pageTitle && (
            <span className="hidden xl:block text-sm font-semibold text-gray-900 leading-tight truncate max-w-[200px]">
              {pageTitle}
            </span>
          )}
        </div>

        {/* CENTER */}
        <div className="hidden md:flex flex-1 justify-center px-4 min-w-0">
          <button
            onClick={() => setSearchOpen(true)}
            className={cn(
              "flex items-center gap-3 h-9 rounded-lg border border-gray-200 bg-gray-50/60",
              "px-3.5 text-sm text-gray-400",
              "hover:border-primary/30 hover:bg-white transition-all duration-150 cursor-text",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              "w-full max-w-[440px]"
            )}
          >
            <Search className="size-4 shrink-0 text-gray-400" />
            <span className="flex-1 text-left text-[13px]">
              Tìm sản phẩm, khách hàng, đơn hàng, SKU...
            </span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-gray-400 shadow-sm">
              <span className="text-[9px]">Ctrl</span><span>K</span>
            </kbd>
          </button>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-1 pr-4 min-w-0">
          <Button variant="ghost" size="icon" className="size-9 md:hidden shrink-0" onClick={() => setSearchOpen(true)} aria-label="Tìm kiếm">
            <Search className="size-[18px]" />
          </Button>

          {/* Quick action */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-9 gap-1.5 font-medium text-[13px] px-3 bg-primary hover:bg-primary/90 text-primary-foreground border-0">
                <Plus className="size-4 shrink-0" />
                <span className="hidden xl:inline">Tạo nhanh</span>
                <span className="xl:hidden">Tạo</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="text-[11px] text-gray-400 font-normal py-2">Chọn hành động nhanh</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {visibleActions.map((action) => (
                <DropdownMenuItem key={action.href} className="flex items-start gap-3 py-2.5 cursor-pointer" onClick={() => router.push(action.href)}>
                  <action.icon className="size-4 mt-0.5 shrink-0 text-gray-400" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[13px] font-medium">{action.label}</span>
                    {action.description && <span className="text-[11px] text-gray-400">{action.description}</span>}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative size-9 shrink-0"
                aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ""}`}
              >
                <Bell className="size-[18px]" />
                {unreadCount > 0 && (
                  <Badge className="absolute -right-0.5 -top-0.5 size-4 min-w-4 min-h-4 justify-center p-0 text-[9px] font-bold bg-primary text-primary-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[14px]">Thông báo</h3>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 h-4 font-semibold">
                      {unreadCount} mới
                    </Badge>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button className="text-[11px] text-gray-400 hover:text-gray-700 transition-colors" onClick={markAllRead}>
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>

              <ScrollArea className="max-h-[380px]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bell className="size-10 text-gray-200 mb-3" />
                    <p className="text-[13px] text-gray-400">Không có thông báo nào</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notif) => {
                      const Icon = NOTIF_ICONS[notif.type] ?? Bell;
                      return (
                        <Link
                          key={notif.id}
                          href={notif.href || "#"}
                          className={cn(
                            "flex items-start gap-3 px-4 py-3",
                            "hover:bg-gray-50 transition-colors",
                            !notif.read && "bg-primary/5"
                          )}
                          onClick={() => {
                            if (!notif.read) markRead(notif.id);
                          }}
                        >
                          <div className={cn("mt-0.5 size-8 rounded-full flex items-center justify-center shrink-0", NOTIF_COLORS[notif.type])}>
                            <Icon className="size-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={cn("text-[13px] leading-tight", !notif.read ? "font-medium text-gray-900" : "font-normal text-gray-600")}>
                                {notif.title}
                              </p>
                              {!notif.read && <span className="size-1.5 rounded-full bg-primary shrink-0 mt-1" />}
                            </div>
                            {notif.message && (
                              <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1 leading-snug">{notif.message}</p>
                            )}
                            <p className="text-[10px] text-gray-300 mt-1">{notif.time}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              <div className="border-t px-4 py-2.5">
                <Link href="/notifications" className="text-[11px] text-center text-gray-400 hover:text-gray-600 transition-colors block">
                  Xem tất cả thông báo
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2.5 h-10 px-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Avatar className="size-8 shrink-0 ring-2 ring-white shadow-sm">
                  <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-bold">
                    {isChecking ? <Loader2 className="size-3.5 animate-spin" /> : getUserInitials(currentUser?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden xl:flex flex-col items-start gap-0.5 min-w-0">
                  {isChecking ? (
                    <span className="text-[13px] text-gray-300 leading-none">Đang tải...</span>
                  ) : (
                    <span className="text-[13px] font-medium leading-none text-gray-800 truncate max-w-[120px]">
                      {currentUser?.full_name || "—"}{" "}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400 leading-none">
                    {isChecking ? "" : getUserLabel(currentUser?.role)}
                  </span>
                </div>
                <ChevronRight className="hidden xl:block size-3 text-gray-300 rotate-90" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal p-0">
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <Avatar className="size-10 shrink-0 ring-2 ring-white shadow-sm">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {isChecking ? <Loader2 className="size-4 animate-spin" /> : getUserInitials(currentUser?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    {isChecking ? (
                      <p className="text-[14px] font-semibold text-gray-400 truncate">Đang tải...</p>
                    ) : currentUser ? (
                      <>
                        <p className="text-[14px] font-semibold text-gray-900 truncate">{currentUser.full_name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{currentUser.email}</p>
                        <span className="inline-flex items-center mt-0.5 text-[10px] text-primary font-semibold">
                          {getUserLabel(currentUser.role)}
                        </span>
                      </>
                    ) : (
                      <p className="text-[14px] text-muted-foreground">Chưa đăng nhập</p>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2.5 cursor-pointer text-[13px] py-2.5" onClick={() => router.push("/profile")}>
                <Users className="size-4 text-gray-400" />Hồ sơ cá nhân
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 cursor-pointer text-[13px] py-2.5" onClick={() => router.push("/profile/settings")}>
                <Settings className="size-4 text-gray-400" />Cài đặt tài khoản
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 cursor-pointer text-[13px] py-2.5" onClick={() => router.push("/profile/password")}>
                <Lock className="size-4 text-gray-400" />Đổi mật khẩu
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2.5 cursor-pointer text-destructive focus:text-destructive/80 text-[13px] py-2.5"
                onClick={async () => {
                  await useAuthStore.getState().logout();
                  router.push("/login");
                }}
              >
                <LogOut className="size-4" />Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Search Dialog — Command Palette (P6.9) */}
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
