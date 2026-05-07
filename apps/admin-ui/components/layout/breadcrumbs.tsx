"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const LABEL_MAP: Record<string, string> = {
  dashboard: "Tổng quan",
  content: "Nội dung",
  "content/ai-generator": "Tạo bài viết AI",
  "content/facebook-posts": "Bài viết Facebook",
  "content/website-posts": "Bài viết Website",
  "content/video-scripts": "Kịch bản video",
  "content/image-prompts": "Prompt hình ảnh",
  "content/calendar": "Lịch đăng bài",
  "content/library": "Thư viện nội dung",
  "content/templates": "Mẫu nội dung",
  "content/settings": "Cấu hình AI",
  products: "Sản phẩm",
  "products/categories": "Danh mục",
  "products/tags": "Thẻ",
  "products/brands": "Thương hiệu",
  "products/attributes": "Thuộc tính",
  "products/variants": "Biến thể",
  "products/inventory": "Kho hàng",
  "products/sync": "Đồng bộ",
  sales: "Bán hàng",
  "sales/orders": "Đơn hàng",
  "sales/pos": "Tạo đơn hàng (POS)",
  "sales/payments": "Thanh toán",
  "sales/shipping": "Giao hàng",
  "sales/refunds": "Trả hàng & hoàn tiền",
  "sales/carts": "Giỏ hàng dở dang",
  "sales/promotions": "Khuyến mãi",
  "sales/quotes": "Báo giá",
  "sales/logs": "Nhật ký bán hàng",
  customers: "Khách hàng",
  "customers/groups": "Nhóm khách hàng",
  "customers/purchase-history": "Lịch sử mua hàng",
  "customers/warranty-debt": "Bảo hành & công nợ",
  "customers/zns": "ZNS & CSKH",
  "customers/care-scenarios": "Kịch bản chăm sóc",
  "customers/segments": "Phân khúc khách hàng",
  "customers/activity-log": "Nhật ký tương tác",
  staff: "Nhân viên",
  "staff/roles": "Vai trò",
  "staff/permissions": "Phân quyền",
  settings: "Cài đặt",
  migration: "Di chuyển dữ liệu",
};

function getLabel(segment: string): string {
  if (LABEL_MAP[segment]) return LABEL_MAP[segment];
  if (segment.startsWith("MTL-")) return segment;
  if (/^\d+$/.test(segment)) return `ID: ${segment}`;
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();

  if (!pathname || pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const items: BreadcrumbItem[] = segments.map((seg, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    const label = getLabel(seg);
    return { label, href };
  });

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-sm", className)}>
      <Link
        href="/"
        className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Trang chủ"
      >
        <Home className="size-4" />
      </Link>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={item.href} className="flex items-center gap-1">
            <ChevronRight className="size-3 text-muted-foreground/50" />
            {isLast || !item.href ? (
              <span className="font-medium text-foreground truncate max-w-[200px]">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
