"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Globe,
  Key,
  Database,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Palette,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { defaultSettings } from "@/lib/mock-data";
import { loadSettings, saveSettings } from "@/lib/settings-storage";
import { saveCompanySettings } from "@/lib/company-settings";
import { BrandVoiceEditor } from "@/components/ai/BrandVoiceEditor";
import type { Settings } from "@/types";
import type { BrandVoice, BrandPreset } from "@/types/ai-operating";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Brand voices state
  const [brandVoices, setBrandVoices] = useState<BrandVoice[]>([]);
  const [activeBrandPreset, setActiveBrandPreset] = useState<BrandPreset | null>(null);
  const [savingBV, setSavingBV] = useState(false);
  const [activatingBV, setActivatingBV] = useState(false);

  // Load settings from server on mount
  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setIsLoaded(true);
    });
  }, []);

  // Load brand voices
  useEffect(() => {
    if (!isLoaded) return;
    Promise.all([
      fetch("/api/ai/brand-voices").then((r) => r.json()),
    ]).then(([bvData]) => {
      const voices = (bvData.data || []) as BrandVoice[];
      setBrandVoices(voices);
      const active = voices.find((v) => v.is_active);
      if (active) setActiveBrandPreset(active.preset as BrandPreset);
    });
  }, [isLoaded]);

  // Save brand voice
  const handleSaveBrandVoice = useCallback(async (preset: BrandPreset, data: Partial<BrandVoice>) => {
    setSavingBV(true);
    try {
      const res = await fetch("/api/ai/brand-voices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset, ...data }),
      });
      if (res.ok) {
        const { data: saved } = await res.json() as { data: BrandVoice };
        setBrandVoices((prev) => prev.map((b) => (b.preset === preset ? saved : b)));
        toast.success("Đã lưu brand voice!");
      }
    } finally {
      setSavingBV(false);
    }
  }, []);

  // Activate brand voice
  const handleActivateBrandVoice = useCallback(async (preset: BrandPreset) => {
    setActivatingBV(true);
    try {
      const res = await fetch("/api/ai/brand-voices/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset }),
      });
      if (res.ok) {
        setActiveBrandPreset(preset);
        setBrandVoices((prev) =>
          prev.map((b) => ({ ...b, is_active: b.preset === preset }))
        );
        toast.success("Đã kích hoạt brand voice!");
      }
    } finally {
      setActivatingBV(false);
    }
  }, []);

  const toggleSecret = (key: string) => {
    setShowSecret((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // Save full settings to server (existing behavior)
      await saveSettings(settings);
      // Also persist company branding to localStorage for instant sidebar update
      saveCompanySettings({
        name: settings.company.name,
        logoUrl: settings.company.logoUrl,
        website: settings.company.website,
        phone: settings.company.phone,
        address: settings.company.address,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError("Không thể lưu cài đặt. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const handleFetchToken = useCallback(async () => {
    const { adminEmail, adminPassword, backendUrl } = settings.medusa;
    if (!adminEmail || !adminPassword || !backendUrl) {
      setSaveError("Vui lòng nhập đầy đủ Email, Password và Backend URL.");
      return;
    }
    setIsFetchingToken(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backendUrl,
          email: adminEmail,
          password: adminPassword,
        }),
      });
      const data = await res.json();
      if (data.token) {
        setSettings((prev) => ({
          ...prev,
          medusa: { ...prev.medusa, adminApiKey: data.token },
        }));
      } else {
        setSaveError(data.error || "Không lấy được JWT Token. Vui lòng kiểm tra email/password và Backend URL.");
      }
    } catch {
      setSaveError("Không kết nối được Medusa Backend. Vui lòng kiểm tra Medusa đang chạy và Backend URL.");
    } finally {
      setIsFetchingToken(false);
    }
  }, [settings.medusa]);

  const updateServerSettings = useCallback((path: string, value: string | boolean) => {
    setSettings((prev) => {
      const next = { ...prev };
      const keys = path.split(".");
      let current: Record<string, unknown> = next;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...(current[keys[i]] as Record<string, unknown>) };
        current = current[keys[i]] as Record<string, unknown>;
      }
      current[keys[keys.length - 1]] = value;
      return next;
    });
  }, []);

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-96 animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cài đặt</h1>
          <p className="text-muted-foreground">
            Cấu hình hệ thống và thông tin cửa hàng.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className={cn(saved && "bg-green-600 hover:bg-green-600")}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Đang lưu...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="mr-2 size-4" />
              Đã lưu!
            </>
          ) : (
            <>
              <Save className="mr-2 size-4" />
              Lưu thay đổi
            </>
          )}
        </Button>
      </div>
      {saveError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <AlertCircle className="size-4" />
          {saveError}
        </div>
      )}

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">
            <Building2 className="mr-2 size-4" />
            Thông tin công ty
          </TabsTrigger>
          <TabsTrigger value="woocommerce">
            <Globe className="mr-2 size-4" />
            WooCommerce
          </TabsTrigger>
          <TabsTrigger value="medusa">
            <Database className="mr-2 size-4" />
            Medusa
          </TabsTrigger>
        </TabsList>

        {/* Company info */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin công ty</CardTitle>
              <CardDescription>
                Thông tin cơ bản của cửa hàng
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Tên công ty</Label>
                  <Input
                    id="company-name"
                    value={settings.company.name}
                    onChange={(e) => updateServerSettings("company.name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-website">Website</Label>
                  <Input
                    id="company-website"
                    placeholder="https://mytholaptop.vn"
                    value={settings.company.website}
                    onChange={(e) => updateServerSettings("company.website", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Số điện thoại</Label>
                  <Input
                    id="company-phone"
                    placeholder="0273.123.456"
                    value={settings.company.phone}
                    onChange={(e) => updateServerSettings("company.phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-logo">Logo URL</Label>
                  <Input
                    id="company-logo"
                    placeholder="https://example.com/logo.png"
                    value={settings.company.logoUrl}
                    onChange={(e) => updateServerSettings("company.logoUrl", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-address">Địa chỉ</Label>
                <Input
                  id="company-address"
                  placeholder="123 Nguyễn Trãi, P.1, TP. Mỹ Tho, Tiền Giang"
                  value={settings.company.address}
                  onChange={(e) => updateServerSettings("company.address", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WooCommerce */}
        <TabsContent value="woocommerce">
          <Card>
            <CardHeader>
              <CardTitle>Cấu hình WooCommerce</CardTitle>
              <CardDescription>
                Kết nối WordPress/WooCommerce để migration dữ liệu. Cấu hình ở đây sẽ
                được sử dụng lại tại trang Migration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="woo-url">WordPress API URL</Label>
                <Input
                  id="woo-url"
                  placeholder="https://mytholaptop.vn/wp-json"
                  value={settings.wooCommerce.wordpressUrl}
                  onChange={(e) =>
                    updateServerSettings("wooCommerce.wordpressUrl", e.target.value)
                  }
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="woo-key">Consumer Key</Label>
                <div className="relative">
                  <Input
                    id="woo-key"
                    type={showSecret.wooKey ? "text" : "password"}
                    placeholder="ck_xxxxxxxxxxxxxxxx"
                    value={settings.wooCommerce.consumerKey}
                    onChange={(e) =>
                      updateServerSettings("wooCommerce.consumerKey", e.target.value)
                    }
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                    onClick={() => toggleSecret("wooKey")}
                  >
                    {showSecret.wooKey ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="woo-secret">Consumer Secret</Label>
                <div className="relative">
                  <Input
                    id="woo-secret"
                    type={showSecret.wooSecret ? "text" : "password"}
                    placeholder="cs_xxxxxxxxxxxxxxxx"
                    value={settings.wooCommerce.consumerSecret}
                    onChange={(e) =>
                      updateServerSettings("wooCommerce.consumerSecret", e.target.value)
                    }
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                    onClick={() => toggleSecret("wooSecret")}
                  >
                    {showSecret.wooSecret ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medusa */}
        <TabsContent value="medusa">
          <div className="space-y-6">
            {/* Login credentials - dùng để lấy JWT */}
            <Card>
              <CardHeader>
                <CardTitle>Đăng nhập Medusa Admin</CardTitle>
                <CardDescription>
                  Nhập email và password để lấy JWT Token tự động. Token sẽ được
                  dùng cho các thao tác migration.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="medusa-email">Email Admin</Label>
                    <Input
                      id="medusa-email"
                      type="email"
                      placeholder="admin@mytholaptop.vn"
                      value={settings.medusa.adminEmail}
                      onChange={(e) =>
                        updateServerSettings("medusa.adminEmail", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medusa-password">Password Admin</Label>
                    <div className="relative">
                      <Input
                        id="medusa-password"
                        type={showSecret.medusaPassword ? "text" : "password"}
                        placeholder="Nhập password"
                        value={settings.medusa.adminPassword}
                        onChange={(e) =>
                          updateServerSettings("medusa.adminPassword", e.target.value)
                        }
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                        onClick={() => toggleSecret("medusaPassword")}
                      >
                        {showSecret.medusaPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medusa-url">Medusa Backend URL</Label>
                  <Input
                    id="medusa-url"
                    placeholder="http://localhost:9000"
                    value={settings.medusa.backendUrl}
                    onChange={(e) =>
                      updateServerSettings("medusa.backendUrl", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medusa-key">
                    <Key className="inline mr-1 size-3" />
                    JWT Token (Admin API Key)
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="medusa-key"
                        type={showSecret.medusaKey ? "text" : "password"}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={settings.medusa.adminApiKey}
                        onChange={(e) =>
                          updateServerSettings("medusa.adminApiKey", e.target.value)
                        }
                        className="pr-10 font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                        onClick={() => toggleSecret("medusaKey")}
                      >
                        {showSecret.medusaKey ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={handleFetchToken}
                      disabled={isFetchingToken}
                    >
                      {isFetchingToken ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Key className="size-4" />
                      )}
                      Lấy Token
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Nhấn <strong>Lấy Token</strong> để tạo JWT từ Medusa Admin (bắt đầu bằng <code className="rounded bg-muted px-1">eyJ</code>, có 3 phần ngăn cách bởi dấu <code className="rounded bg-muted px-1">.</code>). Sau đó bấm <strong>Lưu thay đổi</strong> để lưu lại.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
