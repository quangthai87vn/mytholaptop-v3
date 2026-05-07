"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Package,
  Users,
  ShoppingBag,
  Shield,
  Settings,
  FileText,
  Receipt,
  FolderTree,
  Tag,
  Building2,
  Warehouse,
  ArrowLeftRight,
  CreditCard,
  Truck,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Facebook,
  Globe,
  Video,
  ImageIcon,
  Calendar,
  Library,
  FileCode,
  Brain,
  BarChart3,
  Zap,
  Activity,
  UserRound,
  UserRoundCog,
  type LucideIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

interface SearchResult {
  title: string;
  description?: string;
  href: string;
  icon: LucideIcon;
  group: string;
}

const SEARCH_INDEX: SearchResult[] = [
  { title: "Tổng quan", href: "/dashboard", icon: LayoutDashboard, group: "Dashboard" },
  { title: "Sản phẩm", href: "/products", icon: Package, group: "Hàng hoá" },
  { title: "Danh mục", href: "/products/categories", icon: FolderTree, group: "Hàng hoá" },
  { title: "Thẻ", href: "/products/tags", icon: Tag, group: "Hàng hoá" },
  { title: "Thương hiệu", href: "/products/brands", icon: Building2, group: "Hàng hoá" },
  { title: "Thuộc tính", href: "/products/attributes", icon: Settings, group: "Hàng hoá" },
  { title: "Biến thể", href: "/products/variants", icon: Package, group: "Hàng hoá" },
  { title: "Kho hàng", href: "/products/inventory", icon: Warehouse, group: "Hàng hoá" },
  { title: "Đồng bộ", href: "/products/sync", icon: ArrowLeftRight, group: "Hàng hoá" },
  { title: "Bán hàng", href: "/sales", icon: ShoppingBag, group: "Bán hàng" },
  { title: "Đơn hàng", href: "/sales/orders", icon: Receipt, group: "Bán hàng" },
  { title: "POS - Tạo đơn", href: "/sales/pos", icon: ShoppingBag, group: "Bán hàng" },
  { title: "Thanh toán", href: "/sales/payments", icon: CreditCard, group: "Bán hàng" },
  { title: "Giao hàng", href: "/sales/shipping", icon: Truck, group: "Bán hàng" },
  { title: "Trả hàng & hoàn tiền", href: "/sales/refunds", icon: RotateCcw, group: "Bán hàng" },
  { title: "Giỏ hàng dở dang", href: "/sales/carts", icon: ShoppingCart, group: "Bán hàng" },
  { title: "Khuyến mãi", href: "/sales/promotions", icon: Tag, group: "Bán hàng" },
  { title: "Báo giá", href: "/sales/quotes", icon: FileText, group: "Bán hàng" },
  { title: "Nhật ký bán hàng", href: "/sales/logs", icon: Activity, group: "Bán hàng" },
  { title: "Khách hàng", href: "/customers", icon: Users, group: "Khách hàng" },
  { title: "Nhóm khách hàng", href: "/customers/groups", icon: UserRoundCog, group: "Khách hàng" },
  { title: "Lịch sử mua hàng", href: "/customers/purchase-history", icon: ShoppingCart, group: "Khách hàng" },
  { title: "Bảo hành & công nợ", href: "/customers/warranty-debt", icon: Shield, group: "Khách hàng" },
  { title: "ZNS & CSKH", href: "/customers/zns", icon: Activity, group: "Khách hàng" },
  { title: "Kịch bản chăm sóc", href: "/customers/care-scenarios", icon: Zap, group: "Khách hàng" },
  { title: "Phân khúc khách hàng", href: "/customers/segments", icon: BarChart3, group: "Khách hàng" },
  { title: "Nhật ký tương tác", href: "/customers/activity-log", icon: Activity, group: "Khách hàng" },
  { title: "Tạo bài viết AI", href: "/content/ai-generator", icon: Sparkles, group: "Nội dung" },
  { title: "Bài viết Facebook", href: "/content/facebook-posts", icon: Facebook, group: "Nội dung" },
  { title: "Bài viết Website", href: "/content/website-posts", icon: Globe, group: "Nội dung" },
  { title: "Kịch bản video", href: "/content/video-scripts", icon: Video, group: "Nội dung" },
  { title: "Prompt hình ảnh", href: "/content/image-prompts", icon: ImageIcon, group: "Nội dung" },
  { title: "Lịch đăng bài", href: "/content/calendar", icon: Calendar, group: "Nội dung" },
  { title: "Thư viện nội dung", href: "/content/library", icon: Library, group: "Nội dung" },
  { title: "Mẫu nội dung", href: "/content/templates", icon: FileCode, group: "Nội dung" },
  { title: "Cấu hình AI", href: "/content/settings", icon: Brain, group: "Nội dung" },
  { title: "Nhân viên", href: "/staff", icon: UserRound, group: "Quản trị" },
  { title: "Vai trò", href: "/staff/roles", icon: Shield, group: "Quản trị" },
  { title: "Phân quyền", href: "/staff/permissions", icon: Settings, group: "Quản trị" },
  { title: "Cài đặt", href: "/settings", icon: Settings, group: "Hệ thống" },
];

const GROUP_ORDER = ["Dashboard", "Hàng hoá", "Bán hàng", "Khách hàng", "Nội dung", "Quản trị", "Hệ thống"];

function groupBy(items: SearchResult[]): Record<string, SearchResult[]> {
  return items.reduce<Record<string, SearchResult[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});
}

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const filtered = SEARCH_INDEX;

  return (
    <>
      <Button
        variant="outline"
        className="h-9 w-full max-w-sm justify-start text-sm text-muted-foreground cursor-pointer hidden sm:flex"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 size-4" />
        <span>Tìm kiếm...</span>
        <kbd className="ml-auto hidden lg:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">Ctrl</span>K
        </kbd>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="size-9 sm:hidden"
        onClick={() => setOpen(true)}
        aria-label="Tìm kiếm"
      >
        <Search className="size-5" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Tìm kiếm sản phẩm, đơn hàng, khách hàng..." />
        <CommandList>
          <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>
          {GROUP_ORDER.map((group) => {
            const items = filtered.filter((i) => i.group === group);
            if (items.length === 0) return null;
            const grouped = groupBy(items);
            return (
              <CommandGroup key={group} heading={group}>
                {grouped[group]?.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={item.title}
                    onSelect={() => handleSelect(item.href)}
                  >
                    <item.icon className="mr-2 size-4 text-muted-foreground" />
                    <span>{item.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
