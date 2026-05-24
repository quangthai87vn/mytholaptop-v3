"use client";

import { Hash } from "lucide-react";

interface HashtagsChipsProps {
  hashtags: string[];
  onCopy?: (tag: string) => void;
  onCopyAll?: () => void;
}

export function HashtagsChips({ hashtags, onCopy, onCopyAll }: HashtagsChipsProps) {
  if (!hashtags || hashtags.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Hash className="size-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Hashtags
          </span>
          <span className="text-[10px] text-muted-foreground/50 font-medium">
            ({hashtags.length})
          </span>
        </div>
        {onCopyAll && (
          <button
            onClick={onCopyAll}
            className="text-[10px] text-primary/70 hover:text-primary font-medium transition-colors"
          >
            Copy tất cả
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {hashtags.map((tag, i) => (
          <button
            key={i}
            onClick={() => onCopy?.(tag)}
            className="
              px-3 py-1.5 rounded-full
              bg-muted/60 text-foreground/80
              border border-border/50
              text-xs font-medium
              hover:bg-primary/10 hover:text-primary hover:border-primary/25
              transition-all duration-200
              hover:shadow-sm hover:shadow-primary/10
              active:scale-95
            "
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
