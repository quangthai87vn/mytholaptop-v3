import {
  LayoutDashboard,
  FolderKanban,
  Target,
  Clapperboard,
  CheckSquare,
  ImageIcon,
  Calendar,
  Users,
  BarChart3,
  Settings,
  Brain,
  Bell,
  HardDrive,
  ShoppingBag,
  Package,
  Users as UsersIcon,
  RefreshCw,
  Sparkles,
  MessageSquare,
  Shield,
  FolderTree,
  Tag,
  Building2,
  Layers,
  Warehouse,
  ArrowLeftRight,
  Receipt,
  UserRoundCog,
  ShieldCheck,
  Activity,
  FileText,
  Laptop,
  CreditCard,
  Truck,
  RotateCcw,
  ShoppingCart,
  ClipboardList,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href?: string;
  icon: LucideIcon;
  children?: NavItem[];
  badge?: string;
  /** If set, the item is only shown to users with this permission (or super_admin). */
  requiredPermission?: string;
}

export const NAV_ITEMS: NavItem[] = [
  // ── WORKSPACE SECTION ──────────────────────────────────────────────────────────
  // Entry point: Dashboard — accessible to any authenticated user
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  // Workspace management — shown if user has any workspace permission
  {
    title: "Workspace",
    href: "/workspace",
    icon: FolderKanban,
    children: [
      {
        title: "Tổng quan",
        href: "/workspace",
        icon: LayoutDashboard,
      },
      {
        title: "Dự án",
        href: "/projects",
        icon: Target,
        requiredPermission: "projects.read",
      },
      {
        title: "Chiến dịch",
        href: "/campaigns",
        icon: Clapperboard,
        requiredPermission: "campaigns.read",
      },
      {
        title: "Công việc",
        href: "/tasks",
        icon: CheckSquare,
        requiredPermission: "tasks.read",
      },
      {
        title: "Calendar",
        href: "/calendar",
        icon: Calendar,
        requiredPermission: "tasks.read",
      },
      {
        title: "Danh mục",
        href: "/workspace/master-data",
        icon: Tag,
        requiredPermission: "projects.read",
      },
      {
        title: "Hoạt động",
        href: "/workspace/activity",
        icon: Activity,
        requiredPermission: "tasks.read",
      },
    ],
  },

  // ── PRODUCTS SECTION ──────────────────────────────────────────────────────────
  {
    title: "Hàng hoá",
    href: "/products",
    icon: Package,
    requiredPermission: "products.read",
    children: [
      {
        title: "Sản phẩm",
        href: "/products",
        icon: Package,
      },
      {
        title: "Danh mục",
        href: "/products/categories",
        icon: FolderKanban,
      },
      {
        title: "Thẻ",
        href: "/products/tags",
        icon: Tag,
      },
      {
        title: "Thương hiệu",
        href: "/products/brands",
        icon: Building2,
      },
      {
        title: "Thuộc tính",
        href: "/products/attributes",
        icon: Settings,
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

  // ── SALES SECTION ──────────────────────────────────────────────────────────────
  {
    title: "Bán hàng",
    href: "/sales",
    icon: ShoppingBag,
    requiredPermission: "sales.read",
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
        title: "POS",
        href: "/sales/pos",
        icon: ShoppingCart,
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
        icon: FileText,
      },
      {
        title: "Nhật ký bán hàng",
        href: "/sales/logs",
        icon: ClipboardList,
      },
    ],
  },

  // ── CUSTOMERS SECTION ─────────────────────────────────────────────────────────
  {
    title: "Khách hàng",
    href: "/customers",
    icon: UsersIcon,
    requiredPermission: "customers.read",
    children: [
      {
        title: "Danh sách khách hàng",
        href: "/customers",
        icon: UsersIcon,
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
        icon: Sparkles,
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

  // ── SETTINGS SECTION ──────────────────────────────────────────────────────────
  // Only super_admin can see and access Settings
  {
    title: "Cài đặt",
    href: "/settings/app",
    icon: Settings,
    requiredPermission: "settings.manage",
    children: [
      {
        title: "Cấu hình ứng dụng",
        href: "/settings/app",
        icon: Settings,
        requiredPermission: "settings.manage",
      },
      {
        title: "Cấu hình AI",
        href: "/settings/ai",
        icon: Brain,
        requiredPermission: "ai_engine.manage",
      },
      {
        title: "Người dùng",
        href: "/settings/users",
        icon: UsersIcon,
        requiredPermission: "users.read",
      },
      {
        title: "Hoạt động",
        href: "/settings/activity",
        icon: Activity,
        requiredPermission: "settings.manage",
      },
    ],
  },
];

// ── Legacy navigation items (soft-deprecated — kept for compatibility mapping)
// These items are no longer shown in the sidebar but remain as reference.
export const DEPRECATED_NAV_ITEMS = {
  NOI_DUNG: ["/content","/content/ai-generator","/content/facebook-posts","/content/website-posts","/content/video-scripts","/content/image-prompts","/content/calendar","/content/library","/content/templates","/content/media-prompts","/content/settings"],
  AI_STUDIO: ["/content/settings","/content/ai-playground"],
  QUAN_LY_DU_AN: ["/workspace","/workspace/activity","/workspace/calendar"],
  STANDALONE: ["/staff","/staff/roles","/staff/permissions","/interns","/notifications","/migration"],
};

export const NAV_TOP: NavItem[] = [
  { title: "Mỹ Tho Laptop", href: "/dashboard", icon: Laptop },
];

// ── Route Redirect Map (old → new)
export const ROUTE_REDIRECTS: Record<string, string> = {
  "/content": "/content",
  "/content/ai-generator": "/content",
  "/content/facebook-posts": "/content",
  "/content/website-posts": "/content",
  "/content/video-scripts": "/content",
  "/content/image-prompts": "/content",
  "/content/media-prompts": "/media-workflow",
  "/content/calendar": "/calendar",
  "/content/library": "/content",
  "/content/templates": "/content",
  "/content/settings": "/settings/ai",
  "/interns": "/team/interns",
  "/staff": "/settings/users",
  "/staff/roles": "/settings/users?tab=roles",
  "/staff/permissions": "/settings/users?tab=permissions",
  "/settings/team": "/settings/users",
  // Legacy /settings redirect to /settings/app
  "/settings": "/settings/app",
  // Legacy /team redirect to /workspace/members
  "/team": "/workspace/members",
};

// ── Legacy child redirects
export const LEGACY_CHILD_REDIRECTS: Record<string, string> = {
  "/projects": "/projects",
  "/campaigns": "/campaigns",
  "/tasks": "/tasks",
  "/media-workflow": "/media-workflow",
};

// ── Helpers ─────────────────────────────────────────────────────────────────────

export function isExactMatch(href: string, pathname: string): boolean {
  if (!href) return false;
  return pathname === href;
}

export function hasActiveChild(parent: NavItem, pathname: string): boolean {
  if (!parent.children) return false;
  return parent.children.some((child) => isExactMatch(child.href || "", pathname));
}

export function isParentRoute(parent: NavItem, pathname: string): boolean {
  if (!parent.children) return false;
  if (!parent.href) return false;
  if (pathname === parent.href) return true;
  if (hasActiveChild(parent, pathname)) return true;
  const prefix = parent.href.endsWith("/") ? parent.href : parent.href + "/";
  if (pathname.startsWith(prefix)) return true;
  return false;
}

export function getActiveChild(parent: NavItem, pathname: string): NavItem | undefined {
  if (!parent.children) return undefined;
  return parent.children.find((child) => isExactMatch(child.href || "", pathname));
}

export function isChildActive(child: NavItem, pathname: string): boolean {
  return isExactMatch(child.href || "", pathname);
}

/**
 * Resolve redirect for a given pathname.
 * Returns the new target path, or null if no redirect needed.
 */
export function resolveRedirect(pathname: string): string | null {
  // Exact match redirects
  if (ROUTE_REDIRECTS[pathname]) return ROUTE_REDIRECTS[pathname];
  // Child redirect overrides (check longest prefix first)
  const sorted = Object.keys(LEGACY_CHILD_REDIRECTS).sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    if (pathname.startsWith(key + "/")) return LEGACY_CHILD_REDIRECTS[key];
  }
  return null;
}
