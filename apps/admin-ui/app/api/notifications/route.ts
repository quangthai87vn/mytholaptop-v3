import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import {
  getNotifications,
  getNotificationCount,
  markNotificationsRead,
  markAllNotificationsRead,
} from "@/lib/workspace/db";
import type { NotificationFilters } from "@/lib/workspace/types-notification";

export const dynamic = "force-dynamic";

// GET /api/notifications — list notifications
export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const sessionUser = (req as NextRequest & { _authUser?: { id: string; name: string; role: string } })._authUser;

  try {
    const { searchParams } = req.nextUrl;

    const filters: NotificationFilters = {
      types: searchParams.get("types")?.split(",").filter(Boolean) as NotificationFilters["types"],
      isRead: searchParams.get("isRead") === "true" ? true : searchParams.get("isRead") === "false" ? false : undefined,
      since: searchParams.get("since") || undefined,
    };

    const limit = Math.max(1, Math.min(parseInt(searchParams.get("limit") ?? "50"), 100));
    const page = parseInt(searchParams.get("page") ?? "1");
    const offset = (page - 1) * limit;

    const [notifications, count] = await Promise.all([
      getNotifications({
        userId: sessionUser?.id ?? "anonymous",
        filters,
        limit,
        offset,
      }),
      getNotificationCount({
        userId: sessionUser?.id ?? "anonymous",
        filters,
      }),
    ]);

    return NextResponse.json({
      data: notifications,
      total: count.total,
      unread: count.unread,
      page,
      pageSize: limit,
      totalPages: Math.ceil(count.total / limit),
    });
  } catch (error) {
    console.error("[API] GET /api/notifications error:", error);
    return NextResponse.json(
      { error: "Không thể lấy thông báo" },
      { status: 500 }
    );
  }
}

// POST /api/notifications — mark read
export async function POST(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const rateLimit = await checkWorkspaceRateLimit(req);
  if (!rateLimit.allowed) return rateLimit.response;

  const sessionUser = (req as NextRequest & { _authUser?: { id: string; name: string; role: string } })._authUser;

  try {
    const body = await req.json();
    const { action, notificationIds } = body;

    if (action === "mark_read" && notificationIds?.length) {
      await markNotificationsRead({
        userId: sessionUser!.id,
        notificationIds,
      });
    } else if (action === "mark_all_read") {
      await markAllNotificationsRead({ userId: sessionUser!.id });
    } else {
      return NextResponse.json(
        { error: "Action không hợp lệ" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] POST /api/notifications error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật thông báo" },
      { status: 500 }
    );
  }
}
