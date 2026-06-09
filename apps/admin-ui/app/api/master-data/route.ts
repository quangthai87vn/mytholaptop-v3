import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import {
  getMasterDataItems,
  getAllMasterData,
  getMasterDataById,
  createMasterDataItem,
  updateMasterDataItem,
  softDeleteMasterDataItem,
  restoreMasterDataItem,
  countTasksByStatus,
} from "@/lib/workspace/db";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import type {
  MasterDataCategory,
  CreateMasterDataInput,
  UpdateMasterDataInput,
} from "@/lib/workspace/types-master-data";

const VALID_CATEGORIES: MasterDataCategory[] = [
  "task_type",
  "task_status",
  "priority",
  "workflow_stage",
  "channel",
  "content_tag",
  "department",
  "campaign_type",
  "campaign_status",
  "project_status",
  "content_goal",
  "content_status",
];

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as MasterDataCategory | null;

    if (category) {
      if (!VALID_CATEGORIES.includes(category)) {
        return NextResponse.json(
          { error: "Danh mục không hợp lệ" },
          { status: 400 }
        );
      }
      const items = await getMasterDataItems(category, {
        includeInactive: searchParams.get("includeInactive") === "true",
      });
      return NextResponse.json({ data: items });
    }

    const all = await getAllMasterData();
    return NextResponse.json({ data: all });
  } catch (error) {
    console.error("[API] GET /api/master-data error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(request);
  if (!rateLimit.allowed) return rateLimit.response;

  try {
    const body = await request.json();

    const { category, code, name } = body as Partial<CreateMasterDataInput>;
    if (!category || !code || !name) {
      return NextResponse.json(
        { error: "Thiếu trường bắt buộc: category, code, name", code: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: "Danh mục không hợp lệ", code: "INVALID_CATEGORY" },
        { status: 400 }
      );
    }

    if (!code.match(/^[a-z0-9_]+$/)) {
      return NextResponse.json(
        { error: "Code chỉ được chứa chữ thường, số và dấu gạch dưới", code: "INVALID_CODE" },
        { status: 400 }
      );
    }

    const item = await createMasterDataItem(body as CreateMasterDataInput);
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("duplicate key") ||
      String(error).includes("23505")
    ) {
      return NextResponse.json(
        { error: "Code này đã tồn tại trong danh mục. Vui lòng dùng code khác.", code: "DUPLICATE_CODE" },
        { status: 409 }
      );
    }
    console.error("[API] POST /api/master-data error:", error);
    return NextResponse.json(
      { error: "Failed to create item" },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(request);
  if (!rateLimit.allowed) return rateLimit.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Thiếu id trong query string", code: "MISSING_ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const item = await updateMasterDataItem(id, body as UpdateMasterDataInput);

    if (!item) {
      return NextResponse.json(
        { error: "Không tìm thấy item", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: item });
  } catch (error) {
    console.error("[API] PUT /api/master-data error:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action");

    if (!id) {
      return NextResponse.json(
        { error: "Thiếu id trong query string", code: "MISSING_ID" },
        { status: 400 }
      );
    }

    if (action === "restore") {
      const restored = await restoreMasterDataItem(id);
      if (!restored) {
        return NextResponse.json(
          { error: "Không thể khôi phục item", code: "RESTORE_FAILED" },
          { status: 404 }
        );
      }
      return NextResponse.json({ data: { success: true } });
    }

    // Check what we're about to delete
    const itemToDelete = await getMasterDataById(id);
    if (!itemToDelete) {
      return NextResponse.json(
        { error: "Không tìm thấy item", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    if (itemToDelete.is_system) {
      return NextResponse.json(
        { error: "Không thể xóa item hệ thống", code: "SYSTEM_ITEM" },
        { status: 403 }
      );
    }

    // Warn if deleting a task_status that has active tasks using it
    if (itemToDelete.category === "task_status") {
      const usageCount = await countTasksByStatus(itemToDelete.code);
      if (usageCount > 0) {
        return NextResponse.json(
          {
            error: `Có ${usageCount} công việc đang dùng trạng thái này. Hãy chuyển sang trạng thái khác trước khi xóa.`,
            code: "STATUS_IN_USE",
            usageCount,
          },
          { status: 409 }
        );
      }
    }

    // Soft delete
    const deleted = await softDeleteMasterDataItem(id);

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("[API] DELETE /api/master-data error:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 400 }
    );
  }
}
