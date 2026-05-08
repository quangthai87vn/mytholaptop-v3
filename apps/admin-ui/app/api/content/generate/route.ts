/**
 * Content Generation API
 * POST /api/content/generate
 * Body: { productId, productName, productDescription?, productPrice?, contentType, templateId?, tone?, audience?, customPrompt? }
 */

import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/content/ai/generator";
import type { ContentType } from "@/lib/content/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      productId,
      productName,
      productDescription,
      productThumbnail,
      productPrice,
      productTags,
      productCategory,
      contentType,
      templateId,
      tone,
      audience,
      customPrompt,
    } = body;

    if (!productId || !productName || !contentType) {
      return NextResponse.json(
        { error: "productId, productName, contentType la bat buoc" },
        { status: 400 }
      );
    }

    const validTypes: ContentType[] = ["facebook", "website", "video", "image"];
    if (!validTypes.includes(contentType)) {
      return NextResponse.json(
        { error: "contentType khong hop le. Chi chap nhan: facebook, website, video, image" },
        { status: 400 }
      );
    }

    const result = await generateContent({
      product: {
        id: productId,
        title: productName,
        description: productDescription,
        thumbnail: productThumbnail,
        price: productPrice ? parseFloat(productPrice) : undefined,
        tags: productTags,
        category: productCategory,
      },
      contentType,
      templateId: templateId ? parseInt(templateId, 10) : undefined,
      tone: tone || undefined,
      audience: audience || undefined,
      customPrompt: customPrompt || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Loi khi tao noi dung",
          latency_ms: result.latency_ms,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      data: {
        content: result.content,
        contentItemId: result.contentItemId,
        model: result.model,
        tokens_used: result.tokens_used,
        latency_ms: result.latency_ms,
      },
    });
  } catch (err) {
    console.error("[Generate POST]", err);
    return NextResponse.json({ error: "Loi khi tao noi dung" }, { status: 500 });
  }
}
