import { NextRequest, NextResponse } from "next/server";
import { getCampaigns, createCampaign, getMasterDataItems } from "@/lib/workspace/db";
import { writeWorkspaceAuditLog } from "@/lib/workspace/db";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { createCampaignSchema, buildValidationResponse } from "@/lib/workspace/validation";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import type { CampaignStatus } from "@/lib/workspace/types";
import { hasPermission, type Permission } from "@/lib/rbac";
import { loadCustomPermissionsFromDB } from "@/lib/auth/permissions.server";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";

async function requirePermission(
  req: NextRequest,
  permission: Permission
): Promise<{ allowed: true; actorId?: string; actorName: string } | { allowed: false; response: NextResponse }> {
  const sessionId = req.cookies.get(getSessionCookieName())?.value;
  if (!sessionId) {
    return { allowed: false, response: NextResponse.json({ error: "Chưa đăng nhập.", code: "NOT_AUTHENTICATED" }, { status: 401 }) };
  }
  const user = await validateSession(sessionId);
  if (!user) {
    return { allowed: false, response: NextResponse.json({ error: "Phiên đăng nhập hết hạn.", code: "SESSION_INVALID" }, { status: 401 }) };
  }
  await loadCustomPermissionsFromDB();
  if (!hasPermission(user, permission)) {
    return { allowed: false, response: NextResponse.json({ error: "Bạn không có quyền thực hiện thao tác này.", code: "FORBIDDEN" }, { status: 403 }) };
  }
  return { allowed: true, actorId: user.id, actorName: user.full_name || user.email || "System" };
}

export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const { searchParams } = req.nextUrl;
  const project_id = searchParams.get("project_id") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  try {
    const campaigns = await getCampaigns({ project_id, status });
    return NextResponse.json({ data: campaigns });
  } catch (err) {
    console.error("[API/campaigns] GET error:", err);
    return NextResponse.json({ error: "Lỗi khi lấy danh sách chiến dịch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(req);
  if (!rateLimit.allowed) return rateLimit.response;

  const perm = await requirePermission(req, "campaigns.create");
  if (!perm.allowed) return perm.response;

  try {
    const body = await req.json();

    const result = createCampaignSchema.safeParse(body);
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

    if (!activeCampaignStatusCodes.has(d.status)) {
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

    const campaign = await createCampaign({
      name: d.name,
      description: d.description,
      project_id: d.project_id || undefined,
      campaign_type: d.campaign_type || "",
      status: d.status as CampaignStatus,
      start_date: d.start_date || undefined,
      end_date: d.end_date || undefined,
      budget: d.budget,
      target_metrics: d.target_metrics,
      actual_metrics: d.actual_metrics,
      channels: d.channels,
      tags: d.tags,
    }, perm.actorName);

    await writeWorkspaceAuditLog({
      actorId: perm.actorId,
      actorName: perm.actorName,
      action: "created",
      entityType: "campaign",
      entityId: campaign.id,
      entityName: campaign.name,
    });

    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch (err) {
    console.error("[API/campaigns] POST error:", err);
    return NextResponse.json({ error: "Lỗi khi tạo chiến dịch" }, { status: 500 });
  }
}
