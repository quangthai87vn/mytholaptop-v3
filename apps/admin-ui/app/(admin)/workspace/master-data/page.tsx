import { getMasterDataItems } from "@/lib/workspace/db";
import {
  MASTER_DATA_CATEGORIES,
  type MasterDataCategory,
} from "@/lib/workspace/types-master-data";
import Link from "next/link";
import {
  Tag,
  ListTodo,
  Gauge,
  GitBranch,
  Radio,
  Hash,
  Building2,
  ChevronRight,
  Palette,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Tag,
  ListTodo,
  Gauge,
  GitBranch,
  Radio,
  Hash,
  Building2,
  Palette,
};

export const dynamic = "force-dynamic";

export default async function MasterDataPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh mục</h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý danh mục hệ thống: loại công việc, trạng thái, ưu tiên...
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MASTER_DATA_CATEGORIES.map((cat) => {
          const Icon = ICON_MAP[cat.icon] || Tag;
          return (
            <Link
              key={cat.id}
              href={`/workspace/master-data/${cat.id}`}
              className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-primary transition-colors">
                      {cat.label}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                      {cat.description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-2" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
