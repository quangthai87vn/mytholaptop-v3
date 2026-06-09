import { notFound } from "next/navigation";
import { getMasterDataItems } from "@/lib/workspace/db";
import {
  MASTER_DATA_CATEGORIES,
  type MasterDataCategory,
} from "@/lib/workspace/types-master-data";
import { MasterDataClient } from "@/components/master-data/master-data-client";
import { Tag } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ category: string }>;
}

export default async function MasterDataCategoryPage({ params }: Props) {
  const { category } = await params;

  const validCat = MASTER_DATA_CATEGORIES.find((c) => c.id === category);
  if (!validCat) notFound();

  const items = await getMasterDataItems(category as MasterDataCategory, {
    includeInactive: true,
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/workspace/master-data" className="hover:text-primary transition-colors">
          Danh mục
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{validCat.label}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Tag className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{validCat.label}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {validCat.description}
            </p>
          </div>
        </div>
      </div>

      <MasterDataClient category={category as MasterDataCategory} items={items} />
    </div>
  );
}
