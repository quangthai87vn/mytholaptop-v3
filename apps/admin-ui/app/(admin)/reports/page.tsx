"use client";

/**
 * Reports page — workspace reporting hub
 * P8.1: New page under workspace-centric architecture
 */
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  CheckSquare,
  FileText,
  Clapperboard,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Báo cáo và thống kê workspace
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="size-5 text-primary" />
              Task Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              KPI tasks, completion rate, deadline performance
            </p>
            <Button variant="outline" size="sm" asChild className="w-full gap-1.5">
              <Link href="/tasks">
                Xem Tasks <ArrowRight className="size-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-5 text-primary" />
              Content Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Nội dung đã tạo, token usage, publish stats
            </p>
            <Button variant="outline" size="sm" asChild className="w-full gap-1.5">
              <Link href="/content">
                Xem Content <ArrowRight className="size-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clapperboard className="size-5 text-primary" />
              Campaign Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Campaign performance, channels, engagement
            </p>
            <Button variant="outline" size="sm" asChild className="w-full gap-1.5">
              <Link href="/campaigns">
                Xem Campaigns <ArrowRight className="size-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-5 text-primary" />
              KPI Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Intern KPIs, rankings, weekly performance
            </p>
            <Button variant="outline" size="sm" asChild className="w-full gap-1.5">
              <Link href="/interns/ranking">
                Xem KPI <ArrowRight className="size-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-5 text-primary" />
              Sales Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Đơn hàng, doanh thu, khuyến mãi
            </p>
            <Button variant="outline" size="sm" asChild className="w-full gap-1.5">
              <Link href="/sales">
                Xem Sales <ArrowRight className="size-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
