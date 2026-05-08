"use client";

import { useState, useCallback } from "react";
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
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Notification {
  id: string;
  type: "order" | "stock" | "sync" | "zns" | "care";
  title: string;
  message: string;
  time: string;
  read: boolean;
  href?: string;
}

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

interface SearchItem {
  title: string;
  href: string;
  group: "Sản phẩm" | "Khách hàng" | "Đơn hàng" | "Nội dung";
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Tổng quan",
  "/content": "Nội dung",
  "/content/ai-generator": "Tạo bài viết AI",
  "/content/facebook-posts": "Bài viết Facebook",
  "/content/website-posts": "Bài viết Website",
  "/content/video-scripts": "Kịch bản video",
  "/content/image-prompts": "Prompt hình ảnh",
  "/content/calendar": "Lịch đăng bài",
  "/content/library": "Thư viện nội dung",
  "/content/templates": "Mẫu nội dung",
  "/content/settings": "Cấu hình AI",
  "/products": "Sản phẩm",
  "/products/categories": "Danh mục",
  "/products/tags": "Thẻ",
  "/products/brands": "Thương hiệu",
  "/products/attributes": "Thuộc tính",
  "/products/variants": "Biến thể",
  "/products/inventory": "Kho hàng",
  "/products/sync": "Đồng bộ",
  "/sales": "Bán hàng",
  "/sales/orders": "Đơn hàng",
  "/sales/pos": "POS - Tạo đơn",
  "/sales/payments": "Thanh toán",
  "/sales/shipping": "Giao hàng",
  "/sales/refunds": "Trả hàng & hoàn tiền",
  "/sales/carts": "Giỏ hàng dở dang",
  "/sales/promotions": "Khuyến mãi",
  "/sales/quotes": "Báo giá",
  "/sales/logs": "Nhật ký bán hàng",
  "/customers": "Khách hàng",
  "/customers/groups": "Nhóm khách hàng",
  "/customers/purchase-history": "Lịch sử mua hàng",
  "/customers/warranty-debt": "Bảo hành & công nợ",
  "/customers/zns": "ZNS & CSKH",
  "/customers/care-scenarios": "Kịch bản chăm sóc",
  "/customers/segments": "Phân khúc khách hàng",
  "/customers/activity-log": "Nhật ký tương tác",
  "/staff": "Nhân viên",
  "/staff/roles": "Vai trò",
  "/staff/permissions": "Phân quyền",
  "/settings": "Cài đặt",
  "/migration": "Di chuyển dữ liệu",
};

const BREADCRUMB_SEGMENTS: Record<string, string> = {
  dashboard: "Tổng quan",
  content: "Nội dung",
  products: "Hàng hoá",
  sales: "Bán hàng",
  customers: "Khách hàng",
  staff: "Quản trị",
  settings: "Cài đặt",
  migration: "Di chuyển",
};

const NOTIFICATIONS: Notification[] = [
  {
    id: "n-1",
    type: "order",
    title: "Đơn hàng mới #MTL-2026-0507-001",
    message: "Nguyễn Văn Minh đặt 21.020.000đ - COD",
    time: "5 phút trước",
    read: false,
    href: "/sales/orders",
  },
  {
    id: "n-2",
    type: "stock",
    title: "Sản phẩm sắp hết hàng",
    message: "MacBook Air M2 13 inch đã hết hàng",
    time: "30 phút trước",
    read: false,
    href: "/products/inventory",
  },
  {
    id: "n-3",
    type: "zns",
    title: "ZNS gửi thất bại",
    message: "Tin nhắn ZNS #ZNS-2026-0507 không gửi được",
    time: "1 giờ trước",
    read: false,
    href: "/customers/zns",
  },
  {
    id: "n-4",
    type: "sync",
    title: "Đồng bộ WooCommerce lỗi",
    message: "2 sản phẩm không đồng bộ được - SKU trùng lặp",
    time: "2 giờ trước",
    read: true,
    href: "/products/sync",
  },
  {
    id: "n-5",
    type: "care",
    title: "Khách hàng cần chăm sóc",
    message: "Lê Hoàng Nam chưa mua 30 ngày",
    time: "3 giờ trước",
    read: true,
    href: "/customers/care-scenarios",
  },
  {
    id: "n-6",
    type: "order",
    title: "Đơn hàng giao thành công",
    message: "Đơn #MTL-2026-0506-002 đã giao thành công",
    time: "4 giờ trước",
    read: true,
    href: "/sales/orders",
  },
  {
    id: "n-7",
    type: "stock",
    title: "Sắp hết hàng",
    message: "HP ProBook 440 G9 chỉ còn 3 sản phẩm",
    time: "5 giờ trước",
    read: true,
    href: "/products/inventory",
  },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Tạo đơn hàng",
    href: "/sales/pos",
    icon: ShoppingCart,
    description: "POS - Tạo đơn hàng mới",
  },
  {
    label: "Thêm sản phẩm",
    href: "/products",
    icon: Package,
    description: "Thêm sản phẩm vào danh mục",
  },
  {
    label: "Thêm khách hàng",
    href: "/customers",
    icon: Users,
    description: "Thêm khách hàng mới",
  },
  {
    label: "Tạo bài viết AI",
    href: "/content/ai-generator",
    icon: Sparkles,
    description: "Tạo nội dung bằng AI",
  },
  {
    label: "Gửi ZNS",
    href: "/customers/zns",
    icon: Sparkles,
    description: "Gửi tin nhắn ZNS cho khách hàng",
  },
  {
    label: "Đồng bộ hàng hoá",
    href: "/products/sync",
    icon: RefreshCw,
    description: "Đồng bộ với WooCommerce",
  },
];

const SEARCH_ITEMS: SearchItem[] = [
  { title: "Dell Inspiron 15 5510", href: "/products", group: "Sản phẩm" },
  { title: "MacBook Air M2", href: "/products", group: "Sản phẩm" },
  { title: "Lenovo ThinkPad E14", href: "/products", group: "Sản phẩm" },
  { title: "HP Pavilion 15", href: "/products", group: "Sản phẩm" },
  { title: "Nguyễn Văn Minh", href: "/customers", group: "Khách hàng" },
  { title: "Trần Thị Hoa", href: "/customers", group: "Khách hàng" },
  { title: "Lê Hoàng Nam", href: "/customers", group: "Khách hàng" },
  { title: "Đơn hàng #MTL-2026-0507-001", href: "/sales/orders", group: "Đơn hàng" },
  { title: "Đơn hàng #MTL-2026-0506-001", href: "/sales/orders", group: "Đơn hàng" },
  { title: "Bài viết Facebook - Dell Inspiron", href: "/content/facebook-posts", group: "Nội dung" },
  { title: "Video script - MacBook Air M2", href: "/content/video-scripts", group: "Nội dung" },
  { title: "SEO bài viết - ThinkPad E14", href: "/content/website-posts", group: "Nội dung" },
];

const CURRENT_USER = {
  name: "Nguyễn Văn Admin",
  email: "admin@mytholaptop.vn",
  role: "Quản trị viên",
  avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
  initials: "AD",
};

const NOTIF_ICONS: Record<Notification["type"], LucideIcon> = {
  order: ShoppingCart,
  stock: Package,
  sync: RefreshCw,
  zns: XCircle,
  care: Users,
};

const NOTIF_COLORS: Record<Notification["type"], string> = {
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

// ─────────────────────────────────────────────
// AdminHeader
// ─────────────────────────────────────────────

interface AdminHeaderProps {
  onMobileMenuOpen: () => void;
}

export function AdminHeader({ onMobileMenuOpen }: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>(NOTIFICATIONS);
  const [searchOpen, setSearchOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const pageTitle = getPageTitle(pathname);
  const breadcrumbs = buildBreadcrumbs(pathname);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-30 flex h-[68px] items-center border-b border-gray-200 bg-white/95 backdrop-blur-sm",
          "transition-all duration-300 ease-in-out"
        )}
      >
        {/* ── LEFT: Mobile menu + Breadcrumb + Page title ── */}
        <div className="flex items-center gap-3 px-4 lg:pl-6 min-w-0">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 md:hidden"
            onClick={onMobileMenuOpen}
            aria-label="Mở menu"
          >
            <Menu className="size-5" />
          </Button>

          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1 text-xs text-gray-400 leading-none"
          >
            <Link
              href="/"
              className="flex items-center hover:text-gray-600 transition-colors"
              aria-label="Trang chủ"
            >
              <Home className="size-3.5" />
            </Link>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <span key={crumb.href} className="flex items-center gap-1">
                  <ChevronRight className="size-3 text-gray-300" />
                  {isLast ? (
                    <span className="font-medium text-gray-700 truncate max-w-[140px]">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="hover:text-gray-600 transition-colors truncate max-w-[100px]"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>

          {/* Page title - desktop */}
          {pageTitle && (
            <span className="hidden xl:block text-sm font-semibold text-gray-900 leading-tight truncate max-w-[200px]">
              {pageTitle}
            </span>
          )}
        </div>

        {/* ── CENTER: Global search ── */}
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
              <span className="text-[9px]">Ctrl</span>
              <span>K</span>
            </kbd>
          </button>
        </div>

        {/* ── RIGHT: Actions ── */}
        <div className="flex items-center gap-1 pr-4 min-w-0">
          {/* Mobile search icon */}
          <Button
            variant="ghost"
            size="icon"
            className="size-9 md:hidden shrink-0"
            onClick={() => setSearchOpen(true)}
            aria-label="Tìm kiếm"
          >
            <Search className="size-[18px]" />
          </Button>

          {/* Quick action */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="h-9 gap-1.5 font-medium text-[13px] px-3 bg-primary hover:bg-primary/90 text-primary-foreground border-0"
              >
                <Plus className="size-4 shrink-0" />
                <span className="hidden xl:inline">Tạo nhanh</span>
                <span className="xl:hidden">Tạo</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="text-[11px] text-gray-400 font-normal py-2">
                Chọn hành động nhanh
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {QUICK_ACTIONS.map((action) => (
                <DropdownMenuItem
                  key={action.href}
                  className="flex items-start gap-3 py-2.5 cursor-pointer"
                  onClick={() => router.push(action.href)}
                >
                  <action.icon className="size-4 mt-0.5 shrink-0 text-gray-400" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[13px] font-medium">{action.label}</span>
                    {action.description && (
                      <span className="text-[11px] text-gray-400">{action.description}</span>
                    )}
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
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[14px]">Thông báo</h3>
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="text-[10px] px-1.5 py-0.5 h-4 font-semibold"
                    >
                      {unreadCount} mới
                    </Badge>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    className="text-[11px] text-gray-400 hover:text-gray-700 transition-colors"
                    onClick={markAllRead}
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>

              {/* List */}
              <ScrollArea className="max-h-[380px]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bell className="size-10 text-gray-200 mb-3" />
                    <p className="text-[13px] text-gray-400">Không có thông báo nào</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notif) => {
                      const Icon = NOTIF_ICONS[notif.type];
                      return (
                        <Link
                          key={notif.id}
                          href={notif.href || "#"}
                          className={cn(
                            "flex items-start gap-3 px-4 py-3",
                            "hover:bg-gray-50 transition-colors",
                            !notif.read && "bg-primary/5"
                          )}
                          onClick={() => markRead(notif.id)}
                        >
                          <div
                            className={cn(
                              "mt-0.5 size-8 rounded-full flex items-center justify-center shrink-0",
                              NOTIF_COLORS[notif.type]
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                className={cn(
                                  "text-[13px] leading-tight",
                                  !notif.read ? "font-medium text-gray-900" : "font-normal text-gray-600"
                                )}
                              >
                                {notif.title}
                              </p>
                              {!notif.read && (
                                <span className="size-1.5 rounded-full bg-primary shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1 leading-snug">
                              {notif.message}
                            </p>
                            <p className="text-[10px] text-gray-300 mt-1">{notif.time}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Footer */}
              <div className="border-t px-4 py-2.5">
                <Link
                  href="/notifications"
                  className="text-[11px] text-center text-gray-400 hover:text-gray-600 transition-colors block"
                >
                  Xem tất cả thông báo
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2.5 h-10 px-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Avatar className="size-8 shrink-0 ring-2 ring-white shadow-sm">
                  <AvatarImage src={CURRENT_USER.avatarUrl} alt={CURRENT_USER.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-bold">
                    {CURRENT_USER.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden xl:flex flex-col items-start gap-0.5 min-w-0">
                  <span className="text-[13px] font-medium leading-none text-gray-800 truncate max-w-[120px]">
                    {CURRENT_USER.name}
                  </span>
                  <span className="text-[10px] text-gray-400 leading-none">
                    {CURRENT_USER.role}
                  </span>
                </div>
                <ChevronRight className="hidden xl:block size-3 text-gray-300 rotate-90" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {/* User info */}
              <DropdownMenuLabel className="font-normal p-0">
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <Avatar className="size-10 shrink-0 ring-2 ring-white shadow-sm">
                    <AvatarImage src={CURRENT_USER.avatarUrl} alt={CURRENT_USER.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {CURRENT_USER.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="text-[14px] font-semibold text-gray-900 truncate">
                      {CURRENT_USER.name}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">{CURRENT_USER.email}</p>
                    <span className="inline-flex items-center mt-0.5 text-[10px] text-primary font-semibold">
                      {CURRENT_USER.role}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="gap-2.5 cursor-pointer text-[13px] py-2.5"
                onClick={() => router.push("/profile")}
              >
                <Users className="size-4 text-gray-400" />
                Hồ sơ cá nhân
              </DropdownMenuItem>

              <DropdownMenuItem
                className="gap-2.5 cursor-pointer text-[13px] py-2.5"
                onClick={() => router.push("/settings")}
              >
                <Settings className="size-4 text-gray-400" />
                Cài đặt tài khoản
              </DropdownMenuItem>

              <DropdownMenuItem
                className="gap-2.5 cursor-pointer text-[13px] py-2.5"
                onClick={() => router.push("/settings")}
              >
                <Lock className="size-4 text-gray-400" />
                Đổi mật khẩu
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="gap-2.5 cursor-pointer text-destructive focus:text-destructive/80 text-[13px] py-2.5"
                onClick={() => router.push("/login")}
              >
                <LogOut className="size-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Search Dialog */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

// ─────────────────────────────────────────────
// Search Dialog
// ─────────────────────────────────────────────

function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const filtered = SEARCH_ITEMS.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const groups = ["Sản phẩm", "Khách hàng", "Đơn hàng", "Nội dung"] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden rounded-xl border-gray-200 shadow-xl">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 bg-white">
          <Search className="size-4 shrink-0 text-gray-400" />
          <Input
            autoFocus
            placeholder="Tìm sản phẩm, khách hàng, đơn hàng, SKU..."
            className="border-0 shadow-none p-0 h-auto text-[14px] focus-visible:ring-0 bg-transparent"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] text-gray-400 shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[360px]">
          {query === "" ? (
            <div className="py-10 text-center">
              <Search className="size-8 text-gray-200 mx-auto mb-3" />
              <p className="text-[13px] text-gray-400 font-medium">Bắt đầu nhập để tìm kiếm</p>
              <p className="text-[11px] text-gray-300 mt-1">
                Tìm sản phẩm, khách hàng, đơn hàng, SKU...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <Search className="size-8 text-gray-200 mx-auto mb-3" />
              <p className="text-[13px] text-gray-400">
                Không tìm thấy kết quả cho "{query}"
              </p>
            </div>
          ) : (
            <div className="py-1">
              {groups.map((group) => {
                const items = filtered.filter((i) => i.group === group);
                if (items.length === 0) return null;
                return (
                  <div key={group}>
                    <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-300">
                      {group}
                    </p>
                    {items.map((item) => (
                      <button
                        key={item.title}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                        onClick={() => handleSelect(item.href)}
                      >
                        <Search className="size-3.5 text-gray-300 shrink-0" />
                        <span className="text-[13px] text-gray-700">{item.title}</span>
                        <span className="ml-auto text-[10px] text-gray-300">{item.group}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 bg-gray-50/60">
          <span className="text-[10px] text-gray-300 flex items-center gap-1">
            <kbd className="rounded border border-gray-200 bg-white px-1 font-mono text-[9px]">↑↓</kbd>
            di chuyển
          </span>
          <span className="text-[10px] text-gray-300 flex items-center gap-1">
            <kbd className="rounded border border-gray-200 bg-white px-1 font-mono text-[9px]">Enter</kbd>
            chọn
          </span>
          <span className="text-[10px] text-gray-300 flex items-center gap-1">
            <kbd className="rounded border border-gray-200 bg-white px-1 font-mono text-[9px]">ESC</kbd>
            đóng
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
