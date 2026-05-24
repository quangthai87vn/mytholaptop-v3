import {
  LayoutDashboard,
  RefreshCw,
  Package,
  FolderTree,
  Tags,
  Building2,
  Settings2,
  Layers,
  Warehouse,
  ArrowLeftRight,
  Receipt,
  Users,
  Shield,
  Settings,
  Laptop,
  UserRound,
  UserRoundCog,
  ShoppingCart,
  ShieldCheck,
  MessageSquare,
  Zap,
  BarChart3,
  Activity,
  FileText,
  Sparkles,
  Facebook,
  Globe,
  Video,
  ImageIcon,
  Calendar,
  Library,
  FileCode,
  Brain,
  ShoppingBag,
  CreditCard,
  Truck,
  RotateCcw,
  Tag,
  FileText as FileTextIcon,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href?: string;
  icon: LucideIcon;
  children?: NavItem[];
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Nội dung",
    href: "/content",
    icon: FileText,
    children: [
      {
        title: "Tổng quan nội dung",
        href: "/content",
        icon: LayoutDashboard,
      },
      {
        title: "Tạo bài viết AI",
        href: "/content/ai-generator",
        icon: Sparkles,
      },
      {
        title: "Bài viết Facebook",
        href: "/content/facebook-posts",
        icon: Facebook,
      },
      {
        title: "Bài viết Website",
        href: "/content/website-posts",
        icon: Globe,
      },
      {
        title: "Kịch bản video",
        href: "/content/video-scripts",
        icon: Video,
      },
      {
        title: "Prompt hình ảnh",
        href: "/content/image-prompts",
        icon: ImageIcon,
      },
      {
        title: "Lịch đăng bài",
        href: "/content/calendar",
        icon: Calendar,
      },
      {
        title: "Thư viện nội dung",
        href: "/content/library",
        icon: Library,
      },
      {
        title: "Mẫu nội dung",
        href: "/content/templates",
        icon: FileCode,
      },
      {
        title: "Cấu hình AI",
        href: "/content/settings",
        icon: Brain,
      },
      {
        title: "AI Playground",
        href: "/content/ai-playground",
        icon: Zap,
      },
    ],
  },
  {
    title: "Hàng hoá",
    href: "/products",
    icon: Package,
    children: [
      {
        title: "Sản phẩm",
        href: "/products",
        icon: Package,
      },
      {
        title: "Danh mục",
        href: "/products/categories",
        icon: FolderTree,
      },
      {
        title: "Thẻ",
        href: "/products/tags",
        icon: Tags,
      },
      {
        title: "Thương hiệu",
        href: "/products/brands",
        icon: Building2,
      },
      {
        title: "Thuộc tính",
        href: "/products/attributes",
        icon: Settings2,
      },
      {
        title: "Biến thể",
        href: "/products/variants",
        icon: Layers,
      },
      {
        title: "Kho hàng",
        href: "/products/inventory",
        icon: Warehouse,
      },
      {
        title: "Đồng bộ",
        href: "/products/sync",
        icon: ArrowLeftRight,
      },
    ],
  },
  {
    title: "Bán hàng",
    href: "/sales",
    icon: ShoppingBag,
    children: [
      {
        title: "Tổng quan bán hàng",
        href: "/sales",
        icon: LayoutDashboard,
      },
      {
        title: "Đơn hàng",
        href: "/sales/orders",
        icon: Receipt,
      },
      {
        title: "Tạo đơn hàng (POS)",
        href: "/sales/pos",
        icon: ShoppingBag,
      },
      {
        title: "Thanh toán",
        href: "/sales/payments",
        icon: CreditCard,
      },
      {
        title: "Giao hàng",
        href: "/sales/shipping",
        icon: Truck,
      },
      {
        title: "Trả hàng & hoàn tiền",
        href: "/sales/refunds",
        icon: RotateCcw,
      },
      {
        title: "Giỏ hàng đang dở",
        href: "/sales/carts",
        icon: ShoppingCart,
      },
      {
        title: "Khuyến mãi",
        href: "/sales/promotions",
        icon: Tag,
      },
      {
        title: "Báo giá",
        href: "/sales/quotes",
        icon: FileTextIcon,
      },
      {
        title: "Nhật ký bán hàng",
        href: "/sales/logs",
        icon: ClipboardList,
      },
    ],
  },
  {
    title: "Khách hàng",
    href: "/customers",
    icon: Users,
    children: [
      {
        title: "Danh sách khách hàng",
        href: "/customers",
        icon: Users,
      },
      {
        title: "Nhóm khách hàng",
        href: "/customers/groups",
        icon: UserRoundCog,
      },
      {
        title: "Lịch sử mua hàng",
        href: "/customers/purchase-history",
        icon: ShoppingCart,
      },
      {
        title: "Bảo hành & công nợ",
        href: "/customers/warranty-debt",
        icon: ShieldCheck,
      },
      {
        title: "ZNS & CSKH",
        href: "/customers/zns",
        icon: MessageSquare,
      },
      {
        title: "Kịch bản chăm sóc",
        href: "/customers/care-scenarios",
        icon: Zap,
      },
      {
        title: "Phân khúc khách hàng",
        href: "/customers/segments",
        icon: BarChart3,
      },
      {
        title: "Nhật ký tương tác",
        href: "/customers/activity-log",
        icon: Activity,
      },
    ],
  },
  {
    title: "Quản trị",
    href: "/staff",
    icon: Shield,
    children: [
      {
        title: "Nhân viên",
        href: "/staff",
        icon: Users,
      },
      {
        title: "Vai trò",
        href: "/staff/roles",
        icon: Shield,
      },
      {
        title: "Phân quyền",
        href: "/staff/permissions",
        icon: Settings,
      },
    ],
  },
  {
    title: "Cài đặt",
    href: "/settings",
    icon: Settings,
  },
];

export const NAV_TOP: NavItem[] = [
  {
    title: "Mỹ Tho Laptop",
    href: "/dashboard",
    icon: Laptop,
  },
];

/**
 * Check if current path exactly matches the href.
 */
export function isExactMatch(href: string, pathname: string): boolean {
  if (!href) return false;
  return pathname === href;
}

/**
 * Check if the parent item has an active child route.
 */
export function hasActiveChild(parent: NavItem, pathname: string): boolean {
  if (!parent.children) return false;
  return parent.children.some(
    (child) => isExactMatch(child.href || "", pathname)
  );
}

/**
 * Check if the current path matches any child of the parent
 * OR if the pathname starts with the parent's href prefix.
 * Used to auto-expand parents when a child route is active.
 */
export function isParentRoute(parent: NavItem, pathname: string): boolean {
  if (!parent.children) return false;
  if (!parent.href) return false;
  // Check exact match on the parent href
  if (pathname === parent.href) return true;
  // Check if any child is active
  if (hasActiveChild(parent, pathname)) return true;
  // Auto-expand: if pathname starts with parent href + "/", it's an active child route
  const prefix = parent.href.endsWith("/") ? parent.href : parent.href + "/";
  if (pathname.startsWith(prefix)) return true;
  return false;
}

/**
 * Get the currently active child item from a parent.
 */
export function getActiveChild(parent: NavItem, pathname: string): NavItem | undefined {
  if (!parent.children) return undefined;
  return parent.children.find(
    (child) => isExactMatch(child.href || "", pathname)
  );
}

/**
 * Check if a child item is the active route.
 */
export function isChildActive(child: NavItem, pathname: string): boolean {
  return isExactMatch(child.href || "", pathname);
}
