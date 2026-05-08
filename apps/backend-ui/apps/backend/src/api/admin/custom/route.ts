import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * Query inventory items by SKU (or wildcard).
 * GET /admin/custom/inventory-items?q=woo-123
 * Returns: { inventory_items: [...], variants: [...], products: [...] }
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = (req.query.q as string) || (req.query.sku as string) || "";

  if (!q) {
    res.status(400).json({ error: "Thiếu tham số q (SKU)" });
    return;
  }

  try {
    const remoteQuery = req.scope.resolve("remoteQuery");

    // Find inventory items matching SKU
    const inventoryItems = await remoteQuery({
      inventory_item: {
        __args: { filters: { sku: { $ilike: `%${q}%` } } },
        fields: ["id", "sku", "title", "description"],
      },
    } as any);

    // For each inventory item, find associated variants and products
    const enrichedItems: any[] = [];
    for (const item of (inventoryItems || [])) {
      const variants = await remoteQuery({
        inventory_item: {
          __args: { filters: { id: item.id } },
          fields: ["id"],
          variant: {
            fields: ["id", "title", "sku", "product_id"],
          },
        },
      } as any);

      const variantLinks = await remoteQuery({
        product_variant_inventory_item: {
          __args: { filters: { inventory_item_id: item.id } },
          fields: ["variant_id", "inventory_item_id"],
        },
      } as any);

      // Get product info
      let productInfo: any = null;
      if (variantLinks && variantLinks.length > 0) {
        const variantId = variantLinks[0].variant_id;
        const variants2 = await remoteQuery({
          product_variant: {
            __args: { filters: { id: variantId } },
            fields: ["id", "title", "sku", "product_id"],
            product: {
              fields: ["id", "title"],
            },
          },
        } as any);
        if (variants2 && variants2.length > 0) {
          productInfo = variants2[0].product;
        }
      }

      enrichedItems.push({
        ...item,
        variantCount: variantLinks?.length || 0,
        variantIds: variantLinks?.map((v: { variant_id: string }) => v.variant_id) || [],
        product: productInfo,
        isOrphan: !variantLinks || variantLinks.length === 0,
      });
    }

    res.json({ success: true, query: q, inventoryItems: enrichedItems });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[GET /admin/custom/inventory-items]", message);
    res.status(500).json({ error: message });
  }
}

/**
 * Delete inventory items by IDs or SKUs.
 * POST /admin/custom/inventory-items/delete
 * Body: { ids?: string[], skus?: string[], dryRun?: boolean }
 * Returns: { success, deleted?, dryRun?, items: [...] }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as { ids?: string[]; skus?: string[]; dryRun?: boolean } | undefined;
  const { ids, skus, dryRun = false } = body || {};

  if ((!ids || !ids.length) && (!skus || !skus.length)) {
    res.status(400).json({ error: "Phải cung cấp ids hoặc skus" });
    return;
  }

  try {
    const remoteQuery = req.scope.resolve("remoteQuery");
    const remoteLink = req.scope.resolve("remoteLink");

    // Collect all inventory item IDs to delete
    const toDeleteIds = new Set<string>();

    if (ids && ids.length > 0) {
      for (const id of ids) {
        toDeleteIds.add(id);
      }
    }

    if (skus && skus.length > 0) {
      const inventoryBySku = await remoteQuery({
        inventory_item: {
          __args: { filters: { sku: skus } },
          fields: ["id", "sku"],
        },
      } as any);
      for (const item of (inventoryBySku || [])) {
        toDeleteIds.add(item.id);
      }
    }

    if (toDeleteIds.size === 0) {
      res.json({ success: true, dryRun, deleted: 0, items: [] });
      return;
    }

    // Gather full info for each item BEFORE deleting
    const itemDetails: any[] = [];
    for (const itemId of toDeleteIds) {
      const items = await remoteQuery({
        inventory_item: {
          __args: { filters: { id: itemId } },
          fields: ["id", "sku", "title", "description"],
        },
      } as any);
      if (items && items.length > 0) {
        const item = items[0];

        // Check variant links
        const variantLinks = await remoteQuery({
          product_variant_inventory_item: {
            __args: { filters: { inventory_item_id: itemId } },
            fields: ["variant_id"],
          },
        } as any);

        let productTitle: string | null = null;
        let variantTitle: string | null = null;
        if (variantLinks && variantLinks.length > 0) {
          const variantInfo = await remoteQuery({
            product_variant: {
              __args: { filters: { id: variantLinks[0].variant_id } },
              fields: ["id", "title", "sku"],
              product: { fields: ["id", "title"] },
            },
          } as any);
          if (variantInfo && variantInfo.length > 0) {
            variantTitle = variantInfo[0].title || variantInfo[0].sku;
            productTitle = variantInfo[0].product?.title;
          }
        }

        itemDetails.push({
          inventory_item_id: item.id,
          sku: item.sku,
          title: item.title || productTitle || variantTitle || "(no title)",
          hasVariantLinks: variantLinks && variantLinks.length > 0,
          variantCount: variantLinks?.length || 0,
          isOrphan: !variantLinks || variantLinks.length === 0,
        });
      }
    }

    if (dryRun) {
      res.json({
        success: true,
        dryRun: true,
        wouldDelete: itemDetails.length,
        items: itemDetails,
      });
      return;
    }

    // Actually delete
    const deletedIds: string[] = [];
    for (const itemId of toDeleteIds) {
      try {
        await remoteLink.delete([
          {
            inventory_item: { inventory_item_id: itemId },
          },
        ] as any);
        deletedIds.push(itemId);
      } catch (e) {
        console.warn(`[inventory-delete] Failed to delete ${itemId}:`, e);
      }
    }

    res.json({ success: true, deleted: deletedIds.length, ids: deletedIds, items: itemDetails });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[POST /admin/custom/inventory-items/delete]", message);
    res.status(500).json({ error: message });
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const sku = req.query.sku as string | undefined;

  if (!sku) {
    res.status(400).json({ error: "Thiếu tham số sku" });
    return;
  }

  try {
    const remoteQuery = req.scope.resolve("remoteQuery");
    const remoteLink = req.scope.resolve("remoteLink");

    const items = await remoteQuery({
      inventory_item: {
        __args: { filters: { sku } },
        fields: ["id", "sku"],
      },
    } as any);

    if (!items || items.length === 0) {
      res.status(404).json({ error: `Không tìm thấy inventory item với SKU: ${sku}` });
      return;
    }

    const deleted: string[] = [];
    for (const item of items) {
      await remoteLink.delete([{ inventory_item: { inventory_item_id: item.id } }] as any);
      deleted.push(item.id);
    }

    res.json({ success: true, deleted: deleted.length, sku });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[DELETE /admin/custom/inventory-items]", message);
    res.status(500).json({ error: message });
  }
}
