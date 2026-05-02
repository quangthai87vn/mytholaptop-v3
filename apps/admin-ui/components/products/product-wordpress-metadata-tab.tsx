"use client";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface WooMeta {
  wordpress_product_id?: string;
  wordpress_regular_price?: string;
  wordpress_sale_price?: string;
  wordpress_price?: string;
  wordpress_manage_stock?: string;
  wordpress_stock_status?: string;
  wordpress_stock_quantity?: string;
  wordpress_categories?: string;
  wordpress_category_ids?: string;
  wordpress_category_names?: string;
  wordpress_tags?: string;
  wordpress_tag_slugs?: string;
  wordpress_tag_names?: string;
  wordpress_image?: string;
  [key: string]: string | undefined;
}

interface ProductWordPressMetadataTabProps {
  meta: WooMeta;
}

function MetaRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground min-w-40 shrink-0">{label}</span>
      <code className="text-xs bg-muted px-2 py-0.5 rounded break-all text-right">
        {value}
      </code>
    </div>
  );
}

export function ProductWordPressMetadataTab({ meta }: ProductWordPressMetadataTabProps) {
  const hasAnyMeta = Object.values(meta).some((v) => !!v);

  const stockStatusMap: Record<string, { label: string; variant: "success" | "destructive" | "warning" | "secondary" }> = {
    instock: { label: "Còn hàng", variant: "success" },
    outofstock: { label: "Hết hàng", variant: "destructive" },
    onbackorder: { label: "Đang chờ hàng", variant: "warning" },
  };

  if (!hasAnyMeta) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Sản phẩm này không có dữ liệu WordPress migration.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Metadata chỉ có cho sản phẩm được migrate từ WooCommerce.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-1">
        <p className="text-sm font-medium text-muted-foreground mb-3">
          Thông tin migration từ WordPress
        </p>

        <MetaRow label="WP Product ID" value={meta.wordpress_product_id} />

        {meta.wordpress_regular_price && (
          <MetaRow
            label="Giá gốc WP"
            value={`${formatCurrency(parseFloat(meta.wordpress_regular_price))} (${meta.wordpress_regular_price})`}
          />
        )}
        {meta.wordpress_sale_price && (
          <MetaRow
            label="Giá sale WP"
            value={`${formatCurrency(parseFloat(meta.wordpress_sale_price))} (${meta.wordpress_sale_price})`}
          />
        )}
        {meta.wordpress_price && (
          <MetaRow
            label="Giá WP"
            value={`${formatCurrency(parseFloat(meta.wordpress_price))} (${meta.wordpress_price})`}
          />
        )}
      </div>

      <div className="rounded-lg border p-4 space-y-1">
        <p className="text-sm font-medium text-muted-foreground mb-3">
          Thông tin tồn kho WordPress
        </p>

        <MetaRow label="Quản lý stock" value={meta.wordpress_manage_stock} />

        <div className="flex items-start justify-between gap-4 py-2">
          <span className="text-sm text-muted-foreground min-w-40 shrink-0">
            Trạng thái kho
          </span>
          {meta.wordpress_stock_status ? (
            <Badge
              variant={
                stockStatusMap[meta.wordpress_stock_status]?.variant || "secondary"
              }
              className="text-xs"
            >
              {stockStatusMap[meta.wordpress_stock_status]?.label ||
                meta.wordpress_stock_status}
            </Badge>
          ) : (
            <code className="text-xs bg-muted px-2 py-0.5 rounded">—</code>
          )}
        </div>

        <MetaRow label="Stock quantity" value={meta.wordpress_stock_quantity} />
      </div>

      <div className="rounded-lg border p-4 space-y-1">
        <p className="text-sm font-medium text-muted-foreground mb-3">
          Phân loại WordPress
        </p>

        <MetaRow label="Category IDs" value={meta.wordpress_category_ids} />
        <MetaRow label="Category Names" value={meta.wordpress_category_names} />

        {meta.wordpress_tags && (
          <div className="flex items-start justify-between gap-4 py-2">
            <span className="text-sm text-muted-foreground min-w-40 shrink-0">
              WP Tags
            </span>
            <div className="flex flex-wrap gap-1 justify-end">
              {meta.wordpress_tags.split(",").filter(Boolean).map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {tag.trim()}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <MetaRow label="Tag Names" value={meta.wordpress_tag_names} />
      </div>

      {meta.wordpress_image && (
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Hình ảnh WordPress
          </p>
          <MetaRow label="WP Image URL" value={meta.wordpress_image} />
        </div>
      )}

      <div className="rounded-lg border p-4">
        <p className="text-sm font-medium text-muted-foreground mb-3">
          Tất cả Metadata
        </p>
        <div className="space-y-1">
          {Object.entries(meta)
            .filter(([, v]) => !!v)
            .map(([key, value]) => (
              <MetaRow key={key} label={key} value={value} />
            ))}
        </div>
      </div>
    </div>
  );
}
