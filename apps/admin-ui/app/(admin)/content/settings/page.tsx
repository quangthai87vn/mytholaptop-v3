"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Eye,
  EyeOff,
  CheckCircle,
  Save,
  RotateCcw,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import type { AIProvider } from "@/types/content";

interface AISettingsData {
  provider: string;
  provider_id: number | null;
  provider_display_name: string;
  base_url: string;
  model_name: string;
  api_key: string;
  temperature: number;
  max_tokens: number;
  brand_voice: string;
  prompt_rules: string;
  safety_rules: string;
  is_active: boolean;
}

interface AIProviderOption {
  value: AIProvider;
  label: string;
  description: string;
}

const AI_PROVIDER_OPTIONS: AIProviderOption[] = [
  { value: "openai", label: "OpenAI", description: "GPT-4o, GPT-4o-mini - Manh nhat" },
  { value: "gemini", label: "Google Gemini", description: "Gemini 2.0 Flash - Nhanh va tiet kiem" },
  { value: "ollama", label: "Ollama (Local LLM)", description: "Chay model local - Mien phi, rieng tu. Mac dinh: localhost:11434" },
  { value: "lm_studio", label: "LM Studio (Local LLM)", description: "Chay model local qua LM Studio. Mac dinh: localhost:1234/v1" },
];

const TONE_OPTIONS = [
  { value: "professional", label: "Chuyen nghiep" },
  { value: "friendly", label: "Gan gui" },
  { value: "gen_z", label: "Gen Z" },
  { value: "technical", label: "Ky thuat" },
  { value: "premium", label: "Cao cap" },
];

function makeDefault(): AISettingsData {
  return {
    provider: "openai",
    provider_id: null,
    provider_display_name: "OpenAI",
    base_url: "https://api.openai.com/v1",
    model_name: "gpt-4o-mini",
    api_key: "",
    temperature: 0.7,
    max_tokens: 2048,
    brand_voice: "May Tinh My Tho la dai ly laptop uy tin tai Tien Giang.\n- Cham soc khach hang: Than thien, tan tam.\n- San pham: Chinh hang, gia tot.\n- Phong cach: Chuyen nghiep, hieu qua.",
    prompt_rules: "- Do dai: 150-400 tu.\n- Co hinh anh san pham.\n- Co CTA ro rang.\n- Su dung emoji phu hop.",
    safety_rules: "- Khong viet noi dung nhay cam.\n- Khong phan biet doi xu.\n- Khong du loi hua vuot kha nang.",
    is_active: true,
  };
}

export default function ContentSettingsPage() {
  const [settings, setSettings] = useState<AISettingsData>(makeDefault());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; duration_ms?: number } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/settings");
      if (res.ok) {
        const { data } = await res.json();
        if (data) {
          setSettings({
            provider: data.provider || "openai",
            provider_id: data.provider_id || null,
            provider_display_name: data.provider_display_name || "",
            base_url: data.base_url || "",
            model_name: data.model_name || "gpt-4o-mini",
            api_key: data.api_key || "",
            temperature: data.temperature ?? 0.7,
            max_tokens: data.max_tokens ?? 2048,
            brand_voice: data.brand_voice || makeDefault().brand_voice,
            prompt_rules: data.prompt_rules || makeDefault().prompt_rules,
            safety_rules: data.safety_rules || makeDefault().safety_rules,
            is_active: data.is_active ?? true,
          });
        }
      }
    } catch { /* use defaults */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const update = (field: keyof AISettingsData, value: string | number | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: settings.provider,
          base_url: settings.base_url,
          api_key: settings.api_key,
          model_name: settings.model_name,
        }),
      });
      const result = await res.json();
      setTestResult({ success: result.success, message: result.message, duration_ms: result.duration_ms });
      if (result.success) toast.success("Ket noi AI thanh cong!");
      else toast.error(result.message);
    } catch { toast.error("Loi khi test ket noi AI"); }
    finally { setTesting(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/ai/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_id: settings.provider_id,
          base_url: settings.base_url,
          model_name: settings.model_name,
          api_key: settings.api_key,
          temperature: settings.temperature,
          max_tokens: settings.max_tokens,
          brand_voice: settings.brand_voice,
          prompt_rules: settings.prompt_rules,
          safety_rules: settings.safety_rules,
          is_active: settings.is_active,
        }),
      });
      if (res.ok) {
        toast.success("Da luu cau hinh AI thanh cong!");
        setHasChanges(false);
        await loadSettings();
      } else {
        const err = await res.json();
        toast.error(err.error || "Loi khi luu cau hinh");
      }
    } catch { toast.error("Loi khi luu cau hinh"); }
    finally { setSaving(false); }
  };

  const handleReset = () => {
    setSettings(makeDefault());
    setHasChanges(true);
    setTestResult(null);
    toast.info("Da khoi phuc cau hinh mac dinh");
  };

  const selectedProvider = AI_PROVIDER_OPTIONS.find((p) => p.value === settings.provider);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cau hinh AI</h1>
          <p className="text-muted-foreground text-sm mt-1">Thiet lap AI provider va brand voice cho viec tao noi dung</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="size-4" />Khoi phuc
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Luu cau hinh
          </Button>
        </div>
      </div>

      {testResult && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${testResult.success ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {testResult.success ? <Wifi className="size-4 shrink-0" /> : <WifiOff className="size-4 shrink-0" />}
          <span className="font-medium">{testResult.message}</span>
          {testResult.duration_ms && <span className="text-xs opacity-70 ml-auto">{testResult.duration_ms}ms</span>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Provider Selection */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain className="size-5" />AI Provider</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {AI_PROVIDER_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => update("provider", p.value)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${settings.provider === p.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{p.label}</span>
                    {settings.provider === p.value && <CheckCircle className="size-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">API Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="baseUrl">Base URL</Label>
                <Input id="baseUrl" value={settings.base_url} onChange={(e) => update("base_url", e.target.value)} placeholder={selectedProvider?.value === "ollama" ? "http://localhost:11434" : selectedProvider?.value === "lm_studio" ? "http://localhost:1234/v1" : "https://api.openai.com/v1"} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelName">Model Name</Label>
                <Input id="modelName" value={settings.model_name} onChange={(e) => update("model_name", e.target.value)} placeholder="gpt-4o-mini" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="relative">
                  <Input id="apiKey" type={showApiKey ? "text" : "password"} value={settings.api_key} onChange={(e) => update("api_key", e.target.value)} placeholder="sk-... (neu co)" className="pr-10" />
                  <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  API key duoc ma hoa AES-256-GCM khi luu.
                  {(selectedProvider?.value === "ollama" || selectedProvider?.value === "lm_studio") ? " Local LLM khong can API key." : ""}
                </p>
              </div>
              <Button variant="outline" onClick={handleTest} disabled={testing} className="w-full gap-2">
                {testing ? <Loader2 className="size-4 animate-spin" /> : <Wifi className="size-4" />}
                {testing ? "Dang kiem tra..." : "Test Connection"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Settings */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Cai dat sinh noi dung</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Giong van mac dinh</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={settings.brand_voice ? "professional" : "professional"} onChange={() => {}}>
                    {TONE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Temperature <span className="text-xs text-muted-foreground">(Do sang tao)</span></Label>
                  <div className="space-y-1">
                    <input type="range" min="0" max="1" step="0.1" value={settings.temperature} onChange={(e) => update("temperature", parseFloat(e.target.value))} className="w-full" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Chinh xac (0)</span>
                      <span className="font-mono">{settings.temperature}</span>
                      <span>Sang tao (1)</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Max Tokens <span className="text-xs text-muted-foreground">(So tu toi da)</span></Label>
                <div className="flex items-center gap-3">
                  <input type="range" min="500" max="10000" step="500" value={settings.max_tokens} onChange={(e) => update("max_tokens", parseInt(e.target.value))} className="flex-1" />
                  <span className="text-sm font-mono bg-muted px-3 py-1 rounded min-w-[80px] text-center">{settings.max_tokens}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Brand Voice</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Giong dieu thuong hieu</Label>
                <Textarea value={settings.brand_voice} onChange={(e) => update("brand_voice", e.target.value)} className="min-h-[120px]" placeholder="Mo ta giong dieu thuong hieu..." />
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => update("brand_voice", settings.brand_voice + "\n- Mau sac: Do, Trang, Den")}>+ Mau sac</Badge>
                  <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => update("brand_voice", settings.brand_voice + "\n- Phong cach: Chuyen nghiep, than thien")}>+ Phong cach</Badge>
                  <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => update("brand_voice", settings.brand_voice + "\n- Doi tuong: Khach hang Viet Nam")}>+ Doi tuong</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Prompt Rules</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Quy tac viet prompt</Label>
                <Textarea value={settings.prompt_rules} onChange={(e) => update("prompt_rules", e.target.value)} className="min-h-[120px] font-mono text-sm" placeholder="Cac quy tac khi viet prompt cho AI..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Safety Rules</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Quy tac an toan</Label>
                <Textarea value={settings.safety_rules} onChange={(e) => update("safety_rules", e.target.value)} className="min-h-[120px] font-mono text-sm" placeholder="Cac quy tac an toan khi tao noi dung..." />
                <p className="text-xs text-muted-foreground">AI se tuan thu cac quy tac nay khi sinh noi dung.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
