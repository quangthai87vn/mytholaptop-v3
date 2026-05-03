"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { loadApiSettings } from "@/lib/settings-storage";
import type { ApiSettings } from "@/lib/settings-storage";
import { MigrationForm } from "@/components/migration/migration-form";
import { MigrationPreview } from "@/components/migration/migration-preview";
import { MigrationOptionsPopup } from "@/components/migration/migration-options-popup";
import { MigrationProgressComponent } from "@/components/migration/migration-progress";
import { MigrationLogView } from "@/components/migration/migration-log";
import { CategoryMappingView } from "@/components/migration/category-mapping-view";
import { ProductDebugView } from "@/components/migration/product-debug-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Settings, Settings2, AlertCircle, Database, Bug } from "lucide-react";
import {
  runMigration,
  rollbackMigration,
} from "@/services/migration.service";
import {
  saveMigrationHistory,
  loadMigrationHistory,
  clearMigrationHistory,
  clearIdMapping,
  updateMigrationHistoryLogs,
  loadIdMapping,
} from "@/services/medusa.service";
import {
  testConnection,
  fetchCategories,
  fetchProducts,
  fetchAllProducts,
} from "@/services/woocommerce.service";
import type {
  WooCategory,
  WooProduct,
  MigrationProgress,
  MigrationStats,
  MigrationLog,
  ConnectionState,
  MigrationDataType,
  ConflictStrategy,
  IdMapping,
  MigrationMode,
} from "@/types";
import { DEFAULT_MEDIA_OPTIONS, type MediaMigrationOptions } from "@/types/media-mapping";

// Default state
const DEFAULT_PROGRESS: MigrationProgress = {
  phase: "idle",
  totalItems: 0,
  processedItems: 0,
  successCount: 0,
  failCount: 0,
  errors: [],
};

const DEFAULT_STATS: MigrationStats = {
  totalCategories: 0,
  migratedCategories: 0,
  totalProducts: 0,
  migratedProducts: 0,
  failedProducts: 0,
  skippedProducts: 0,
  totalVariants: 0,
  migratedVariants: 0,
};

export default function MigrationPage() {
  // Track if settings are configured
  const [isConfigured, setIsConfigured] = useState(false);
  const [isCheckingConfig, setIsCheckingConfig] = useState(true);

  // Connection config — load from settings storage (async)
  const [wordpressUrl, setWordpressUrl] = useState("");
  const [wooKey, setWooKey] = useState("");
  const [wooSecret, setWooSecret] = useState("");
  const [medusaUrl, setMedusaUrl] = useState("http://localhost:9000");
  const [medusaKey, setMedusaKey] = useState("");
  const [medusaEmail, setMedusaEmail] = useState("");
  const [medusaPassword, setMedusaPassword] = useState("");
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: "idle",
  });

  // Load settings from server and restore previous migration state on mount
  useEffect(() => {
    loadApiSettings().then((s: ApiSettings) => {
      setWordpressUrl(s.wordpressUrl);
      setWooKey(s.wooConsumerKey);
      setWooSecret(s.wooConsumerSecret);
      setMedusaUrl(s.medusaBackendUrl || "http://localhost:9000");
      setMedusaKey(s.medusaAdminKey || "");
      setMedusaEmail(s.medusaAdminEmail || "");
      setMedusaPassword(s.medusaAdminPassword || "");

      // Check if configured (has WooCommerce credentials OR Medusa credentials)
      const hasWooConfig = s.wordpressUrl && s.wooConsumerKey && s.wooConsumerSecret;
      const hasMedusaConfig = s.medusaBackendUrl && (s.medusaAdminKey || (s.medusaAdminEmail && s.medusaAdminPassword));
      setIsConfigured(Boolean(hasWooConfig && hasMedusaConfig));
      setIsCheckingConfig(false);
    });

    // Restore previous migration stats and mapping on mount (NOT progress phase - always start fresh)
    // This allows rollback to work even after a page reload
    const history = loadMigrationHistory();
    if (history) {
      if (history.stats) {
        setStats({
          ...DEFAULT_STATS,
          ...history.stats,
        });
      }
    }

    // Load saved ID mapping
    const savedMapping = loadIdMapping();
    if (savedMapping) {
      setMappingData(savedMapping);
    }
  }, []);

  // Preview data
  const [categories, setCategories] = useState<WooCategory[]>([]);
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Migration options
  const [selectedTypes, setSelectedTypes] = useState<MigrationDataType[]>([
    "categories",
    "products",
    "mainImage",
    "gallery",
    "shortDesc",
  ]);
  const [conflictStrategy, setConflictStrategy] =
    useState<ConflictStrategy>("update");
  const [migrationMode, setMigrationMode] = useState<MigrationMode>("continue");
  const [batchSize, setBatchSize] = useState(100);
  const [skipOnError, setSkipOnError] = useState(true);
  const [preserveImages, setPreserveImages] = useState(false); // Default: Tải ảnh về Medusa
  const [mediaOptions, setMediaOptions] = useState<MediaMigrationOptions>(DEFAULT_MEDIA_OPTIONS);

  // Handler for preserveImages - sync với mediaOptions
  const handlePreserveImagesChange = useCallback((value: boolean) => {
    setPreserveImages(value);
    // Khi chọn "Giữ nguyên URL", disable các download options
    if (value) {
      setMediaOptions((prev) => ({
        ...prev,
        downloadThumbnails: false,
        downloadGallery: false,
        downloadCategoryImages: false,
        downloadDescriptionImages: false,
        downloadShortDescImages: false,
      }));
    } else {
      // Khi chọn "Tải về Medusa", enable các download options về default
      setMediaOptions((prev) => ({
        ...prev,
        downloadThumbnails: true,
        downloadGallery: true,
        downloadCategoryImages: true,
        downloadDescriptionImages: true,
        downloadShortDescImages: true,
      }));
    }
  }, []);

  // Migration state
  const [isRunning, setIsRunning] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [progress, setProgress] =
    useState<MigrationProgress>(DEFAULT_PROGRESS);
  const [stats, setStats] = useState<MigrationStats>(DEFAULT_STATS);
  const [logs, setLogs] = useState<MigrationLog[]>([]);
  const [mappingData, setMappingData] = useState<IdMapping>({
    categories: {},
    products: {},
    images: {},
    tags: {},
  });

  // Refs for cancellation
  const isCancelledRef = useRef(false);

  // Toggle data type
  const toggleType = (type: MigrationDataType) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  // Handle connection test - tests connection AND auto-loads preview data on success
  const handleTestConnection = useCallback(async () => {
    setConnectionState({ status: "connecting" });

    const result = await testConnection({
      wordpressUrl,
      consumerKey: wooKey,
      consumerSecret: wooSecret,
    });

    setConnectionState(result);

    if (result.status === "success") {
      setIsPreviewLoading(true);
      try {
        // Load categories progressively
        let accumulatedCategories: WooCategory[] = [];
        const catResult = await fetchCategories(
          {
            wordpressUrl,
            consumerKey: wooKey,
            consumerSecret: wooSecret,
          },
          (pageCategories, totalSoFar) => {
            accumulatedCategories = [...accumulatedCategories, ...pageCategories];
            setCategories(accumulatedCategories);
          }
        );

        if (catResult.success && catResult.data) {
          setCategories(catResult.data);
        } else if (!catResult.success) {
          setCategories([]);
        }

        // Load products progressively
        let accumulatedProducts: WooProduct[] = [];
        const prodResult = await fetchAllProducts(
          {
            wordpressUrl,
            consumerKey: wooKey,
            consumerSecret: wooSecret,
          },
          undefined,
          (pageProducts, totalSoFar) => {
            accumulatedProducts = [...accumulatedProducts, ...pageProducts];
            setProducts(accumulatedProducts);
            setTotalProducts(totalSoFar);
          }
        );

        if (prodResult.success && prodResult.data) {
          setProducts(accumulatedProducts);
          setTotalProducts(prodResult.data.total);
        } else if (!prodResult.success) {
          setProducts([]);
          setTotalProducts(0);
        }
      } catch {
        // ignore
      } finally {
        setIsPreviewLoading(false);
      }
    }
  }, [wordpressUrl, wooKey, wooSecret]);

  // Handle start migration
  const handleStartMigration = useCallback(async () => {
    setIsRunning(true);
    setIsCancelled(false);
    isCancelledRef.current = false;
    setProgress(DEFAULT_PROGRESS);
    setStats(DEFAULT_STATS);
    const startLog: MigrationLog = {
      id: `log_${Date.now()}`,
      step: "migration",
      action: "INFO",
      status: "info",
      message: "Bắt đầu migration...",
      timestamp: new Date().toISOString(),
    };
    setLogs((prev) => [...prev, startLog]);

    // Save initial history
    saveMigrationHistory({
      id: `migration_${Date.now()}`,
      startedAt: startLog.timestamp,
      status: "in_progress",
      stats: DEFAULT_STATS,
      logs: [],
      progress: DEFAULT_PROGRESS,
    });

    try {
      const result = await runMigration(
        {
          wordpressUrl,
          wooConsumerKey: wooKey,
          wooConsumerSecret: wooSecret,
          medusaAdminKey: medusaKey,
          medusaAdminEmail: medusaEmail,
          medusaAdminPassword: medusaPassword,
          medusaBackendUrl: medusaUrl,
        },
        {
          selectedTypes,
          conflictStrategy,
          migrationMode: "restart" as const,
          batchSize,
          skipOnError,
          preserveImages,
          mediaOptions,
        },
        (log) => {
          if (isCancelledRef.current) return;
          setLogs((prev) => {
            const updated = [...prev, log];
            updateMigrationHistoryLogs(updated);
            return updated;
          });
        },
        (prog) => {
          if (isCancelledRef.current) return;
          setProgress(prog);
          if (prog.errors.length > 0) {
            setStats((prev) => ({
              ...prev,
              failedProducts: prog.failCount,
            }));
          }
        }
      );

      const finalStats = {
        ...DEFAULT_STATS,
        migratedProducts: result.stats.migratedProducts,
        migratedCategories: result.stats.migratedCategories,
        failedProducts: result.stats.failedProducts,
        skippedProducts: result.stats.skippedProducts,
        totalProducts: result.stats.totalProducts,
        totalCategories: result.stats.totalCategories,
      };
      setStats(finalStats);

      // Update mapping state
      if (result.mapping) {
        setMappingData(result.mapping);
      }

      // Migration completed successfully - clear history so page resets to idle on reload
      // Keep mapping in localStorage for reference (managed separately)
      clearMigrationHistory();
      setProgress((prev) => ({ ...prev, phase: "done" }));
    } catch {
      // Save failed history so user can retry
      saveMigrationHistory({
        id: `migration_${Date.now()}`,
        startedAt: startLog.timestamp,
        completedAt: new Date().toISOString(),
        status: "failed",
        stats: DEFAULT_STATS,
        logs: [],
        progress: DEFAULT_PROGRESS,
      });
      setProgress((prev) => ({ ...prev, phase: "failed" }));
    } finally {
      if (!isCancelledRef.current) {
        setIsRunning(false);
      }
    }
  }, [wordpressUrl, wooKey, wooSecret, medusaKey, medusaEmail, medusaPassword, medusaUrl, selectedTypes, conflictStrategy, migrationMode, batchSize, skipOnError, preserveImages, mediaOptions]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    isCancelledRef.current = true;
    setIsCancelled(true);
    setIsRunning(false);
    setProgress((prev) => {
      const updated = { ...prev, phase: "failed" as const };
      // Save history when cancelled
      saveMigrationHistory({
        id: `migration_${Date.now()}`,
        startedAt: prev.startTime || new Date().toISOString(),
        completedAt: new Date().toISOString(),
        status: "stopped",
        stats: DEFAULT_STATS,
        logs: [],
        progress: updated,
      });
      return updated;
    });
    setLogs((prev) => {
      const updated = [
        ...prev,
        {
          id: `log_${Date.now()}`,
          step: "cancel",
          action: "WARNING",
          status: "warning" as const,
          message: "Migration đã bị huỷ bởi người dùng.",
          timestamp: new Date().toISOString(),
        },
      ];
      return updated;
    });
  }, []);

  // Handle rollback
  const handleRollback = useCallback(async () => {
    setIsRunning(true);
    setProgress((prev) => ({
      ...prev,
      phase: "rolling_back" as const,
      rollbackStats: {
        total: Object.keys(mappingData.products).length + Object.keys(mappingData.categories).length,
        deleted: 0,
        errors: 0,
        failedItems: [],
      },
      rollbackProgress: 0,
    }));

    const totalItems = Object.keys(mappingData.products).length + Object.keys(mappingData.categories).length;
    setLogs((prev) => [
      ...prev,
      {
        id: `log_${Date.now()}`,
        step: "rollback",
        action: "WARNING",
        status: "warning",
        message: `Bắt đầu xoá ${Object.keys(mappingData.products).length} sản phẩm và ${Object.keys(mappingData.categories).length} danh mục đã migrate...`,
        timestamp: new Date().toISOString(),
      },
    ]);

    try {
      const result = await rollbackMigration(
        {
          wordpressUrl,
          wooConsumerKey: wooKey,
          wooConsumerSecret: wooSecret,
          medusaAdminKey: medusaKey,
          medusaAdminEmail: medusaEmail,
          medusaAdminPassword: medusaPassword,
          medusaBackendUrl: medusaUrl,
        },
        (log) => {
          setLogs((prev) => [...prev, log]);
        },
        (prog) => {
          setProgress((prev) => ({
            ...prev,
            rollbackStats: {
              total: totalItems,
              deleted: prev.rollbackStats?.deleted ?? 0,
              errors: prev.rollbackStats?.errors ?? 0,
              failedItems: prev.rollbackStats?.failedItems ?? [],
            },
            rollbackProgress: prog.rollbackProgress ?? 0,
          }));
        }
      );

      // Clear mapping after rollback
      setMappingData({ categories: {}, products: {}, images: {}, tags: {} });

      if (result.success) {
        setProgress((prev) => ({
          ...prev,
          phase: "rollback_done" as const,
          rollbackStats: {
            total: totalItems,
            deleted: result.deletedProducts + result.deletedCategories,
            errors: 0,
            failedItems: [],
          },
          rollbackProgress: 100,
        }));
        setLogs((prev) => [
          ...prev,
          {
            id: `log_${Date.now()}`,
            step: "rollback",
            action: "SUCCESS",
            status: "success",
            message: `Rollback hoàn tất! Đã xoá ${result.deletedProducts} sản phẩm, ${result.deletedCategories} danh mục.`,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        setProgress((prev) => ({
          ...prev,
          phase: "rollback_failed" as const,
          rollbackStats: {
            total: totalItems,
            deleted: result.deletedProducts + result.deletedCategories,
            errors: 1,
            failedItems: ["Xoá dữ liệu có lỗi xảy ra"],
          },
        }));
        setLogs((prev) => [
          ...prev,
          {
            id: `log_${Date.now()}`,
            step: "rollback",
            action: "ERROR",
            status: "error",
            message: `Rollback gặp lỗi. Đã xoá được ${result.deletedProducts} sản phẩm, ${result.deletedCategories} danh mục.`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setProgress((prev) => ({
        ...prev,
        phase: "rollback_failed" as const,
        rollbackStats: {
          total: totalItems,
          deleted: 0,
          errors: 1,
          failedItems: [msg],
        },
      }));
      setLogs((prev) => [
        ...prev,
        {
          id: `log_${Date.now()}`,
          step: "rollback",
          action: "ERROR",
          status: "error",
          message: `Rollback thất bại: ${msg}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  }, [wordpressUrl, wooKey, wooSecret, medusaKey, medusaEmail, medusaPassword, medusaUrl, mappingData]);

  // Handle clear logs (xoá log trong session hiện tại, giữ lại history cho rollback)
  const handleClearLogs = useCallback(() => {
    setLogs([]);
    updateMigrationHistoryLogs([]);
  }, []);

  // Handle clear all migrated data (xoá toàn bộ dữ liệu đã migrate)
  const handleClearAll = useCallback(async () => {
    await handleRollback();
  }, [handleRollback]);

  // Handle clear mapping
  const handleClearMapping = useCallback(() => {
    setMappingData({ categories: {}, products: {}, images: {}, tags: {} });
    clearIdMapping();
  }, []);

  const isConnected = connectionState.status === "success";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Migration</h1>
          <p className="text-muted-foreground">
            Di chuyển dữ liệu từ WordPress/WooCommerce sang Medusa qua{" "}
            <strong>WooCommerce REST API</strong>. Không kết nối MySQL WordPress trực tiếp.
            Cấu hình kết nối được lấy từ trang Cài đặt.
          </p>
        </div>
        <MigrationOptionsPopup
          selectedTypes={selectedTypes}
          conflictStrategy={conflictStrategy}
          batchSize={batchSize}
          skipOnError={skipOnError}
          preserveImages={preserveImages}
          mediaOptions={mediaOptions}
          onTypeToggle={toggleType}
          onConflictChange={setConflictStrategy}
          onBatchSizeChange={setBatchSize}
          onSkipOnErrorChange={setSkipOnError}
          onPreserveImagesChange={handlePreserveImagesChange}
          onMediaOptionsChange={setMediaOptions}
          isRunning={isRunning}
        />
      </div>

      {/* Show config prompt if not configured */}
      {!isCheckingConfig && !isConfigured && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="size-5" />
              Chưa cấu hình kết nối
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-orange-800">
              Bạn cần cấu hình kết nối WordPress/WooCommerce và Medusa trước khi
              sử dụng chức năng Migration. Vui lòng vào trang{" "}
              <strong>Cài đặt</strong> để nhập thông tin API.
            </p>
            <div className="flex gap-3">
              <Link href="/settings">
                <Button variant="default" size="sm">
                  <Settings className="mr-2 size-4" />
                  Đi đến Cài đặt
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show migration UI only when configured */}
      {isConfigured && (
        <>
          <div className="grid gap-6 xl:grid-cols-3">
            {/* Left column */}
            <div className="space-y-6 xl:col-span-2">
              <MigrationForm
                wordpressUrl={wordpressUrl}
                wooKey={wooKey}
                wooSecret={wooSecret}
                medusaUrl={medusaUrl}
                medusaKey={medusaKey}
                medusaEmail={medusaEmail}
                medusaPassword={medusaPassword}
                isConfigured={isConfigured}
                onWordpressUrlChange={setWordpressUrl}
                onWooKeyChange={setWooKey}
                onWooSecretChange={setWooSecret}
                onMedusaUrlChange={setMedusaUrl}
                onMedusaKeyChange={setMedusaKey}
                onMedusaEmailChange={setMedusaEmail}
                onMedusaPasswordChange={setMedusaPassword}
                onTestConnection={handleTestConnection}
                connectionState={connectionState}
              />

              <MigrationPreview
                categories={categories}
                products={products}
                totalProducts={totalProducts}
                isLoading={isPreviewLoading}
                isConnected={isConnected}
                wordpressUrl={wordpressUrl}
              />
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <MigrationProgressComponent
                progress={progress}
                stats={stats}
                totalProducts={totalProducts}
                isRunning={isRunning}
                onStart={handleStartMigration}
                onCancel={handleCancel}
                onRollback={handleRollback}
                isConnected={isConnected}
              />

              <MigrationLogView
                logs={logs}
                mappingData={mappingData}
                onClearLogs={handleClearLogs}
                onClearMapping={handleClearMapping}
              />
            </div>
          </div>

          {/* Debug tabs: Category Mapping + Product Debug */}
          <Tabs defaultValue="category-mapping" className="mt-4">
            <TabsList className="mb-3">
              <TabsTrigger value="category-mapping" className="gap-1.5">
                <Database className="size-3.5" />
                Category Mapping
              </TabsTrigger>
              <TabsTrigger value="product-debug" className="gap-1.5">
                <Bug className="size-3.5" />
                Product Debug
              </TabsTrigger>
            </TabsList>

            <TabsContent value="category-mapping">
              <CategoryMappingView
                categories={categories}
                idMapping={mappingData.categories}
              />
            </TabsContent>

            <TabsContent value="product-debug">
              <ProductDebugView
                products={products}
                categories={categories}
                wordpressUrl={wordpressUrl}
                medusaBackendUrl={medusaUrl}
                categoryMappings={Object.entries(mappingData.categories).map(
                  ([wooId, medusaId]) => ({
                    wooId: parseInt(wooId, 10),
                    medusaId,
                  })
                )}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
