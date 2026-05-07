/**
 * Notification type definitions for admin layout.
 * The actual NotificationCenter component with state management
 * is inlined in admin-header.tsx to avoid prop drilling.
 */

export interface Notification {
  id: string;
  type: "order" | "stock" | "payment" | "sync" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
  href?: string;
}

export const NOTIFICATIONS: Notification[] = [
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
    title: "Cảnh báo tồn kho",
    message: "MacBook Air M2 13 inch đã hết hàng",
    time: "30 phút trước",
    read: false,
    href: "/products/inventory",
  },
  {
    id: "n-3",
    type: "payment",
    title: "Thanh toán thành công",
    message: "Trần Thị Hoa thanh toán 26.990.000đ",
    time: "1 giờ trước",
    read: false,
    href: "/sales/payments",
  },
  {
    id: "n-4",
    type: "sync",
    title: "Đồng bộ hoàn tất",
    message: "208 sản phẩm đã đồng bộ từ WooCommerce",
    time: "2 giờ trước",
    read: true,
    href: "/products/sync",
  },
  {
    id: "n-5",
    type: "order",
    title: "Đơn hàng giao thành công",
    message: "Đơn #MTL-2026-0506-002 đã giao thành công",
    time: "3 giờ trước",
    read: true,
    href: "/sales/orders",
  },
  {
    id: "n-6",
    type: "stock",
    title: "Sắp hết hàng",
    message: "HP ProBook 440 G9 chỉ còn 3 sản phẩm",
    time: "5 giờ trước",
    read: true,
    href: "/products/inventory",
  },
  {
    id: "n-7",
    type: "system",
    title: "Cập nhật hệ thống",
    message: "Hệ thống sẽ bảo trì vào 23:00 - 01:00",
    time: "Hôm qua",
    read: true,
  },
];
