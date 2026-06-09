import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { archiveCampaign, deleteCampaign, writeWorkspaceAuditLog, getMasterDataItems } from "@/lib/workspace/db";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { updateCampaignSchema, buildValidationResponse } from "@/lib/workspace/validation";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import { hasPermission } from "@/lib/rbac";
import { loadCustomPermissionsFromDB } from "@/lib/auth/permissions.server";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const { id } = await params;
  try {
    const { rows } = await query("SELECT * FROM pm_campaigns WHERE id = $1", [id]);
    if (!rows[0]) {
      return NextResponse.json({ error: "Không tìm thấy chiến dịch" }, { status: 404 });
    }
    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    console.error("[API/campaigns/[id]] GET error:", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(req);
  if (!rateLimit.allowed) return rateLimit.response;

  const { id } = await params;

  const sessionId = req.cookies.get(getSessionCookieName())?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "Chưa đăng nhập.", code: "NOT_AUTHENTICATED" }, { status: 401 });
  }
  const user = await validateSession(sessionId);
  if (!user) {
    return NextResponse.json({ error: "Phiên đăng nhập hết hạn.", code: "SESSION_INVALID" }, { status: 401 });
  }
  await loadCustomPermissionsFromDB();
  if (!hasPermission(user, "campaigns.update")) {
    return NextResponse.json({ error: "Bạn không có quyền cập nhật chiến dịch.", code: "FORBIDDEN" }, { status: 403 });
  }
  const actorName = user.full_name || user.email || "System";

  try {
    const body = await req.json();

    const result = updateCampaignSchema.safeParse(body);
    if (!result.success) {
      return buildValidationResponse(result.error.issues);
    }
    const d = result.data;

    // ── DB-level validation: verify category codes exist in pm_master_data ──
    const [campaignStatuses, campaignTypes] = await Promise.all([
      getMasterDataItems("campaign_status"),
      getMasterDataItems("campaign_type"),
    ]);
    const activeCampaignStatusCodes = new Set(campaignStatuses.filter((s) => s.is_active).map((s) => s.code));
    const activeCampaignTypeCodes = new Set(campaignTypes.filter((t) => t.is_active).map((t) => t.code));

    if (d.status && !activeCampaignStatusCodes.has(d.status)) {
      return NextResponse.json(
        { error: `Status chiến dịch "${d.status}" không tồn tại hoặc không active trong pm_master_data`, code: "INVALID_CAMPAIGN_STATUS" },
        { status: 400 }
      );
    }
    if (d.campaign_type && d.campaign_type !== "" && !activeCampaignTypeCodes.has(d.campaign_type)) {
      return NextResponse.json(
        { error: `Campaign type "${d.campaign_type}" không tồn tại hoặc không active trong pm_master_data`, code: "INVALID_CAMPAIGN_TYPE" },
        { status: 400 }
      );
    }

    const { rows: oldRows } = await query<{ status: string; name: string }>(
      "SELECT status, name FROM pm_campaigns WHERE id = $1",
      [id]
    );
    if (!oldRows[0]) {
      return NextResponse.json({ error: "Không tìm thấy chiến dịch" }, { status: 404 });
    }
    const oldStatus = oldRows[0].status;
    const entityName = oldRows[0].name;
    const actorId = user.id;

    const allowed = [
      "project_id", "name", "description", "campaign_type", "status",
      "start_date", "end_date", "budget",
      "target_metrics", "actual_metrics", "channels", "tags",
    ] as const;

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const key of allowed) {
      if (key in d) {
        const val = d[key as keyof typeof d];
        if (val !== undefined && val !== "") {
          fields.push(`${key} = $${idx}`);
          values.push(val);
          idx++;
        }
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Không có trường nào được cập nhật" }, { status: 400 });
    }

    values.push(id);
    const { rows } = await query<Record<string, unknown>>(
      `UPDATE pm_campaigns SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (!rows[0]) {
      return NextResponse.json({ error: "Không tìm thấy chiến dịch" }, { status: 404 });
    }

    if (d.status && d.status !== oldStatus) {
      await query(
        `INSERT INTO pm_status_history (entity_type, entity_id, from_status, to_status, changed_by_name)
         VALUES ('campaign', $1, $2, $3, $4)`,
        [id, oldStatus, d.status, actorName]
      );
    }

    const changes = Object.entries(d).map(([field, newVal]) => ({ field, old: undefined, new: newVal }));
    await writeWorkspaceAuditLog({
      actorId,
      actorName,
      action: d.status && d.status !== oldStatus ? "status_changed" : "updated",
      entityType: "campaign",
      entityId: id,
      entityName,
      changes,
    });

    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    console.error("[API/campaigns/[id]] PUT error:", err);
    return NextResponse.json({ error: "Lỗi khi cập nhật chiến dịch" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(req);
  if (!rateLimit.allowed) return rateLimit.response;

  const { id } = await params;

  const sessionId = req.cookies.get(getSessionCookieName())?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "Chưa đăng nhập.", code: "NOT_AUTHENTICATED" }, { status: 401 });
  }
  const user = await validateSession(sessionId);
  if (!user) {
    return NextResponse.json({ error: "Phiên đăng nhập hết hạn.", code: "SESSION_INVALID" }, { status: 401 });
  }
  await loadCustomPermissionsFromDB();
  if (!hasPermission(user, "campaigns.delete")) {
    return NextResponse.json({ error: "Bạn không có quyền xóa/lưu trữ chiến dịch.", code: "FORBIDDEN" }, { status: 403 });
  }

  const actorName = user.full_name || user.email || "System";
  const actorId = user.id;
  const hardDelete = user.role === "super_admin" && req.nextUrl.searchParams.get("hard") === "true";

  const { rows: existingRows } = await query<{ name: string }>(
    "SELECT name FROM pm_campaigns WHERE id = $1",
    [id]
  );
  if (!existingRows[0]) return NextResponse.json({ error: "Không tìm thấy chiến dịch" }, { status: 404 });

  if (hardDelete) {
    await deleteCampaign(id, true, actorName);
    await writeWorkspaceAuditLog({ actorId, actorName, action: "deleted", entityType: "campaign", entityId: id, entityName: existingRows[0].name });
  } else {
    await archiveCampaign(id, actorName);
    await writeWorkspaceAuditLog({ actorId, actorName, action: "archived", entityType: "campaign", entityId: id, entityName: existingRows[0].name });
  }

  return NextResponse.json({ data: { success: true, archived: !hardDelete } });
}
