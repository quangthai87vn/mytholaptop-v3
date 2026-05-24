"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw, Share2, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface FacebookPreviewCardProps {
  content: string;
  productName?: string;
  cta?: string;
  hashtags?: string[];
  stats?: { likes?: number; comments?: number; shares?: number };
  onCopy?: () => void;
  onRegenerate?: () => void;
  onPost?: () => void;
}

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

export function FacebookPreviewCard({
  content,
  productName = "Mỹ Tho Laptop",
  cta,
  hashtags = [],
  stats = { likes: 247, comments: 38, shares: 12 },
  onCopy,
  onRegenerate,
  onPost,
}: FacebookPreviewCardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const cleanContent = stripHtml(content);
  const paragraphs = cleanContent.split("\n\n").filter((p) => p.trim());

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast.success("Đã copy nội dung!");
    onCopy?.();
  };

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 font-medium"
          onClick={handleCopy}
        >
          {isCopied ? (
            <Check className="size-3 text-emerald-500" />
          ) : (
            <Copy className="size-3" />
          )}
          {isCopied ? "Đã copy" : "Copy"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 font-medium"
          onClick={onRegenerate}
        >
          <RefreshCw className="size-3" />
          Tạo lại
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 font-semibold"
          onClick={onPost}
        >
          <Share2 className="size-3" />
          Đăng Facebook
        </Button>
      </div>

      {/* Facebook Card */}
      <div className="rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white text-sm font-bold">MTL</span>
            </div>

            {/* Meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground leading-tight">{productName}</p>
                <div className="size-2.5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                  <div className="size-1 rounded-full bg-white" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-muted-foreground">Vừa xong</span>
                <span className="text-[10px] text-muted-foreground">·</span>
                <svg className="size-3 text-muted-foreground" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M8.545 7.488c0-.45-.372-.815-.83-.815-.46 0-.832.365-.832.815 0 .452.37.815.832.815.457 0 .83-.363.83-.815zm-4.09 0c0-.45-.373-.815-.83-.815-.46 0-.833.365-.833.815 0 .452.372.815.833.815.457 0 .83-.363.83-.815zM6 9.545C3.69 9.545 1.818 7.673 1.818 5.364 1.818 3.055 3.69 1.182 6 1.182c2.31 0 4.182 1.873 4.182 4.182 0 2.31-1.873 4.181-4.182 4.181z" />
                </svg>
              </div>
            </div>

            {/* More button */}
            <button className="p-1 rounded hover:bg-muted transition-colors">
              <svg className="size-4 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-3 space-y-2">
          {paragraphs.map((para, i) => (
            <p key={i} className="text-sm leading-[1.7] text-foreground/90">
              {para}
            </p>
          ))}
        </div>

        {/* CTA */}
        {cta && (
          <div className="mx-4 mb-3 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] p-4 text-center">
            <p className="text-sm font-bold text-primary leading-snug">{cta}</p>
          </div>
        )}

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {hashtags.slice(0, 6).map((tag, i) => (
                <span
                  key={i}
                  className="text-[12px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reaction bar */}
        <div className="flex items-center border-t px-4 py-2.5 mt-1">
          <div className="flex items-center gap-1 flex-1">
            {/* Reaction icons */}
            <div className="flex -space-x-1.5">
              {[
                { bg: "#3dc453", emoji: "👍" },
                { bg: "#e1306c", emoji: "❤️" },
                { bg: "#f7b731", emoji: "😂" },
              ].map((r, i) => (
                <div
                  key={i}
                  className="size-5 rounded-full border-2 border-white dark:border-neutral-800 flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: r.bg }}
                >
                  <span className="text-[8px] text-white font-bold">{r.emoji}</span>
                </div>
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground ml-2">{stats.likes}</span>
          </div>

          {/* Comment & Share counts */}
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="text-[11px]">{stats.comments} bình luận</span>
            <span className="text-[11px]">{stats.shares} chia sẻ</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center border-t border-border/50">
          {[
            { icon: "👍", label: "Thích", nativeIcon: true },
            { icon: "💬", label: "Bình luận", nativeIcon: false },
            { icon: "↗", label: "Chia sẻ", nativeIcon: false },
          ].map((action) => (
            <button
              key={action.label}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors font-medium"
            >
              {action.nativeIcon ? (
                <span className="text-sm">{action.icon}</span>
              ) : (
                <span className="text-sm">{action.icon}</span>
              )}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Raw content toggle */}
      <button
        onClick={() => setShowRaw(!showRaw)}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ExternalLink className="size-3" />
        {showRaw ? "Ẩn nội dung gốc" : "Xem nội dung gốc"}
      </button>

      {showRaw && (
        <div className="rounded-xl border border-dashed bg-muted/20 p-4">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}
