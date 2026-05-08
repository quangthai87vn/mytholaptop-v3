"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  RefreshCw,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  Eye,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

const MOCK_ZNS_TEMPLATES = [
  {
    id: "zns-1",
    name: "Xác nhận đơn hàng",
    templateId: "MTL_ORDER_CONFIRM",
    content: "Cảm ơn quý khách đã đặt hàng tại Mỹ Tho Laptop. Đơn hàng #{order_id} đang được xử lý.",
    status: "active",
    sentCount: 1234,
    deliveredCount: 1210,
    failedCount: 24,
    lastSent: "2026-05-07T10:30:00Z",
  },
  {
    id: "zns-2",
    name: "Giao hàng thành công",
    templateId: "MTL_DELIVERY_SUCCESS",
    content: "Đơn hàng #{order_id} đã được giao thành công. Cảm ơn quý khách đã tin tưởng Mỹ Tho Laptop!",
    status: "active",
    sentCount: 567,
    deliveredCount: 560,
    failedCount: 7,
    lastSent: "2026-05-06T16:45:00Z",
  },
  {
    id: "zns-3",
    name: "Nhắc thanh toán",
    templateId: "MTL_PAYMENT_REMINDER",
    content: "Đơn hàng #{order_id} chưa thanh toán. Vui lòng thanh toán trong 24 giờ để chúng tôi giao hàng kịp thời.",
    status: "draft",
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    lastSent: null,
  },
  {
    id: "zns-4",
    name: "Chăm sóc sau mua",
    templateId: "MTL_FOLLOWUP",
    content: "Cảm ơn quý khách đã mua sản phẩm tại Mỹ Tho Laptop. Chúng tôi luôn sẵn sàng hỗ trợ 24/7.",
    status: "active",
    sentCount: 89,
    deliveredCount: 88,
    failedCount: 1,
    lastSent: "2026-05-05T14:20:00Z",
  },
];

const MOCK_ZNS_LOGS = [
  {
    id: "log-1",
    phone: "0901 234 567",
    templateName: "Xác nhận đơn hàng",
    orderId: "MTL-001234",
    status: "delivered",
    sentAt: "2026-05-07T10:30:00Z",
    deliveredAt: "2026-05-07T10:30:15Z",
  },
  {
    id: "log-2",
    phone: "0912 345 678",
    templateName: "Giao hàng thành công",
    orderId: "MTL-001233",
    status: "delivered",
    sentAt: "2026-05-06T16:45:00Z",
    deliveredAt: "2026-05-06T16:45:22Z",
  },
  {
    id: "log-3",
    phone: "0934 567 890",
    templateName: "Xác nhận đơn hàng",
    orderId: "MTL-001232",
    status: "failed",
    sentAt: "2026-05-06T12:15:00Z",
    deliveredAt: null,
    error: "Số điện thoại không tồn tại",
  },
  {
    id: "log-4",
    phone: "0945 678 901",
    templateName: "Chăm sóc sau mua",
    orderId: null,
    status: "delivered",
    sentAt: "2026-05-05T14:20:00Z",
    deliveredAt: "2026-05-05T14:20:08Z",
  },
];

const STATUS_CONFIG = {
  active: { label: "Hoạt động", variant: "success" as const, icon: CheckCircle },
  draft: { label: "Nháp", variant: "secondary" as const, icon: Clock },
  paused: { label: "Tạm dừng", variant: "warning" as const, icon: Clock },
};

const LOG_STATUS_CONFIG = {
  delivered: { label: "Đã gửi", variant: "success" as const, icon: CheckCircle },
  pending: { label: "Đang gửi", variant: "warning" as const, icon: Clock },
  failed: { label: "Thất bại", variant: "destructive" as const, icon: XCircle },
};

export default function ZNSPage() {
  const [activeTab, setActiveTab] = useState<"templates" | "logs">("templates");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    templateId: "",
    content: "",
  });

  const filteredTemplates = MOCK_ZNS_TEMPLATES.filter((t) => {
    return (
      search === "" ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.templateId.toLowerCase().includes(search.toLowerCase())
    );
  });

  const filteredLogs = MOCK_ZNS_LOGS.filter((log) => {
    return (
      search === "" ||
      log.phone.includes(search) ||
      log.orderId?.toLowerCase().includes(search.toLowerCase()) ||
      log.templateName.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleCreate = () => {
    toast.success("Đã tạo mẫu ZNS");
    setCreateOpen(false);
    setFormData({ name: "", templateId: "", content: "" });
  };

  const totalSent = MOCK_ZNS_TEMPLATES.reduce((sum, t) => sum + t.sentCount, 0);
  const totalDelivered = MOCK_ZNS_TEMPLATES.reduce((sum, t) => sum + t.deliveredCount, 0);
  const totalFailed = MOCK_ZNS_TEMPLATES.reduce((sum, t) => sum + t.failedCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ZNS Messages</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gửi tin nhắn Zalo Notification Service đến khách hàng
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Tạo mẫu ZNS
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng đã gửi</p>
                <p className="text-2xl font-bold mt-1">{totalSent.toLocaleString()}</p>
              </div>
              <Send className="size-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Thành công</p>
                <p className="text-2xl font-bold mt-1 text-green-600">
                  {totalDelivered.toLocaleString()}
                </p>
              </div>
              <CheckCircle className="size-8 text-green-600/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Thất bại</p>
                <p className="text-2xl font-bold mt-1 text-red-600">
                  {totalFailed.toLocaleString()}
                </p>
              </div>
              <XCircle className="size-8 text-red-600/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tỷ lệ thành công</p>
                <p className="text-2xl font-bold mt-1 text-green-600">
                  {totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <BarChart3 className="size-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab("templates")}
          className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "templates"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Mẫu ZNS ({MOCK_ZNS_TEMPLATES.length})
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "logs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Lịch sử gửi ({MOCK_ZNS_LOGS.length})
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={
                  activeTab === "templates"
                    ? "Tìm theo tên, mã mẫu..."
                    : "Tìm theo số điện thoại, mã đơn..."
                }
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeTab === "templates" ? (
        /* Templates Table */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mẫu ZNS</TableHead>
                  <TableHead>Mã mẫu</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Đã gửi</TableHead>
                  <TableHead className="text-right">Thành công</TableHead>
                  <TableHead className="text-right">Thất bại</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => {
                  const statusConfig =
                    STATUS_CONFIG[template.status as keyof typeof STATUS_CONFIG] ||
                    STATUS_CONFIG.draft;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{template.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                            {template.content}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {template.templateId}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant} className="gap-1">
                          <StatusIcon className="size-3" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {template.sentCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">
                        {template.deliveredCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-semibold">
                        {template.failedCount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="size-8">
                          <Eye className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Logs Table */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Số điện thoại</TableHead>
                  <TableHead>Mẫu tin</TableHead>
                  <TableHead>Mã đơn hàng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thời gian gửi</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const statusConfig =
                    LOG_STATUS_CONFIG[log.status as keyof typeof LOG_STATUS_CONFIG] ||
                    LOG_STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono">{log.phone}</TableCell>
                      <TableCell>{log.templateName}</TableCell>
                      <TableCell>
                        {log.orderId ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {log.orderId}
                          </code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant} className="gap-1">
                          <StatusIcon className="size-3" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(log.sentAt)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="size-8">
                          <Eye className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tạo mẫu ZNS</DialogTitle>
            <DialogDescription>
              Tạo mẫu tin nhắn Zalo Notification Service mới
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên mẫu</label>
              <Input
                placeholder="VD: Xác nhận đơn hàng"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mã mẫu ZNS</label>
              <Input
                placeholder="VD: MTL_ORDER_CONFIRM"
                value={formData.templateId}
                onChange={(e) =>
                  setFormData({ ...formData, templateId: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nội dung tin nhắn</label>
              <textarea
                className="w-full min-h-[120px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                placeholder="Nội dung tin nhắn ZNS..."
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Sử dụng {"{order_id}"} để chèn mã đơn hàng tự động
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreate}>Tạo mẫu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
