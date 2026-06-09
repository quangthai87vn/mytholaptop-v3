import { NextRequest, NextResponse } from "next/server";
import { getActivitiesForExport } from "@/lib/workspace/db";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import type { ActivityRow } from "@/lib/workspace/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/activity/export
 * Chỉ super_admin và admin được export.
 * Không export raw secret/metadata có chứa sensitive data.
 * Không export các trường: ip_address, user_agent, full metadata.
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  const user = (request as NextRequest & { _authUser?: { role: string } })._authUser;
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  // Chỉ admin/super_admin được export
  if (!["admin", "super_admin"].includes(user.role)) {
    return NextResponse.json(
      { error: "Chỉ admin mới được xuất dữ liệu" },
      { status: 403 }
    );
  }

  const { searchParams } = request.nextUrl;

  const entityType = searchParams.get("entityType") ?? undefined;
  const actionType = searchParams.get("actionType") ?? undefined;
  const actorId = searchParams.get("actorId") ?? undefined;
  const actorName = searchParams.get("actorName") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;

  try {
    const rows = await getActivitiesForExport({
      entityType: entityType ? entityType.split(",") : undefined,
      actionType: actionType ? actionType.split(",") : undefined,
      actorId,
      actorName,
      search,
      dateFrom,
      dateTo,
    });

    // CSV header
    const headers = [
      "ID",
      "Nguồn",
      "Entity Type",
      "Entity Name",
      "Actor Name",
      "Action",
      "Field Changed",
      "Old Value",
      "New Value",
      "Created At",
    ];

    const escapeCsv = (val: string | null | undefined): string => {
      if (val == null) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = rows.map((row: ActivityRow) =>
      [
        escapeCsv(row.id),
        escapeCsv(row.source_table),
        escapeCsv(row.entity_type),
        escapeCsv(row.entity_name),
        escapeCsv(row.actor_name),
        escapeCsv(row.action_type),
        escapeCsv(row.field_changed),
        escapeCsv(row.old_value),
        escapeCsv(row.new_value),
        escapeCsv(new Date(row.created_at).toLocaleString("vi-VN")),
      ].join(",")
    );

    const csv = [headers.join(","), ...csvRows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="activity-log-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err) {
    console.error("[/api/activity/export] Error:", err);
    return NextResponse.json(
      { error: "Không thể xuất dữ liệu" },
      { status: 500 }
    );
  }
}
