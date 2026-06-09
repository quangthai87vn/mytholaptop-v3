"use client";

/**
 * Team page — workspace team management hub
 * P8.1: Replaces /staff and /interns as the canonical team page
 */
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  GraduationCap,
  Shield,
  Settings,
  ArrowRight,
  CheckSquare,
} from "lucide-react";

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Quản lý nhân sự, thực tập sinh và phân quyền
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-5 text-primary" />
              Thành viên
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Quản lý nhân viên, thông tin liên hệ và vai trò
            </p>
            <Button variant="outline" size="sm" asChild className="w-full gap-1.5">
              <Link href="/staff">
                Quản lý <ArrowRight className="size-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="size-5 text-primary" />
              Thực tập sinh
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              KPI, weekly performance và rankings thực tập sinh
            </p>
            <Button variant="outline" size="sm" asChild className="w-full gap-1.5">
              <Link href="/team/interns">
                Xem Interns <ArrowRight className="size-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="size-5 text-primary" />
              Phân quyền
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Vai trò và phân quyền cho nhóm
            </p>
            <Button variant="outline" size="sm" asChild className="w-full gap-1.5">
              <Link href="/staff/roles">
                Cài đặt <ArrowRight className="size-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" asChild className="gap-1.5">
          <Link href="/tasks">
            <CheckSquare className="size-4" />
            Xem công việc team
          </Link>
        </Button>
        <Button variant="outline" asChild className="gap-1.5">
          <Link href="/reports">
            <ArrowRight className="size-4" />
            Xem Reports
          </Link>
        </Button>
      </div>
    </div>
  );
}
