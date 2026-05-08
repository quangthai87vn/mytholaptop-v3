"use client";

import { useState } from "react";
import { Webhook, Database, Eye, EyeOff, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { testConnection } from "@/services/woocommerce.service";
import type { ConnectionState } from "@/types";

interface MigrationFormProps {
  wordpressUrl: string;
  wooKey: string;
  wooSecret: string;
  medusaUrl: string;
  medusaKey: string;
  medusaEmail: string;
  medusaPassword: string;
  isConfigured: boolean;
  onWordpressUrlChange: (v: string) => void;
  onWooKeyChange: (v: string) => void;
  onWooSecretChange: (v: string) => void;
  onMedusaUrlChange: (v: string) => void;
  onMedusaKeyChange: (v: string) => void;
  onMedusaEmailChange: (v: string) => void;
  onMedusaPasswordChange: (v: string) => void;
  onTestConnection: () => void;
  connectionState: ConnectionState;
}

export function MigrationForm({
  wordpressUrl,
  wooKey,
  wooSecret,
  medusaUrl,
  medusaKey,
  medusaEmail,
  medusaPassword,
  isConfigured,
  onWordpressUrlChange,
  onWooKeyChange,
  onWooSecretChange,
  onMedusaUrlChange,
  onMedusaKeyChange,
  onMedusaEmailChange,
  onMedusaPasswordChange,
  onTestConnection,
  connectionState,
}: MigrationFormProps) {
  const [showWooKey, setShowWooKey] = useState(false);
  const [showWooSecret, setShowWooSecret] = useState(false);
  const [showMedusaKey, setShowMedusaKey] = useState(false);
  const [showMedusaPassword, setShowMedusaPassword] = useState(false);

  return (
    <div className="space-y-6">
      {/* WooCommerce config — only show if not fully configured */}
      {!isConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="size-5 text-primary" />
              Cấu hình WooCommerce
            </CardTitle>
            <CardDescription>
              Kết nối đến cửa hàng WordPress/WooCommerce qua <strong>WooCommerce REST API</strong>.
              Không dùng kết nối MySQL trực tiếp. Consumer Key/Secret tạo ở WooCommerce Admin &gt; Settings &gt; Advanced &gt; REST API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wp-url">WordPress API URL</Label>
              <Input
                id="wp-url"
                placeholder="https://mytholaptop.vn/wp-json"
                value={wordpressUrl}
                onChange={(e) => onWordpressUrlChange(e.target.value)}
              />
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="woo-key">Consumer Key</Label>
                <div className="relative">
                  <Input
                    id="woo-key"
                    type={showWooKey ? "text" : "password"}
                    placeholder="ck_xxxxxxxxxxxxxxxx"
                    value={wooKey}
                    onChange={(e) => onWooKeyChange(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                    onClick={() => setShowWooKey(!showWooKey)}
                  >
                    {showWooKey ? (
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
                    type={showWooSecret ? "text" : "password"}
                    placeholder="cs_xxxxxxxxxxxxxxxx"
                    value={wooSecret}
                    onChange={(e) => onWooSecretChange(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                    onClick={() => setShowWooSecret(!showWooSecret)}
                  >
                    {showWooSecret ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medusa config — only show if not fully configured */}
      {!isConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5 text-primary" />
              Cấu hình Medusa
            </CardTitle>
            <CardDescription>
              Kết nối đến Medusa Backend. Chọn 1 trong 2 cách: <strong>API Key</strong> (JWT sk_xxx) hoặc <strong>Email + Password</strong> (JWT auth).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="medusa-url">Medusa Backend URL</Label>
                <Input
                  id="medusa-url"
                  placeholder="http://localhost:9000"
                  value={medusaUrl}
                  onChange={(e) => onMedusaUrlChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medusa-key">Admin API Key</Label>
                <div className="relative">
                  <Input
                    id="medusa-key"
                    type={showMedusaKey ? "text" : "password"}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={medusaKey}
                    onChange={(e) => onMedusaKeyChange(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                    onClick={() => setShowMedusaKey(!showMedusaKey)}
                  >
                    {showMedusaKey ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  JWT token từ Medusa Admin (bắt đầu bằng <code className="rounded bg-muted px-1">eyJ</code>, có 3 phần ngăn cách bởi dấu <code className="rounded bg-muted px-1">.</code>)
                </p>
              </div>
              {/* JWT Auth Email */}
              <div className="space-y-2">
                <Label htmlFor="medusa-email">Admin Email (JWT Auth)</Label>
                <Input
                  id="medusa-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={medusaEmail}
                  onChange={(e) => onMedusaEmailChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Dùng thay cho API Key. Sẽ được ưu tiên nếu có.
                </p>
              </div>
              {/* JWT Auth Password */}
              <div className="space-y-2">
                <Label htmlFor="medusa-password">Admin Password (JWT Auth)</Label>
                <div className="relative">
                  <Input
                    id="medusa-password"
                    type={showMedusaPassword ? "text" : "password"}
                    placeholder="Password"
                    value={medusaPassword}
                    onChange={(e) => onMedusaPasswordChange(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                    onClick={() => setShowMedusaPassword(!showMedusaPassword)}
                  >
                    {showMedusaPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {connectionState.status === "connecting" && (
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {connectionState.status === "success" && (
                <div className="flex size-10 items-center justify-center rounded-lg bg-green-100">
                  <CheckCircle className="size-5 text-green-600" />
                </div>
              )}
              {connectionState.status === "failed" && (
                <div className="flex size-10 items-center justify-center rounded-lg bg-red-100">
                  <XCircle className="size-5 text-red-600" />
                </div>
              )}
              {(connectionState.status === "idle" || !connectionState.status) && (
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <Webhook className="size-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-medium">
                  {connectionState.status === "connecting" && "Đang kiểm tra kết nối..."}
                  {connectionState.status === "success" && "Kết nối thành công"}
                  {connectionState.status === "failed" && "Kết nối thất bại"}
                  {(connectionState.status === "idle" || !connectionState.status) &&
                    "Chưa kiểm tra kết nối"}
                </p>
                {connectionState.message && (
                  <p className="text-sm text-muted-foreground">
                    {connectionState.message}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onTestConnection}
              disabled={
                connectionState.status === "connecting" ||
                !wordpressUrl ||
                !wooKey ||
                !wooSecret
              }
            >
              {connectionState.status === "connecting" ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Đang kiểm tra...
                </>
              ) : (
                "Kiểm tra kết nối"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
