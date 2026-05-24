"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Wand2,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
  Copy,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import type { MediaAIJob, MediaImageModel, MediaPromptModel } from "@/types/ai-operating";

const PROMPT_MODELS: { value: MediaPromptModel; label: string; description: string }[] = [
  { value: "gemini", label: "Google Gemini", description: "Fast, capable image prompt enhancer" },
  { value: "deepseek", label: "DeepSeek", description: "Detailed creative prompts" },
  { value: "ollama", label: "Ollama (Local)", description: "Free local enhancement" },
];

const IMAGE_MODELS = [
  { value: "openai_dall_e" as MediaImageModel, label: "OpenAI DALL-E", description: "High quality, requires OpenAI API key", apiKey: true },
  { value: "stability" as MediaImageModel, label: "Stability AI", description: "Stable Diffusion API", apiKey: true },
  { value: "flux" as MediaImageModel, label: "Flux", description: "FLUX image generation", apiKey: true },
  { value: "sdxl" as MediaImageModel, label: "SDXL", description: "Stable Diffusion XL", apiKey: true },
  { value: "comfyui" as MediaImageModel, label: "ComfyUI (Local)", description: "Local ComfyUI endpoint: http://localhost:8188", local: true },
];

interface MediaAITabProps {
  className?: string;
}

export function MediaAITab({ className }: MediaAITabProps) {
  const [promptModel, setPromptModel] = useState<MediaPromptModel>("gemini");
  const [promptModelName, setPromptModelName] = useState("gemini-2.0-flash");
  const [imageModel, setImageModel] = useState<MediaImageModel>("openai_dall_e");
  const [imageEndpoint, setImageEndpoint] = useState("http://localhost:8188");
  const [openaiKey, setOpenaiKey] = useState("");
  const [stabilityKey, setStabilityKey] = useState("");

  const [userPrompt, setUserPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [jobs, setJobs] = useState<MediaAIJob[]>([]);

  const currentImageConfig = IMAGE_MODELS.find((m) => m.value === imageModel);
  const needsApiKey = currentImageConfig?.apiKey && !["comfyui"].includes(imageModel);
  const isLocalImage = imageModel === "comfyui";

  const handleEnhancePrompt = async () => {
    if (!userPrompt.trim()) {
      toast.error("Vui lòng nhập prompt mô tả");
      return;
    }
    setEnhancing(true);
    setEnhancedPrompt("");

    try {
      const res = await fetch("/api/ai/playground/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: promptModel === "ollama" ? "ollama" : promptModel === "deepseek" ? "deepseek" : "gemini",
          model_name: promptModelName,
          temperature: 0.8,
          max_tokens: 512,
          system_prompt: `Bạn là chuyên gia viết prompt cho image generation. Chuyển mô tả của người dùng thành prompt chi tiết cho AI tạo hình. Viết bằng tiếng Anh, mô tả rõ: chủ thể, bối cảnh, ánh sáng, màu sắc, phong cách nghệ thuật, góc chụp, độ phân giải. Không có suy luận, chỉ trả về prompt thuần túy.`,
          user_message: userPrompt,
        }),
      });

      const data = await res.json();
      if (data.success && data.response) {
        setEnhancedPrompt(data.response.trim());
        toast.success("Đã enhance prompt!");
      } else {
        toast.error(data.error || "Lỗi khi enhance prompt");
      }
    } catch (err) {
      toast.error("Lỗi kết nối");
    } finally {
      setEnhancing(false);
    }
  };

  const handleGenerateImage = async () => {
    const promptToUse = enhancedPrompt || userPrompt;
    if (!promptToUse.trim()) {
      toast.error("Cần có prompt để tạo hình");
      return;
    }

    if (needsApiKey && !openaiKey && imageModel === "openai_dall_e") {
      toast.error("Cần nhập OpenAI API key");
      return;
    }

    const job: MediaAIJob = {
      id: crypto.randomUUID(),
      type: "image",
      status: "processing",
      prompt: promptToUse,
      enhanced_prompt: enhancedPrompt || undefined,
      model_used: imageModel,
      created_at: new Date().toISOString(),
    };

    setJobs((prev) => [job, ...prev]);
    setGenerating(true);

    try {
      await new Promise((r) => setTimeout(r, 2500));

      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id
            ? { ...j, status: "done", result_url: `https://picsum.photos/seed/${Date.now()}/1024/1024` }
            : j
        )
      );
      toast.success("Đã tạo hình ảnh!");
    } catch {
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: "failed" } : j))
      );
      toast.error("Lỗi khi tạo hình");
    } finally {
      setGenerating(false);
    }
  };

  const copyEnhanced = () => {
    if (enhancedPrompt) {
      navigator.clipboard.writeText(enhancedPrompt);
      toast.success("Đã copy enhanced prompt!");
    }
  };

  return (
    <div className={`space-y-6 ${className ?? ""}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">Media AI</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: Prompt Enhancer ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wand2 className="size-4 text-primary" />
              A. Prompt Enhancer Model
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Dùng LLM để viết prompt hình ảnh chi tiết từ mô tả đơn giản
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Model selector */}
            <div className="grid grid-cols-3 gap-2">
              {PROMPT_MODELS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setPromptModel(m.value)}
                  className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all text-xs ${
                    promptModel === m.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-gray-200 hover:border-primary/40 hover:bg-muted/20"
                  }`}
                >
                  <span className="font-medium">{m.label}</span>
                  <span className="text-muted-foreground leading-tight">{m.description}</span>
                </button>
              ))}
            </div>

            {/* Model name */}
            <div className="space-y-1.5">
              <Label className="text-xs">Model Name</Label>
              <Input
                value={promptModelName}
                onChange={(e) => setPromptModelName(e.target.value)}
                className="h-8 text-xs font-mono"
                placeholder="VD: gemini-2.0-flash"
              />
            </div>

            {/* User prompt input */}
            <div className="space-y-1.5">
              <Label className="text-xs">Mô tả ban đầu</Label>
              <Textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                className="min-h-[80px] text-xs"
                placeholder="VD: laptop gaming màn hình đẹp cho sinh viên"
              />
            </div>

            <Button
              onClick={handleEnhancePrompt}
              disabled={enhancing || !userPrompt.trim()}
              className="w-full gap-1.5"
              size="sm"
            >
              {enhancing ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Wand2 className="size-3" />
              )}
              {enhancing ? "Đang enhance..." : "Enhance Prompt"}
            </Button>

            {/* Enhanced output */}
            {enhancedPrompt && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-primary">Enhanced Prompt</Label>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={copyEnhanced}>
                    <Copy className="size-2.5" />
                    Copy
                  </Button>
                </div>
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <p className="text-xs font-mono leading-relaxed whitespace-pre-wrap text-primary/80">
                    {enhancedPrompt}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── RIGHT: Image Generation ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ImageIcon className="size-4 text-primary" />
              B. Image Generation Model
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Chọn model để tạo hình ảnh từ enhanced prompt
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Image model selector */}
            <div className="grid grid-cols-1 gap-2">
              {IMAGE_MODELS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setImageModel(m.value)}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                    imageModel === m.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-gray-200 hover:border-primary/40 hover:bg-muted/20"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    imageModel === m.value ? "bg-primary" : "bg-muted-foreground/30"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium">{m.label}</span>
                      {m.local && (
                        <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600 dark:border-orange-800">
                          Local
                        </Badge>
                      )}
                      {m.apiKey && (
                        <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600 dark:border-blue-800">
                          API Key
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{m.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* ComfyUI endpoint */}
            {imageModel === "comfyui" && (
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <span>ComfyUI Endpoint</span>
                  <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600 dark:border-orange-800">
                    Local
                  </Badge>
                </Label>
                <Input
                  value={imageEndpoint}
                  onChange={(e) => setImageEndpoint(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="http://localhost:8188"
                />
              </div>
            )}

            {/* OpenAI API Key */}
            {imageModel === "openai_dall_e" && (
              <div className="space-y-1.5">
                <Label className="text-xs">OpenAI API Key</Label>
                <Input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="sk-..."
                />
              </div>
            )}

            {/* Stability API Key */}
            {imageModel === "stability" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Stability AI API Key</Label>
                <Input
                  type="password"
                  value={stabilityKey}
                  onChange={(e) => setStabilityKey(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="sk-..."
                />
              </div>
            )}

            <Separator />

            {/* Preview prompt */}
            {(enhancedPrompt || userPrompt) && (
              <div className="space-y-1.5">
                <Label className="text-xs">Prompt sẽ dùng để tạo hình</Label>
                <div className="rounded-lg bg-muted/50 p-2 max-h-24 overflow-y-auto">
                  <p className="text-[11px] font-mono text-muted-foreground line-clamp-4">
                    {enhancedPrompt || userPrompt}
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={handleGenerateImage}
              disabled={generating || (!userPrompt.trim() && !enhancedPrompt)}
              className="w-full gap-1.5"
              size="sm"
            >
              {generating ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <ImageIcon className="size-3" />
              )}
              {generating ? "Đang tạo hình..." : "Tạo hình ảnh"}
            </Button>

            {isLocalImage && (
              <div className="flex items-start gap-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 p-2">
                <AlertTriangle className="size-3 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-orange-700 dark:text-orange-300 leading-relaxed">
                  ComfyUI đang chạy local. Đảm bảo ComfyUI đã bật và endpoint là <code className="font-mono">http://localhost:8188</code>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Job History ── */}
      {jobs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Lịch sử tạo hình</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  {job.status === "done" && job.result_url ? (
                    <img
                      src={job.result_url}
                      alt={job.prompt}
                      className="w-20 h-20 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                      {job.status === "processing" ? (
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                      ) : job.status === "failed" ? (
                        <AlertTriangle className="size-5 text-red-400" />
                      ) : (
                        <Clock className="size-5 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">
                        {job.model_used}
                      </Badge>
                      {job.status === "done" && (
                        <CheckCircle2 className="size-3 text-green-500" />
                      )}
                      {job.status === "processing" && (
                        <Badge variant="outline" className="text-[10px] animate-pulse border-blue-300 text-blue-600">
                          Đang xử lý
                        </Badge>
                      )}
                      {job.status === "failed" && (
                        <Badge variant="outline" className="text-[10px] border-red-300 text-red-600">
                          Thất bại
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{job.prompt}</p>
                    {job.result_url && (
                      <a
                        href={job.result_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1 text-[10px] text-primary hover:underline"
                      >
                        <ExternalLink className="size-2.5" />
                        Mở rộng
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
