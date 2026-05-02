import {
  LayoutDashboard,
  ArrowLeftRight,
  Package,
  FolderTree,
  Tags,
  Receipt,
  Users,
  UserCog,
  Settings,
  Laptop,
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
    title: "Migration WordPress",
    href: "/migration",
    icon: ArrowLeftRight,
  },
  {
    title: "Sản phẩm",
    href: "/products",
    icon: Package,
    children: [
      {
        title: "Quản lý sản phẩm",
        href: "/products",
        icon: Package,
      },
      {
        title: "Quản lý danh mục",
        href: "/products/categories",
        icon: FolderTree,
      },
      {
        title: "Quản lý thẻ",
        href: "/products/tags",
        icon: Tags,
      },
    ],
  },
  {
    title: "Hoá đơn bán hàng",
    href: "/orders",
    icon: Receipt,
  },
  {
    title: "Khách hàng",
    href: "/customers",
    icon: Users,
  },
  {
    title: "Nhân viên & Phân quyền",
    href: "/staff",
    icon: UserCog,
    children: [
      {
        title: "Quản lý nhân viên",
        href: "/staff",
        icon: Users,
      },
      {
        title: "Vai trò",
        href: "/staff/roles",
        icon: UserCog,
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

export function isActivePath(href: string, pathname: string): boolean {
  if (href === "/dashboard" && pathname === "/") {
    return true;
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function isParentActive(parent: NavItem, pathname: string): boolean {
  if (parent.children) {
    return parent.children.some(
      (child) => isActivePath(child.href || "", pathname)
    );
  }
  return false;
}

export function isChildActive(child: NavItem, pathname: string): boolean {
  return isActivePath(child.href || "", pathname);
}

export function getActiveChild(parent: NavItem, pathname: string): NavItem | undefined {
  if (!parent.children) return undefined;
  return parent.children.find((child) => isActivePath(child.href || "", pathname));
}
