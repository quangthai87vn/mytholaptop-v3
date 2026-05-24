"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Cpu, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TestPlayground } from "@/components/ai/TestPlayground";
import type { ProviderCard } from "@/types/ai-operating";

export default function AIPlaygroundPage() {
  const { data: providers = [] } = useQuery<ProviderCard[]>({
    queryKey: ["ai-providers-playground"],
    queryFn: async () => {
      const res = await fetch("/api/ai/providers?status=active");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data?.providers ?? json.data ?? [];
    },
    staleTime: 30_000,
  });

  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [temperature, setTemperature] = useState(0.7);

  // Auto-select first provider
  useEffect(() => {
    if (providers.length > 0 && !selectedProviderId) {
      setSelectedProviderId(String(providers[0].id));
    }
  }, [providers, selectedProviderId]);

  const selectedProvider = providers.find((p) => String(p.id) === selectedProviderId);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-card shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold">AI Playground</h1>
              <p className="text-xs text-muted-foreground">
                Kiểm tra AI responses — không ảnh hưởng nội dung thực
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Provider selector */}
            <div className="flex items-center gap-2">
              <Cpu className="size-3.5 text-muted-foreground" />
              <Select
                value={selectedProviderId}
                onValueChange={setSelectedProviderId}
              >
                <SelectTrigger className="h-8 w-[200px] text-xs">
                  <SelectValue placeholder="Chọn AI Engine..." />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <div className="flex items-center gap-2">
                        <span>{p.display_name || p.name || p.slug || p.type}</span>
                        {(p as any).is_active && (
                          <Badge variant="outline" className="text-[9px] h-4 border-green-300 text-green-600">
                            Active
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Temperature */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Temperature:</span>
              <Select
                value={String(temperature)}
                onValueChange={(v) => setTemperature(parseFloat(v))}
              >
                <SelectTrigger className="h-8 w-[100px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.1">0.1 — Precise</SelectItem>
                  <SelectItem value="0.3">0.3 — Balanced</SelectItem>
                  <SelectItem value="0.5">0.5 — Creative</SelectItem>
                  <SelectItem value="0.7">0.7 — Very Creative</SelectItem>
                  <SelectItem value="0.9">0.9 — Random</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Playground */}
      <div className="flex-1 overflow-hidden">
        {selectedProvider ? (
          <TestPlayground
            providerType={
              (selectedProvider as any).type ||
              (selectedProvider as any).slug ||
              ""
            }
            modelName={
              (selectedProvider as any).model_name ||
              (selectedProvider as any).default_model ||
              ""
            }
            temperature={temperature}
            taskRoutes={[]}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center size-12 rounded-full bg-muted mx-auto">
                <Cpu className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Chưa có AI Engine</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Vui lòng thêm và kích hoạt AI Engine tại{" "}
                  <a href="/content/settings" className="text-primary underline">
                    AI Operating Center
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
