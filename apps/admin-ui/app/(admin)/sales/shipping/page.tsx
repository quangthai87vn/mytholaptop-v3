"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  RefreshCw,
  Eye,
  Truck,
  MapPin,
  CheckCircle,
  Clock,
  XCircle,
  Package,
} from "lucide-react";
import { MOCK_SHIPMENTS } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount);
}

const PARTNER_CONFIG: Record<string, { label: string; color: string }> = {
  ghn: { label: "GHN", color: "text-red-600" },
  ghtk: { label: "GHTK", color: "text-orange-600" },
  viettel: { label: "Viettel Post", color: "text-red-700" },
  vnpost: { label: "VNPost", color: "text-green-600" },
  grab: { label: "GrabExpress", color: "text-green-500" },
  aha: { label: "AhaMove", color: "text-blue-500" },
};

const STATUS_CONFIG: Record<string, any> = {
  not_shipped: { label: "Chưa giao", variant: "secondary", icon: Package },
  picking: { label: "Đang lấy hàng", variant: "warning", icon: Clock },
  shipped: { label: "Đã giao cho ĐVVC", variant: "default", icon: Truck },
  in_transit: { label: "Đang vận chuyển", variant: "default", icon: Truck },
  delivered: { label: "Đã giao", variant: "success", icon: CheckCircle },
  failed: { label: "Giao thất bại", variant: "destructive", icon: XCircle },
  returned: { label: "Hoàn về", variant: "secondary", icon: Package },
};

export default function ShippingPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [partnerFilter, setPartnerFilter] = useState("all");

  const filteredShipments = MOCK_SHIPMENTS.filter((ship) => {
    const matchSearch =
      search === "" ||
      ship.orderCode.toLowerCase().includes(search.toLowerCase()) ||
      ship.customerName.toLowerCase().includes(search.toLowerCase()) ||
      ship.trackingCode.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === "all" || ship.status === statusFilter;
    const matchPartner = partnerFilter === "all" || ship.partner === partnerFilter;

    return matchSearch && matchStatus && matchPartner;
  });

  const getAddress = (addr: (typeof MOCK_SHIPMENTS)[0]["shippingAddress"]) => {
    return `${addr.street}, ${addr.ward}, ${addr.district}, ${addr.city}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Giao hàng</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Quản lý vận đơn và theo dõi giao hàng
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: "picking", label: "Đang lấy", color: "text-yellow-600" },
          { key: "in_transit", label: "Đang vận chuyển", color: "text-blue-600" },
          { key: "delivered", label: "Đã giao", color: "text-green-600" },
          { key: "failed", label: "Giao thất bại", color: "text-red-600" },
        ].map((item) => {
          const count = filteredShipments.filter((s) => s.status === item.key).length;
          return (
            <Card key={item.key}>
              <CardContent className="pt-6 text-center">
                <p className={`text-2xl font-bold ${item.color}`}>{count}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã đơn, mã vận đơn, khách hàng..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="not_shipped">Chưa giao</option>
              <option value="picking">Đang lấy</option>
              <option value="in_transit">Đang vận chuyển</option>
              <option value="delivered">Đã giao</option>
              <option value="failed">Giao thất bại</option>
            </select>
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.value)}
            >
              <option value="all">Tất cả ĐVVC</option>
              <option value="ghn">GHN</option>
              <option value="ghtk">GHTK</option>
              <option value="viettel">Viettel Post</option>
              <option value="vnpost">VNPost</option>
            </select>
            <Button variant="outline" size="icon">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã vận đơn</TableHead>
                  <TableHead>Mã đơn</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Địa chỉ</TableHead>
                  <TableHead>ĐVVC</TableHead>
                  <TableHead>Phí ship</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      Không tìm thấy vận đơn nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShipments.map((ship) => {
                    const partnerConfig = PARTNER_CONFIG[ship.partner] || PARTNER_CONFIG.ghn;
                    const statusConfig =
                      STATUS_CONFIG[ship.status] || STATUS_CONFIG.not_shipped;
                    const StatusIcon = statusConfig.icon;

                    return (
                      <TableRow key={ship.id}>
                        <TableCell>
                          <span className="font-mono text-xs font-medium">
                            {ship.trackingCode}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm font-medium">
                            {ship.orderCode}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{ship.customerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {ship.customerPhone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-1 max-w-[200px]">
                            <MapPin className="size-3 shrink-0 mt-0.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground line-clamp-2">
                              {getAddress(ship.shippingAddress)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm font-medium ${partnerConfig.color}`}>
                            {partnerConfig.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {ship.fee === 0 ? (
                            <span className="text-green-600 font-medium">Miễn phí</span>
                          ) : (
                            formatCurrency(ship.fee)
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant} className="gap-1">
                            <StatusIcon className="size-3" />
                            {statusConfig.label}
                          </Badge>
                          {ship.estimatedDelivery && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Dự kiến: {ship.estimatedDelivery}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="size-8">
                            <Eye className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
