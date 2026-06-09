import { NextRequest, NextResponse } from "next/server";
import { getActivities } from "@/lib/workspace/db";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import type { GetActivitiesOptions } from "@/lib/workspace/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  const rateLimit = await checkWorkspaceRateLimit(request);
  if (!rateLimit.allowed) return rateLimit.response;

  const user = (request as NextRequest & { _authUser?: { id: string; role: string } })._authUser;
  const isIntern = user?.role === "intern";

  const { searchParams } = request.nextUrl;

  const entityType = searchParams.get("entityType") ?? undefined;
  const actionType = searchParams.get("actionType") ?? undefined;
  const actorId = searchParams.get("actorId") ?? undefined;
  const actorName = searchParams.get("actorName") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(
    Math.min(parseInt(searchParams.get("pageSize") ?? "20"), 100).toString()
  );

  const options: GetActivitiesOptions = {
    entityType: entityType ? entityType.split(",") : undefined,
    actionType: actionType ? actionType.split(",") : undefined,
    actorId,
    actorName,
    search,
    dateFrom,
    dateTo,
    page: isNaN(page) ? 1 : page,
    pageSize: isNaN(pageSize) ? 20 : pageSize,
    // Interns only see their own activities or activities on their assigned tasks
    internId: isIntern ? (user?.id ?? undefined) : undefined,
  };

  try {
    const result = await getActivities(options);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/activity] Error:", err);
    return NextResponse.json(
      { error: "Không thể tải activity log" },
      { status: 500 }
    );
  }
}
