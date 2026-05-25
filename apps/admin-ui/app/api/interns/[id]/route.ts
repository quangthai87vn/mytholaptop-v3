import { NextRequest, NextResponse } from "next/server";
import { getInternById, getInternKPIs, getWeeklyPerformance } from "@/lib/workspace/db";
import { query } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const intern = await getInternById(id);
    if (!intern) {
      return NextResponse.json({ error: "Intern not found" }, { status: 404 });
    }

    const [kpis, performances] = await Promise.all([
      getInternKPIs(id),
      getWeeklyPerformance(id),
    ]);

    return NextResponse.json({
      data: {
        ...intern,
        kpis,
        performances,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/interns/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
