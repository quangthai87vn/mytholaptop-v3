"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Loader2,
  Send,
  Copy,
  RotateCcw,
  Trash2,
  Zap,
  ChevronDown,
  ChevronUp,
  Clock,
  Hash,
  Eye,
  AlertTriangle,
  Save,
  Route,
  CheckCircle2,
} from "lucide-react";
import type { ProviderType, PlaygroundMessage } from "@/types/ai-operating";
import { DEFAULT_VI_SYSTEM_PROMPT } from "@/types/ai-operating";

interface TestPlaygroundProps {
  providerType: string;
  modelName: string;
  temperature: number;
  taskRoutes?: { task_type: string; provider_type: string; model_name: string; temperature: number; max_tokens: number; system_prompt_id?: number; brand_preset?: string }[];
  onTokenUpdate?: (tokens: number) => void;
  onLatencyUpdate?: (ms: number) => void;
  onRequestComplete?: (tokens: number, latency_ms: number) => void;
  onStreamingChange?: (streaming: boolean) => void;
  onSaveAsTemplate?: (prompt: string) => void;
}

interface MessageStats {
  tokens?: number;
  latency_ms?: number;
  tokens_per_sec?: number;
}

function parseMarkdown(text: string): string {
  // Simple markdown: bold, italic, code, headers, lists, links
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre class="bg-muted rounded-lg p-3 my-2 text-xs overflow-x-auto border"><code class="text-primary">${code.trim()}</code></pre>`;
    })
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-primary">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^#{1,6}\s(.+)$/gm, (_, t) => {
      const level = t.length > 30 ? 3 : t.length > 20 ? 2 : 1;
      return `<h${level} class="font-semibold mt-3 mb-1 text-sm">${t}</h${level}>`;
    })
    .replace(/^\s*[-*]\s(.+)$/gm, '<li class="ml-3">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

function PlaygroundMsg({
  msg,
  onCopy,
}: {
  msg: PlaygroundMessage;
  onCopy: (text: string) => void;
}) {
  const isUser = msg.role === "user";
  const stats = (msg as PlaygroundMessage & { stats?: MessageStats }).stats;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted/80 border shadow-sm"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
        ) : (
          <div
            className="whitespace-pre-wrap leading-relaxed [&_strong]:font-semibold [&_em]:italic [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:my-2 [&_pre]:text-xs [&_pre]:overflow-x-auto [&_pre]:border"
            dangerouslySetInnerHTML={{
              __html: msg.content ? parseMarkdown(msg.content) : "",
            }}
          />
        )}

        {/* Metadata */}
        {!isUser && (msg.model || msg.tokens_used !== undefined || msg.latency_ms !== undefined || stats) && (
          <div className="flex flex-wrap items-center gap-3 mt-2.5 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
            {msg.model && (
              <span className="flex items-center gap-1 font-mono">
                <Zap className="size-3" />
                {msg.model}
              </span>
            )}
            {(msg.tokens_used !== undefined || stats?.tokens !== undefined) && (
              <span className="flex items-center gap-1">
                <Hash className="size-3" />
                {(msg.tokens_used ?? stats?.tokens ?? 0).toLocaleString()} tokens
              </span>
            )}
            {stats?.tokens_per_sec !== undefined && (
              <span className="text-[10px] opacity-70">
                {stats.tokens_per_sec.toFixed(1)} tok/s
              </span>
            )}
            {(msg.latency_ms !== undefined || stats?.latency_ms !== undefined) && (
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {msg.latency_ms ?? stats?.latency_ms}ms
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 h-5 px-1.5 text-[10px] ml-auto"
              onClick={() => onCopy(msg.content)}
            >
              <Copy className="size-2.5" />
              Copy
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TestPlayground({
  providerType,
  modelName,
  temperature,
  taskRoutes = [],
  onTokenUpdate,
  onLatencyUpdate,
  onRequestComplete,
  onStreamingChange,
  onSaveAsTemplate,
}: TestPlaygroundProps) {
  const [messages, setMessages] = useState<(PlaygroundMessage & { stats?: MessageStats })[]>([]);
  const [input, setInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_VI_SYSTEM_PROMPT);
  const [showSystem, setShowSystem] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingSystemPrompt, setEditingSystemPrompt] = useState(false);
  const [appliedRouting, setAppliedRouting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }, 30);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleGenerate = useCallback(async (regenerateLast = false) => {
    let userContent: string;
    let msgId: string;

    if (regenerateLast && messages.length >= 2) {
      // Find last user message
      const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === "user");
      if (lastUserIdx === -1) return;
      const userIdx = messages.length - 1 - lastUserIdx;
      userContent = messages[userIdx].content;
      msgId = crypto.randomUUID();

      // Remove last assistant message
      setMessages((prev) => prev.slice(0, userIdx + 1));
    } else {
      if (!input.trim() || generating) return;
      userContent = input.trim();
      msgId = crypto.randomUUID();

      const userMsg: PlaygroundMessage & { stats?: MessageStats } = {
        id: crypto.randomUUID(),
        role: "user",
        content: userContent,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
    }

    const assistantId = crypto.randomUUID();
    const assistantMsg: PlaygroundMessage & { stats?: MessageStats } = {
      id: assistantId,
      role: "assistant",
      content: "",
      model: modelName,
      timestamp: Date.now(),
    };

    setGenerating(true);
    setMessages((prev) => [...prev, assistantMsg]);
    onStreamingChange?.(true);
    scrollToBottom();

    const startTime = Date.now();
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/playground/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: providerType,
          model_name: modelName,
          temperature,
          max_tokens: 2048,
          system_prompt: systemPrompt,
          user_message: userContent,
        }),
        signal: abortRef.current.signal,
      });

      const data = await res.json();
      const latency = Date.now() - startTime;

      if (data.success) {
        const content = data.response || "";
        const tokens = data.tokens_used ?? 0;
        const tokPerSec = tokens > 0 ? (tokens / (latency / 1000)) : 0;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content,
                  model: data.model || modelName,
                  tokens_used: tokens,
                  latency_ms: latency,
                  stats: { tokens, latency_ms: latency, tokens_per_sec: tokPerSec },
                }
              : m
          )
        );

        onTokenUpdate?.(tokens);
        onLatencyUpdate?.(latency);
        onRequestComplete?.(tokens, latency);
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Lỗi: ${data.error || data.message || "Unknown error"}` }
              : m
          )
        );
        toast.error(data.error || data.message || "Lỗi khi tạo nội dung");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: "(Đã dừng)" } : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Lỗi: ${(err as Error).message || "Network error"}` }
              : m
          )
        );
      }
    } finally {
      setGenerating(false);
      onStreamingChange?.(false);
      scrollToBottom();
    }
  }, [input, generating, providerType, modelName, temperature, systemPrompt, messages, onTokenUpdate, onLatencyUpdate, onRequestComplete, onStreamingChange, scrollToBottom, taskRoutes]);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Đã copy!");
  };

  const handleClear = () => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    onTokenUpdate?.(0);
    onLatencyUpdate?.(0);
    toast.info("Đã xóa lịch sử");
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setGenerating(false);
    onStreamingChange?.(false);
  };

  // Compute totals
  const totalTokens = messages.reduce((sum, m) => sum + (m.tokens_used ?? 0), 0);
  const totalLatency = messages.reduce((sum, m) => sum + (m.latency_ms ?? 0), 0);
  const messageCount = messages.filter((m) => m.role === "user").length;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar: stats + actions */}
      <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/20 shrink-0">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 font-mono">
            <Zap className="size-3" />
            {modelName || "—"}
          </span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1">
            <Hash className="size-3" />
            {totalTokens.toLocaleString()} tokens
          </span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {totalLatency}ms
          </span>
          <span className="text-border">|</span>
          <span>{messageCount} msg</span>
        </div>

          <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 h-7 text-[11px]"
            onClick={() => setShowSystem(!showSystem)}
          >
            {showSystem ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            System
          </Button>
          {taskRoutes.length > 0 && (
            <Button
              variant={appliedRouting ? "secondary" : "ghost"}
              size="sm"
              className="gap-1 h-7 text-[11px]"
              onClick={() => {
                if (appliedRouting) {
                  setAppliedRouting(false);
                  toast.info("Đã hủy sử dụng Task Routing config");
                } else {
                  // Find a route with highest priority to use
                  const sorted = [...taskRoutes].sort((a, b) => a.task_type.localeCompare(b.task_type));
                  if (sorted[0]) {
                    const route = sorted[0];
                    setSystemPrompt(DEFAULT_VI_SYSTEM_PROMPT);
                    setAppliedRouting(true);
                    toast.success(`Đã áp dụng config từ Task Routing: ${route.provider_type}/${route.model_name}`);
                  }
                }
              }}
            >
              <Route className="size-3" />
              Use Routing
            </Button>
          )}
          {messages.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 h-7 text-[11px]"
              onClick={() => handleGenerate(true)}
              disabled={generating}
            >
              <RotateCcw className="size-3" />
              Regenerate
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 h-7 text-[11px]"
            onClick={handleClear}
          >
            <Trash2 className="size-3" />
            Xóa
          </Button>
        </div>
      </div>

      {/* System prompt */}
      {showSystem && (
        <div className="px-4 py-2 border-b bg-muted/10 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="size-3 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground">System Prompt</span>
            <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-400 ml-1">
              <AlertTriangle className="size-2.5 mr-1" />
              Chỉ dùng test tạm thời
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px] ml-auto"
              onClick={() => setEditingSystemPrompt(!editingSystemPrompt)}
            >
              {editingSystemPrompt ? "Thu gọn" : "Sửa"}
            </Button>
          </div>
          {editingSystemPrompt ? (
            <div className="space-y-2">
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="min-h-[80px] text-xs font-mono"
                placeholder="System prompt..."
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-7 text-[11px]"
                  onClick={() => {
                    if (onSaveAsTemplate) {
                      onSaveAsTemplate(systemPrompt);
                    } else {
                      toast.info("Đã copy system prompt. Vào tab System Prompt để lưu thành template.");
                      navigator.clipboard.writeText(systemPrompt);
                    }
                  }}
                >
                  <Save className="size-3" />
                  Save as Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-7 text-[11px]"
                  onClick={() => {
                    setSystemPrompt(DEFAULT_VI_SYSTEM_PROMPT);
                    toast.info("Đã đặt lại về system prompt mặc định tiếng Việt");
                  }}
                >
                  Reset về mặc định
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground font-mono line-clamp-2 leading-relaxed">
              {systemPrompt}
            </p>
          )}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="space-y-4 p-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Zap className="size-10 opacity-15 mb-3" />
              <p className="text-sm font-medium">AI Playground</p>
              <p className="text-xs mt-1 opacity-70">
                Nhập prompt bên dưới để test AI response
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <PlaygroundMsg key={msg.id} msg={msg} onCopy={handleCopy} />
          ))}
          {generating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground pl-2">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-xs">AI đang trả lời...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div className="border-t p-4 shrink-0 bg-card">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập prompt để test AI..."
            className="min-h-[60px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate(false);
              }
            }}
            disabled={generating}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono">
              temp={typeof temperature === "number" ? temperature.toFixed(1) : "0.7"}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {providerType}
            </Badge>
          </div>
          <div className="flex gap-2">
            {generating ? (
              <Button variant="outline" size="sm" onClick={handleStop} className="gap-1.5">
                <AlertTriangle className="size-3" />
                Dừng
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerate(false)}
                disabled={!input.trim()}
                className="gap-1.5"
              >
                <RotateCcw className="size-3" />
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => handleGenerate(false)}
              disabled={!input.trim() || generating}
              className="gap-1.5"
            >
              {generating ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Send className="size-3" />
              )}
              {generating ? "Đang tạo..." : "Gửi"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
