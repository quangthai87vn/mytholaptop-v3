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
  Plus,
  MessageSquare,
  Play,
  Pencil,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

const MOCK_CARE_SCENARIOS = [
  {
    id: "care-1",
    name: "Chào mừng khách mới",
    description: "Gửi tin nhắn chào mừng khi khách đăng ký tài khoản",
    trigger: "customer.registered",
    channel: "zalo",
    status: "active",
    sentCount: 1234,
    lastRun: "2026-05-07T10:00:00Z",
    successRate: 98.5,
  },
  {
    id: "care-2",
    name: "Chăm sóc sau mua hàng",
    description: "Gửi tin cảm ơn và hướng dẫn sử dụng sau khi đặt hàng thành công",
    trigger: "order.completed",
    channel: "zalo",
    status: "active",
    sentCount: 567,
    lastRun: "2026-05-07T09:30:00Z",
    successRate: 97.2,
  },
  {
    id: "care-3",
    name: "Nhắc bảo hành sắp hết",
    description: "Thông báo cho khách khi bảo hành sắp hết hạn (7 ngày trước)",
    trigger: "warranty.expiring",
    channel: "zalo",
    status: "active",
    sentCount: 89,
    lastRun: "2026-05-06T08:00:00Z",
    successRate: 95.1,
  },
  {
    id: "care-4",
    name: "Khách hàng không hoạt động",
    description: "Gửi ưu đãi đặc biệt cho khách hàng không mua hàng 60 ngày",
    trigger: "customer.inactive",
    channel: "email",
    status: "draft",
    sentCount: 0,
    lastRun: null,
    successRate: 0,
  },
  {
    id: "care-5",
    name: "Sinh nhật khách hàng",
    description: "Gửi voucher giảm giá 10% vào ngày sinh nhật khách hàng",
    trigger: "customer.birthday",
    channel: "zalo",
    status: "active",
    sentCount: 45,
    lastRun: "2026-05-01T00:00:00Z",
    successRate: 99.1,
  },
];

const STATUS_CONFIG = {
  active: { label: "Hoạt động", variant: "success" as const, icon: CheckCircle },
  draft: { label: "Nháp", variant: "secondary" as const, icon: Clock },
  paused: { label: "Tạm dừng", variant: "warning" as const, icon: Clock },
};

const CHANNEL_CONFIG = {
  zalo: { label: "Zalo", color: "text-blue-600" },
  email: { label: "Email", color: "text-gray-600" },
  sms: { label: "SMS", color: "text-green-600" },
};

export default function CareScenariosPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editScenario, setEditScenario] = useState<typeof MOCK_CARE_SCENARIOS[0] | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger: "",
    channel: "zalo",
  });

  const filteredScenarios = MOCK_CARE_SCENARIOS.filter((scenario) => {
    const matchSearch =
      search === "" ||
      scenario.name.toLowerCase().includes(search.toLowerCase()) ||
      scenario.description.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "all" || scenario.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const handleCreate = () => {
    toast.success("Đã tạo kịch bản chăm sóc");
    setCreateOpen(false);
    setFormData({ name: "", description: "", trigger: "", channel: "zalo" });
  };

  const handleToggleStatus = (scenario: typeof MOCK_CARE_SCENARIOS[0]) => {
    const newStatus = scenario.status === "active" ? "paused" : "active";
    toast.success(`Đã ${newStatus === "active" ? "bật" : "tắt"} kịch bản`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kịch bản chăm sóc khách</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tự động gửi tin nhắn, email chăm sóc khách hàng
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Tạo kịch bản
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng kịch bản</p>
                <p className="text-2xl font-bold mt-1">
                  {MOCK_CARE_SCENARIOS.length}
                </p>
              </div>
              <MessageSquare className="size-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                <p className="text-2xl font-bold mt-1 text-green-600">
                  {MOCK_CARE_SCENARIOS.filter((s) => s.status === "active").length}
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
                <p className="text-sm text-muted-foreground">Tổng tin đã gửi</p>
                <p className="text-2xl font-bold mt-1">
                  {MOCK_CARE_SCENARIOS.reduce((sum, s) => sum + s.sentCount, 0)}
                </p>
              </div>
              <Play className="size-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tỷ lệ thành công</p>
                <p className="text-2xl font-bold mt-1 text-green-600">
                  {(
                    MOCK_CARE_SCENARIOS.reduce((sum, s) => sum + s.successRate, 0) /
                    MOCK_CARE_SCENARIOS.length
                  ).toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="size-8 text-green-600/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kịch bản..."
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
              <option value="active">Hoạt động</option>
              <option value="draft">Nháp</option>
              <option value="paused">Tạm dừng</option>
            </select>
            <Button variant="outline" size="icon">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scenarios Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kịch bản</TableHead>
                <TableHead>Kênh</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Đã gửi</TableHead>
                <TableHead className="text-right">Thành công</TableHead>
                <TableHead className="w-[140px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredScenarios.map((scenario) => {
                const statusConfig = STATUS_CONFIG[scenario.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
                const StatusIcon = statusConfig.icon;
                const channelConfig = CHANNEL_CONFIG[scenario.channel as keyof typeof CHANNEL_CONFIG] || CHANNEL_CONFIG.zalo;

                return (
                  <TableRow key={scenario.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{scenario.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">
                          {scenario.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={channelConfig.color}
                      >
                        {channelConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusConfig.variant}
                        className="gap-1"
                      >
                        <StatusIcon className="size-3" />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {scenario.sentCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {scenario.successRate > 0 ? (
                        <span className="text-green-600 font-semibold">
                          {scenario.successRate}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleToggleStatus(scenario)}
                          title={scenario.status === "active" ? "Tạm dừng" : "Bật"}
                        >
                          {scenario.status === "active" ? (
                            <XCircle className="size-3.5" />
                          ) : (
                            <Play className="size-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setEditScenario(scenario)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo kịch bản chăm sóc</DialogTitle>
            <DialogDescription>
              Thiết lập kịch bản tự động chăm sóc khách hàng
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên kịch bản</label>
              <Input
                placeholder="VD: Chăm sóc sau mua hàng"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mô tả</label>
              <Input
                placeholder="Mô tả ngắn"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kênh gửi</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={formData.channel}
                onChange={(e) =>
                  setFormData({ ...formData, channel: e.target.value })
                }
              >
                <option value="zalo">Zalo</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreate}>Tạo kịch bản</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editScenario} onOpenChange={() => setEditScenario(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa kịch bản</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin kịch bản chăm sóc khách hàng
            </DialogDescription>
          </DialogHeader>
          {editScenario && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tên kịch bản</label>
                <Input defaultValue={editScenario.name} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mô tả</label>
                <Input defaultValue={editScenario.description} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditScenario(null)}>
              Hủy
            </Button>
            <Button onClick={() => {
              toast.success("Đã cập nhật kịch bản");
              setEditScenario(null);
            }}>
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
