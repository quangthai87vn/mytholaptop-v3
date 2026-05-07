"use client";

import { useRouter } from "next/navigation";
import {
  Plus,
  Package,
  Receipt,
  Users,
  FileText,
  Sparkles,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Sản phẩm mới",
    href: "/products/new",
    icon: Package,
    description: "Thêm sản phẩm vào danh mục",
  },
  {
    label: "Đơn hàng mới",
    href: "/sales/pos",
    icon: ShoppingBag,
    description: "Tạo đơn hàng POS",
  },
  {
    label: "Báo giá",
    href: "/sales/quotes",
    icon: Receipt,
    description: "Tạo báo giá cho khách",
  },
  {
    label: "Khách hàng mới",
    href: "/customers",
    icon: Users,
    description: "Thêm khách hàng vào hệ thống",
  },
  {
    label: "Bài viết AI",
    href: "/content/ai-generator",
    icon: Sparkles,
    description: "Tạo nội dung bằng AI",
  },
  {
    label: "Bài viết",
    href: "/content/facebook-posts",
    icon: FileText,
    description: "Viết bài cho website",
  },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-9 gap-1.5">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Tạo nhanh</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Chọn hành động
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {QUICK_ACTIONS.map((action) => (
          <DropdownMenuItem
            key={action.href}
            className="flex items-start gap-3 py-3 cursor-pointer"
            onClick={() => router.push(action.href)}
          >
            <action.icon className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{action.label}</span>
              {action.description && (
                <span className="text-xs text-muted-foreground">
                  {action.description}
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
