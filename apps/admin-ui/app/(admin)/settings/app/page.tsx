"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Building2,
  Database,
  Globe,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  Loader2,
  Wifi,
  WifiOff,
  Package,
  Info,
  ArrowRight,
  RefreshCcw,
  CheckSquare,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { adminFetch } from "@/lib/api/admin-fetch";

/* ── Types ──────────────────────────────────────────────── */

interface MedusaSettings {
  backendUrl: string;
  adminApiKey: string;
  adminEmail: string;
  adminPassword: string;
}

interface WooSettings {
  wordpressUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

interface CompanySettings {
  name: string;
  website: string;
  phone: string;
  logoUrl: string;
  address: string;
}

interface AppSettings {
  medusa: MedusaSettings;
  wooCommerce: WooSettings;
  company: CompanySettings;
  product_data_source: "medusa" | "woocommerce";
}

type ConnectionStatus = "unknown" | "checking" | "connected" | "error";
type ProductDataSource = "medusa" | "woocommerce";

/* ── Default state ─────────────────────────────────────── */

const defaultSettings: AppSettings = {
  medusa: { backendUrl: "", adminApiKey: "", adminEmail: "", adminPassword: "" },
  wooCommerce: { wordpressUrl: "", consumerKey: "", consumerSecret: "" },
  company: { name: "", website: "", phone: "", logoUrl: "", address: "" },
  product_data_source: "woocommerce",
};

/* ── Component ────────────────────────────────────────── */

export default function SettingsAppPage() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Per-tab save state
  const [savingCompany, setSavingCompany] = useState(false);
  const [savedCompany, setSavedCompany] = useState(false);
  const [savingSource, setSavingSource] = useState(false);
  const [savedSource, setSavedSource] = useState(false);
  const [savingMedusa, setSavingMedusa] = useState(false);
  const [savedMedusa, setSavedMedusa] = useState(false);
  const [savingWoo, setSavingWoo] = useState(false);
  const [savedWoo, setSavedWoo] = useState(false);

  // Fetching token
  const [fetchingToken, setFetchingToken] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Connection status
  const [medusaStatus, setMedusaStatus] = useState<ConnectionStatus>("unknown");
  const [wooStatus, setWooStatus] = useState<ConnectionStatus>("unknown");
  const [medusaStatusMsg, setMedusaStatusMsg] = useState("");
  const [wooStatusMsg, setWooStatusMsg] = useState("");

  // Sentinel value
  const ENCRYPTED_SENTINEL = "__ENCRYPTED__";
  const isEncrypted = (v: string) => v === ENCRYPTED_SENTINEL;

  /* ── Load settings ──────────────────────────────────── */

  const loadSettings = useCallback(async () => {
    setIsLoaded(false);
    try {
      const data: AppSettings = await adminFetch("/api/settings").then((r) => r.json());
      setSettings((prev) => {
        const merged = { ...prev };
        if (data.medusa) {
          merged.medusa = {
            backendUrl: data.medusa.backendUrl || prev.medusa.backendUrl,
            adminApiKey: isEncrypted(data.medusa.adminApiKey)
              ? prev.medusa.adminApiKey
              : data.medusa.adminApiKey || prev.medusa.adminApiKey,
            adminEmail: data.medusa.adminEmail || prev.medusa.adminEmail,
            adminPassword: isEncrypted(data.medusa.adminPassword)
              ? prev.medusa.adminPassword
              : data.medusa.adminPassword || prev.medusa.adminPassword,
          };
        }
        if (data.wooCommerce) {
          merged.wooCommerce = {
            wordpressUrl: data.wooCommerce.wordpressUrl || prev.wooCommerce.wordpressUrl,
            consumerKey: data.wooCommerce.consumerKey || prev.wooCommerce.consumerKey,
            consumerSecret: data.wooCommerce.consumerSecret || prev.wooCommerce.consumerSecret,
          };
        }
        if (data.company) merged.company = { ...prev.company, ...data.company };
        if (data.product_data_source) merged.product_data_source = data.product_data_source;
        return merged;
      });
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /* ── Field updater ──────────────────────────────────── */

  const updateField = useCallback((
    section: keyof AppSettings,
    field: string,
    value: string
  ) => {
    setSettings((prev) => {
      const sectionData = prev[section] as unknown as Record<string, unknown>;
      return {
        ...prev,
        [section]: { ...sectionData, [field]: value },
      };
    });
    if (section === "medusa") {
      setMedusaStatus("unknown");
      setMedusaStatusMsg("");
    }
    if (section === "wooCommerce") {
      setWooStatus("unknown");
      setWooStatusMsg("");
    }
  }, []);

  /* ── Toggle secret ─────────────────────────────────── */

  const toggleSecret = (key: string) => {
    setShowSecret((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* ── Save: Company ─────────────────────────────────── */

  const handleSaveCompany = useCallback(async () => {
    setSavingCompany(true);
    try {
      const res = await adminFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: settings.company }),
      });
      if (res.ok) {
        setSavedCompany(true);
        setTimeout(() => setSavedCompany(false), 3000);
        toast.success("Đã lưu thông tin công ty!");
        try {
          const current = JSON.parse(localStorage.getItem("mtl-company-settings") || "{}");
          localStorage.setItem("mtl-company-settings", JSON.stringify({ ...current, ...settings.company }));
        } catch { /* ignore */ }
        window.dispatchEvent(new CustomEvent("company-settings-changed", { detail: settings.company }));
      } else {
        const err = await handleSaveError(res, "Lỗi khi lưu thông tin công ty.");
        toast.error(err);
      }
    } catch {
      toast.error("Không thể lưu. Vui lòng thử lại.");
    } finally {
      setSavingCompany(false);
    }
  }, [settings.company]);

  /* ── Save: Product Data Source ─────────────────────── */

  const handleSaveSource = useCallback(async () => {
    setSavingSource(true);
    try {
      const res = await adminFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_data_source: { source: settings.product_data_source } }),
      });
      if (res.ok) {
        setSavedSource(true);
        setTimeout(() => setSavedSource(false), 3000);
        const label = settings.product_data_source === "medusa" ? "Medusa Backend" : "WooCommerce API trực tiếp";
        toast.success(`Đã chọn nguồn dữ liệu: ${label}`);
      } else {
        const err = await handleSaveError(res, "Lỗi khi lưu nguồn dữ liệu.");
        toast.error(err);
      }
    } catch {
      toast.error("Không thể lưu. Vui lòng thử lại.");
    } finally {
      setSavingSource(false);
    }
  }, [settings.product_data_source]);

  /* ── Save: Medusa ──────────────────────────────────── */

  const handleSaveMedusa = useCallback(async () => {
    setSavingMedusa(true);
    try {
      const payload: Record<string, string> = {};
      if (settings.medusa.backendUrl) payload.backendUrl = settings.medusa.backendUrl;
      if (settings.medusa.adminApiKey && settings.medusa.adminApiKey !== ENCRYPTED_SENTINEL) {
        payload.adminApiKey = settings.medusa.adminApiKey;
      }
      if (settings.medusa.adminEmail) payload.adminEmail = settings.medusa.adminEmail;
      if (settings.medusa.adminPassword && settings.medusa.adminPassword !== ENCRYPTED_SENTINEL) {
        payload.adminPassword = settings.medusa.adminPassword;
      }
      const res = await adminFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medusa: payload }),
      });
      if (res.ok) {
        setSavedMedusa(true);
        setTimeout(() => setSavedMedusa(false), 3000);
        toast.success("Đã lưu cấu hình Medusa!");
        await loadSettings();
        const statusRes = await adminFetch("/api/medusa/status");
        if (statusRes.ok) {
          const statusData = await statusRes.json() as Record<string, unknown>;
          if (statusData.configured) {
            setMedusaStatus("connected");
            setMedusaStatusMsg(
              (statusData.message as string || "Đã kết nối Medusa.") +
              ((statusData as Record<string, unknown>).productCount !== undefined
                ? ` (${(statusData as Record<string, unknown>).productCount}+ sản phẩm)`
                : "")
            );
          }
        }
      } else {
        const err = await handleSaveError(res, "Lỗi khi lưu cấu hình Medusa.");
        toast.error(err);
      }
    } catch {
      toast.error("Không thể lưu. Vui lòng thử lại.");
    } finally {
      setSavingMedusa(false);
    }
  }, [settings.medusa, loadSettings]);

  /* ── Save: WooCommerce ──────────────────────────────── */

  const handleSaveWoo = useCallback(async () => {
    setSavingWoo(true);
    try {
      const payload: Record<string, string> = {};
      if (settings.wooCommerce.wordpressUrl) payload.wordpressUrl = settings.wooCommerce.wordpressUrl;
      if (settings.wooCommerce.consumerKey) payload.consumerKey = settings.wooCommerce.consumerKey;
      if (settings.wooCommerce.consumerSecret) payload.consumerSecret = settings.wooCommerce.consumerSecret;
      const res = await adminFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wooCommerce: payload }),
      });
      if (res.ok) {
        setSavedWoo(true);
        setTimeout(() => setSavedWoo(false), 3000);
        toast.success("Đã lưu cấu hình WooCommerce!");
      } else {
        const err = await handleSaveError(res, "Lỗi khi lưu cấu hình WooCommerce.");
        toast.error(err);
      }
    } catch {
      toast.error("Không thể lưu. Vui lòng thử lại.");
    } finally {
      setSavingWoo(false);
    }
  }, [settings.wooCommerce]);

  /* ── Error handler ──────────────────────────────────── */

  async function handleSaveError(res: Response, fallback: string): Promise<string> {
    let data: Record<string, unknown>;
    try {
      data = await res.json() as Record<string, unknown>;
    } catch {
      return fallback;
    }
    const code = data.code as string | undefined;
    if (code === "CSRF_INVALID") {
      return "CSRF token hết hạn. Trang sẽ được tải lại để lấy token mới.";
    }
    if (code === "FORBIDDEN") {
      return "Bạn không có quyền lưu cấu hình này.";
    }
    return (data.error as string) || fallback;
  }

  /* ── Fetch JWT token ─────────────────────────────────── */

  const handleFetchToken = useCallback(async () => {
    const { adminEmail, adminPassword, backendUrl } = settings.medusa;
    if (!adminEmail || !adminPassword || !backendUrl) {
      setFetchError("Vui lòng nhập Backend URL, Email và Password.");
      return;
    }
    setFetchingToken(true);
    setFetchError(null);
    try {
      const res = await adminFetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backendUrl, email: adminEmail, password: adminPassword }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (data.token) {
        updateField("medusa", "adminApiKey", data.token as string);
        toast.success("Đã lấy JWT Token!");
      } else {
        setFetchError((data.error as string) || "Không lấy được JWT Token.");
      }
    } catch {
      setFetchError("Không kết nối được Medusa Backend.");
    } finally {
      setFetchingToken(false);
    }
  }, [settings.medusa, updateField]);

  /* ── Test connection: Medusa ──────────────────────── */

  const handleTestMedusa = useCallback(async () => {
    setMedusaStatus("checking");
    setMedusaStatusMsg("");
    try {
      const res = await adminFetch("/api/settings/test-connection/medusa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings.medusa),
      });
      const data = await res.json() as Record<string, unknown>;
      if (data.connected) {
        setMedusaStatus("connected");
        const details = data.details as Record<string, unknown> | undefined;
        setMedusaStatusMsg(
          data.message as string +
            (details?.productCount !== undefined ? ` (${details.productCount}+ sản phẩm)` : "")
        );
        toast.success(data.message as string);
      } else {
        setMedusaStatus("error");
        setMedusaStatusMsg(data.message as string);
        toast.error(data.message as string);
      }
    } catch {
      setMedusaStatus("error");
      setMedusaStatusMsg("Không thể kiểm tra kết nối.");
    }
  }, [settings.medusa]);

  /* ── Test connection: WooCommerce ─────────────────── */

  const handleTestWoo = useCallback(async () => {
    setWooStatus("checking");
    setWooStatusMsg("");
    try {
      const res = await adminFetch("/api/settings/test-connection/woocommerce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings.wooCommerce),
      });
      const data = await res.json() as Record<string, unknown>;
      if (data.connected) {
        setWooStatus("connected");
        setWooStatusMsg(data.message as string);
        toast.success(data.message as string);
      } else {
        setWooStatus("error");
        setWooStatusMsg(data.message as string);
        toast.error(data.message as string);
      }
    } catch {
      setWooStatus("error");
      setWooStatusMsg("Không thể kiểm tra kết nối.");
    }
  }, [settings.wooCommerce]);

  /* ── Render ──────────────────────────────────────── */

  if (!isLoaded) {
    return (
      <div className="space-y-6 w-full">
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-96 animate-pulse rounded-md bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  const activeSource = settings.product_data_source;
  const isMedusaActive = activeSource === "medusa";

  return (
    <div className="space-y-6 w-full">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cấu hình ứng dụng</h1>
        <p className="text-muted-foreground mt-1">
          Quản lý thông tin công ty, nguồn dữ liệu sản phẩm và kết nối API.
        </p>
      </div>

      <Tabs defaultValue="company">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="company">
            <Building2 className="mr-2 size-4" />
            Thông tin công ty
          </TabsTrigger>
          <TabsTrigger value="source">
            <Database className="mr-2 size-4" />
            Nguồn dữ liệu sản phẩm
          </TabsTrigger>
          <TabsTrigger value="sync">
            <RefreshCcw className="mr-2 size-4" />
            Kiểm tra &amp; đồng bộ
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Thông tin công ty ─────────────────────── */}
        <TabsContent value="company" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin công ty</CardTitle>
              <CardDescription>
                Thông tin cơ bản hiển thị trên giao diện và báo cáo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Tên công ty</Label>
                  <Input
                    id="company-name"
                    value={settings.company.name}
                    onChange={(e) => updateField("company", "name", e.target.value)}
                    placeholder="Mỹ Tho Laptop"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-website">Website</Label>
                  <Input
                    id="company-website"
                    type="url"
                    placeholder="https://mytholaptop.vn"
                    value={settings.company.website}
                    onChange={(e) => updateField("company", "website", e.target.value)}
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
                    onChange={(e) => updateField("company", "phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-logo">Logo URL</Label>
                  <Input
                    id="company-logo"
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={settings.company.logoUrl}
                    onChange={(e) => updateField("company", "logoUrl", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-address">Địa chỉ</Label>
                <Input
                  id="company-address"
                  placeholder="123 Nguyễn Trãi, P.1, TP. Mỹ Tho, Tiền Giang"
                  value={settings.company.address}
                  onChange={(e) => updateField("company", "address", e.target.value)}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveCompany} disabled={savingCompany}>
                  {savingCompany ? (
                    <><Loader2 className="mr-2 size-4 animate-spin" /> Đang lưu...</>
                  ) : savedCompany ? (
                    <><CheckCircle className="mr-2 size-4" /> Đã lưu!</>
                  ) : (
                    <><Save className="mr-2 size-4" /> Lưu Công ty</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Nguồn dữ liệu sản phẩm ───────────────── */}
        <TabsContent value="source" className="mt-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Nguồn dữ liệu sản phẩm</CardTitle>
                <CardDescription>
                  Chọn nguồn để hiển thị sản phẩm trên trang Quản lý sản phẩm.
                  Chỉ một nguồn được kích hoạt tại một thời điểm.
                  Thông tin đăng nhập của nguồn không được chọn vẫn được lưu lại.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup
                  value={activeSource}
                  onValueChange={(v) => setSettings((prev) => ({ ...prev, product_data_source: v as ProductDataSource }))}
                  className="space-y-3"
                >
                  <div className={cn(
                    "flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors",
                    isMedusaActive ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                  )}>
                    <RadioGroupItem value="medusa" id="src-medusa" className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="src-medusa" className="text-base font-semibold cursor-pointer flex items-center gap-2">
                        <Database className="size-5 text-primary" />
                        Dùng Medusa Backend
                        {isMedusaActive && <Badge variant="default" className="ml-2 text-xs">Đang dùng</Badge>}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Quản lý sản phẩm qua Medusa Admin API. Phù hợp khi đã sync WooCommerce sang Medusa.
                      </p>
                    </div>
                  </div>

                  <div className={cn(
                    "flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors",
                    !isMedusaActive ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                  )}>
                    <RadioGroupItem value="woocommerce" id="src-woo" className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="src-woo" className="text-base font-semibold cursor-pointer flex items-center gap-2">
                        <Globe className="size-5 text-green-600" />
                        Dùng WooCommerce API trực tiếp
                        {!isMedusaActive && <Badge variant="default" className="ml-2 text-xs">Đang dùng</Badge>}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Hiển thị sản phẩm trực tiếp từ WooCommerce. Không cần sync qua Medusa.
                      </p>
                    </div>
                  </div>
                </RadioGroup>

                <div className="flex justify-end">
                  <Button onClick={handleSaveSource} disabled={savingSource}>
                    {savingSource ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" /> Đang lưu...</>
                    ) : savedSource ? (
                      <><CheckCircle className="mr-2 size-4" /> Đã lưu!</>
                    ) : (
                      <><Save className="mr-2 size-4" /> Lưu nguồn dữ liệu</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick config reference */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Medusa credentials */}
              <Card className={cn(
                "transition-colors",
                isMedusaActive ? "border-primary/50" : "opacity-60"
              )}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="size-4 text-primary" />
                    Medusa Backend
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p><strong>Backend URL:</strong> {settings.medusa.backendUrl || "—"}</p>
                  <p><strong>Email:</strong> {settings.medusa.adminEmail || "—"}</p>
                  <p><strong>Token:</strong> {settings.medusa.adminApiKey ? "••••••••••••" : "—"}</p>
                  <p className="pt-1">
                    <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                      <Link href="/settings/app?tab=sync">Cấu hình chi tiết →</Link>
                    </Button>
                  </p>
                </CardContent>
              </Card>

              {/* WooCommerce credentials */}
              <Card className={cn(
                "transition-colors",
                !isMedusaActive ? "border-green-500/50" : "opacity-60"
              )}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="size-4 text-green-600" />
                    WooCommerce API
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p><strong>WordPress URL:</strong> {settings.wooCommerce.wordpressUrl || "—"}</p>
                  <p><strong>Consumer Key:</strong> {settings.wooCommerce.consumerKey ? "••••••••••••" : "—"}</p>
                  <p><strong>Consumer Secret:</strong> {settings.wooCommerce.consumerSecret ? "••••••••••••" : "—"}</p>
                  <p className="pt-1">
                    <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                      <Link href="/settings/app?tab=sync">Cấu hình chi tiết →</Link>
                    </Button>
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab: Kiểm tra & đồng bộ ──────────────────── */}
        <TabsContent value="sync" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left: Medusa config */}
            <div className="space-y-4">
              <Card className={cn(
                "border-2 transition-colors",
                isMedusaActive ? "border-primary/40" : "border-muted opacity-70"
              )}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="size-5 text-primary" />
                    Medusa Backend
                    {isMedusaActive && <Badge variant="default" className="ml-auto text-xs">Đang dùng</Badge>}
                    {!isMedusaActive && <Badge variant="secondary" className="ml-auto text-xs">Chế độ chờ</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="medusa-url-sync">Backend URL</Label>
                    <Input
                      id="medusa-url-sync"
                      placeholder="http://localhost:9000"
                      value={settings.medusa.backendUrl}
                      onChange={(e) => updateField("medusa", "backendUrl", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="medusa-email-sync">Admin Email</Label>
                      <Input
                        id="medusa-email-sync"
                        type="email"
                        placeholder="admin@..."
                        value={settings.medusa.adminEmail}
                        onChange={(e) => updateField("medusa", "adminEmail", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="medusa-pass-sync">Admin Password</Label>
                      <div className="relative">
                        <Input
                          id="medusa-pass-sync"
                          type={showSecret.medusaPassSync ? "text" : "password"}
                          placeholder="Password"
                          value={settings.medusa.adminPassword}
                          onChange={(e) => updateField("medusa", "adminPassword", e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                          onClick={() => toggleSecret("medusaPassSync")}
                        >
                          {showSecret.medusaPassSync ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medusa-key-sync">JWT Token</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="medusa-key-sync"
                          type={showSecret.medusaKeySync ? "text" : "password"}
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          value={settings.medusa.adminApiKey}
                          onChange={(e) => updateField("medusa", "adminApiKey", e.target.value)}
                          className="pr-10 font-mono text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                          onClick={() => toggleSecret("medusaKeySync")}
                        >
                          {showSecret.medusaKeySync ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      </div>
                      <Button variant="secondary" onClick={handleFetchToken} disabled={fetchingToken}>
                        {fetchingToken ? <Loader2 className="size-4 animate-spin" /> : <Wifi className="size-4" />}
                        Lấy Token
                      </Button>
                    </div>
                    {fetchError && <p className="text-sm text-red-500">{fetchError}</p>}
                    <p className="text-xs text-muted-foreground">
                      Nhập Email + Password → <strong>Lấy Token</strong>. Hoặc dán JWT trực tiếp.
                    </p>
                  </div>

                  {/* Connection status */}
                  <div className={cn(
                    "flex items-center gap-2 p-3 rounded-lg text-sm",
                    medusaStatus === "connected" && "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border border-green-200",
                    medusaStatus === "error" && "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200",
                    medusaStatus === "checking" && "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200",
                    medusaStatus === "unknown" && "bg-muted text-muted-foreground"
                  )}>
                    {medusaStatus === "connected" && <CheckCircle className="size-4 shrink-0" />}
                    {medusaStatus === "error" && <WifiOff className="size-4 shrink-0" />}
                    {medusaStatus === "checking" && <Loader2 className="size-4 shrink-0 animate-spin" />}
                    {medusaStatus === "unknown" && <Database className="size-4 shrink-0" />}
                    <span className="flex-1">{medusaStatusMsg || "Chưa kiểm tra kết nối."}</span>
                    {medusaStatus === "error" && (
                      <Button size="sm" variant="ghost" onClick={handleTestMedusa} className="h-6 text-xs ml-auto">
                        Thử lại
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={handleTestMedusa} disabled={medusaStatus === "checking" || !settings.medusa.backendUrl}>
                      {medusaStatus === "checking" ? <><Loader2 className="mr-1 size-3 animate-spin" /> Đang... </> : <><Wifi className="mr-1 size-3" /> Kiểm tra</>}
                    </Button>
                    <Button size="sm" onClick={handleSaveMedusa} disabled={savingMedusa}>
                      {savingMedusa ? <><Loader2 className="mr-1 size-3 animate-spin" /> Đang...</> : savedMedusa ? <><CheckCircle className="mr-1 size-3" /> Đã lưu!</> : <><Save className="mr-1 size-3" /> Lưu</>}
                    </Button>
                    {isMedusaActive && medusaStatus === "connected" && (
                      <Button size="sm" variant="secondary" asChild>
                        <Link href="/products"><Package className="mr-1 size-3" /> Xem sản phẩm</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: WooCommerce config */}
            <div className="space-y-4">
              <Card className={cn(
                "border-2 transition-colors",
                !isMedusaActive ? "border-green-500/40" : "border-muted opacity-70"
              )}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="size-5 text-green-600" />
                    WooCommerce API
                    {!isMedusaActive && <Badge variant="default" className="ml-auto text-xs bg-green-600">Đang dùng</Badge>}
                    {isMedusaActive && <Badge variant="secondary" className="ml-auto text-xs">Chế độ chờ</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="woo-url-sync">WordPress API URL</Label>
                    <Input
                      id="woo-url-sync"
                      placeholder="https://mytholaptop.vn/wp-json"
                      value={settings.wooCommerce.wordpressUrl}
                      onChange={(e) => updateField("wooCommerce", "wordpressUrl", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="woo-key-sync">Consumer Key</Label>
                    <div className="relative">
                      <Input
                        id="woo-key-sync"
                        type={showSecret.wooKeySync ? "text" : "password"}
                        placeholder="ck_xxxxxxxxxxxxxxxx"
                        value={settings.wooCommerce.consumerKey}
                        onChange={(e) => updateField("wooCommerce", "consumerKey", e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                        onClick={() => toggleSecret("wooKeySync")}
                      >
                        {showSecret.wooKeySync ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="woo-secret-sync">Consumer Secret</Label>
                    <div className="relative">
                      <Input
                        id="woo-secret-sync"
                        type={showSecret.wooSecretSync ? "text" : "password"}
                        placeholder="cs_xxxxxxxxxxxxxxxx"
                        value={settings.wooCommerce.consumerSecret}
                        onChange={(e) => updateField("wooCommerce", "consumerSecret", e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                        onClick={() => toggleSecret("wooSecretSync")}
                      >
                        {showSecret.wooSecretSync ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </Button>
                    </div>
                    <div className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400">
                      <Info className="inline mr-1 size-3" />
                      Consumer Key/Secret được <strong>mã hoá AES-256</strong> trước khi lưu.
                    </div>
                  </div>

                  {/* Connection status */}
                  <div className={cn(
                    "flex items-center gap-2 p-3 rounded-lg text-sm",
                    wooStatus === "connected" && "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border border-green-200",
                    wooStatus === "error" && "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200",
                    wooStatus === "checking" && "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200",
                    wooStatus === "unknown" && "bg-muted text-muted-foreground"
                  )}>
                    {wooStatus === "connected" && <CheckCircle className="size-4 shrink-0" />}
                    {wooStatus === "error" && <WifiOff className="size-4 shrink-0" />}
                    {wooStatus === "checking" && <Loader2 className="size-4 shrink-0 animate-spin" />}
                    {wooStatus === "unknown" && <Globe className="size-4 shrink-0" />}
                    <span className="flex-1">{wooStatusMsg || "Chưa kiểm tra kết nối."}</span>
                    {wooStatus === "error" && (
                      <Button size="sm" variant="ghost" onClick={handleTestWoo} className="h-6 text-xs ml-auto">
                        Thử lại
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={handleTestWoo} disabled={wooStatus === "checking" || !settings.wooCommerce.wordpressUrl}>
                      {wooStatus === "checking" ? <><Loader2 className="mr-1 size-3 animate-spin" /> Đang... </> : <><Wifi className="mr-1 size-3" /> Kiểm tra</>}
                    </Button>
                    <Button size="sm" onClick={handleSaveWoo} disabled={savingWoo}>
                      {savingWoo ? <><Loader2 className="mr-1 size-3 animate-spin" /> Đang...</> : savedWoo ? <><CheckCircle className="mr-1 size-3" /> Đã lưu!</> : <><Save className="mr-1 size-3" /> Lưu</>}
                    </Button>
                    {!isMedusaActive && wooStatus === "connected" && (
                      <Button size="sm" variant="secondary" asChild>
                        <Link href="/products"><Package className="mr-1 size-3" /> Xem sản phẩm</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Active source info */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center gap-3 py-4">
                  <div className="shrink-0">
                    {isMedusaActive ? (
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Database className="size-5 text-primary" />
                      </div>
                    ) : (
                      <div className="size-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Globe className="size-5 text-green-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">
                      {isMedusaActive ? "Đang dùng Medusa Backend" : "Đang dùng WooCommerce API trực tiếp"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isMedusaActive
                        ? "Sản phẩm được hiển thị từ Medusa Admin API."
                        : "Sản phẩm được hiển thị trực tiếp từ WooCommerce. Không cần sync."}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/products">
                      <CheckSquare className="mr-1 size-3" />
                      Mở trang sản phẩm
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
