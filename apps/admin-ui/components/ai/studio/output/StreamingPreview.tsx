"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

interface StreamingPreviewProps {
  content: string;
  isStreaming: boolean;
  className?: string;
}

export function StreamingPreview({ content, isStreaming, className = "" }: StreamingPreviewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isStreamingRef = useRef(isStreaming);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content]);

  if (!content) {
    return (
      <div className={`flex items-center justify-center py-16 ${className}`}>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative">
            <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="size-5 text-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground/70">AI đang viết nội dung</p>
            <p className="text-xs text-muted-foreground/60">Vui lòng chờ trong giây lát...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={`prose prose-sm dark:prose-invert max-w-none overflow-y-auto scroll-smooth ${className}`}
      style={{ maxHeight: "500px" }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-foreground mb-3 mt-6 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-foreground mb-2 mt-5">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-foreground mb-2 mt-4">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-base leading-relaxed text-foreground/90 mb-3">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground/80">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1.5 my-3 text-foreground/90">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1.5 my-3 text-foreground/90">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-base leading-relaxed">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/30 pl-4 my-3 italic text-foreground/80">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 rounded-md bg-muted text-sm font-mono text-primary/90">
                  {children}
                </code>
              );
            }
            return (
              <code className="block p-4 rounded-xl bg-muted/80 text-sm font-mono overflow-x-auto my-3">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="rounded-xl bg-muted/80 p-4 overflow-x-auto my-3 text-sm font-mono">
              {children}
            </pre>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-6 border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>

      {isStreaming && (
        <span className="inline-block ml-1 align-middle">
          <span className="relative flex size-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full size-3 bg-primary" />
          </span>
        </span>
      )}
    </div>
  );
}
