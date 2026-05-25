import { NextRequest, NextResponse } from "next/server";
import { getTaskById, updateTask, deleteTask } from "@/lib/workspace/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const task = await getTaskById(id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ data: task });
  } catch (error) {
    console.error("[API] GET /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const task = await updateTask(id, body);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ data: task });
  } catch (error) {
    console.error("[API] PUT /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteTask(id);
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("[API] DELETE /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 400 });
  }
}
