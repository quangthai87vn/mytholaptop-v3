"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { loadApiSettings } from "@/lib/settings-storage";
import type { ApiSettings } from "@/lib/settings-storage";
import { MigrationForm } from "@/components/products/migration/migration-form";
import { MigrationPreview } from "@/components/products/migration/migration-preview";
import { MigrationOptionsPopup } from "@/components/products/migration/migration-options-popup";
import { MigrationProgressComponent } from "@/components/products/migration/migration-progress";
import { MigrationLogView } from "@/components/products/migration/migration-log";
import { CategoryMappingView } from "@/components/products/migration/category-mapping-view";
import { ProductDebugView } from "@/components/products/migration/product-debug-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Settings, Database, Bug, AlertCircle } from "lucide-react";
import {
  runMigration,
  rollbackMigration,
} from "@/services/migration.service";
import { startMigration, migrateMediaOnly } from "@/services/migration-manager";
import {
  saveMigrationHistory,
  loadMigrationHistory,
  updateMigrationHistoryLogs,
  loadIdMapping,
  clearMigrationHistory,
  clearIdMapping,
} from "@/services/medusa.service";
import type { MigrationCallback, ProgressCallback } from "@/services/migration.service";
import {
  testConnection,
  fetchCategories,
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
import {
  DEFAULT_MEDIA_OPTIONS,
  DEFAULT_IMAGE_UPLOAD_CONFIG,
  type MediaMigrationOptions,
  type ImageUploadConfig,
} from "@/types/media-mapping";

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

function getInitialMigrationStats(): MigrationStats {
  const history = loadMigrationHistory();
  return history?.stats ? { ...DEFAULT_STATS, ...history.stats } : DEFAULT_STATS;
}

function getInitialMigrationOptions() {
  try {
    const savedOpts = localStorage.getItem("mtl_migration_options");
    if (!savedOpts) {
      return {
        selectedTypes: ["categories", "products"] as MigrationDataType[],
        conflictStrategy: "update" as ConflictStrategy,
        batchSize: 100,
        skipOnError: true,
        preserveImages: false,
        mediaOptions: DEFAULT_MEDIA_OPTIONS,
      };
    }

    const opts = JSON.parse(savedOpts);
    return {
      selectedTypes:
        opts.selectedTypes && Array.isArray(opts.selectedTypes)
          ? (opts.selectedTypes as MigrationDataType[])
          : (["categories", "products"] as MigrationDataType[]),
      conflictStrategy: (opts.conflictStrategy as ConflictStrategy) || "update",
      batchSize: typeof opts.batchSize === "number" ? opts.batchSize : 100,
      skipOnError:
        typeof opts.skipOnError === "boolean" ? opts.skipOnError : true,
      preserveImages:
        typeof opts.preserveImages === "boolean" ? opts.preserveImages : false,
      mediaOptions: opts.mediaOptions || DEFAULT_MEDIA_OPTIONS,
    };
  } catch {
    return {
      selectedTypes: ["categories", "products"] as MigrationDataType[],
      conflictStrategy: "update" as ConflictStrategy,
      batchSize: 100,
      skipOnError: true,
      preserveImages: false,
      mediaOptions: DEFAULT_MEDIA_OPTIONS,
    };
  }
}

function getInitialImageConfig(): ImageUploadConfig {
  try {
    const savedImageConfig = localStorage.getItem("mtl_image_upload_config");
    if (!savedImageConfig) return DEFAULT_IMAGE_UPLOAD_CONFIG;

    return {
      ...DEFAULT_IMAGE_UPLOAD_CONFIG,
      ...JSON.parse(savedImageConfig),
    };
  } catch {
    return DEFAULT_IMAGE_UPLOAD_CONFIG;
  }
}

function getInitialMappingData(): IdMapping {
  return loadIdMapping() ?? {
    categories: {},
    products: {},
    images: {},
    tags: {},
  };
}

const initialMigrationOptions = getInitialMigrationOptions();

export default function SyncPage() {
  // Track if settings are configured
  const [isConfigured, setIsConfigured] = useState(false);
  const [isCheckingConfig, setIsCheckingConfig] = useState(true);

  // Connection config
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

  // Preview data
  const [categories, setCategories] = useState<WooCategory[]>([]);
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Migration options
  const [selectedTypes, setSelectedTypes] = useState<MigrationDataType[]>(initialMigrationOptions.selectedTypes);
  const [conflictStrategy, setConflictStrategy] =
    useState<ConflictStrategy>(initialMigrationOptions.conflictStrategy);
  const [migrationMode, setMigrationMode] = useState<MigrationMode>("continue");
  const [batchSize, setBatchSize] = useState(initialMigrationOptions.batchSize);
  const [skipOnError, setSkipOnError] = useState(initialMigrationOptions.skipOnError);
  const [preserveImages, setPreserveImages] = useState(initialMigrationOptions.preserveImages);
  const [mediaOptions, setMediaOptions] =
    useState<MediaMigrationOptions>(initialMigrationOptions.mediaOptions);
  const [imageConfig, setImageConfig] =
    useState<ImageUploadConfig>(getInitialImageConfig);

  // Migration state
  const [isRunning, setIsRunning] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [progress, setProgress] =
    useState<MigrationProgress>(DEFAULT_PROGRESS);
  const [stats, setStats] = useState<MigrationStats>(getInitialMigrationStats);
  const [logs, setLogs] = useState<MigrationLog[]>([]);
  const [mappingData, setMappingData] = useState<IdMapping>(getInitialMappingData);

  // Load settings from server
  useEffect(() => {
    loadApiSettings().then((s: ApiSettings) => {
      setWordpressUrl(s.wordpressUrl);
      setWooKey(s.wooConsumerKey);
      setWooSecret(s.wooConsumerSecret);
      setMedusaUrl(s.medusaBackendUrl || "http://localhost:9000");
      // medusaKey, medusaEmail, medusaPassword are server-side only (P4.2)
      // Proxy /api/medusa auto-loads credentials from DB — frontend does not need them
      setMedusaKey("");
      setMedusaEmail("");
      setMedusaPassword("");

      const hasWooConfig =
        s.wordpressUrl && s.wooConsumerKey && s.wooConsumerSecret;
      // P4.2: Medusa backendUrl is sufficient — credentials auto-loaded by proxy from DB
      const hasMedusaConfig = Boolean(s.medusaBackendUrl);
      setIsConfigured(Boolean(hasWooConfig && hasMedusaConfig));
      setIsCheckingConfig(false);
    });

    // Restore previous migration stats and mapping on mount
  }, []);

  // Save migration options to localStorage
  useEffect(() => {
    const opts = {
      selectedTypes,
      conflictStrategy,
      batchSize,
      skipOnError,
      preserveImages,
      mediaOptions,
    };
    localStorage.setItem("mtl_migration_options", JSON.stringify(opts));
    localStorage.setItem(
      "mtl_image_upload_config",
      JSON.stringify(imageConfig)
    );
  }, [
    selectedTypes,
    conflictStrategy,
    batchSize,
    skipOnError,
    preserveImages,
    mediaOptions,
    imageConfig,
  ]);

  const handlePreserveImagesChange = useCallback((value: boolean) => {
    setPreserveImages(value);
    if (value) {
      setMediaOptions((prev) => ({
        ...prev,
        downloadThumbnails: false,
        downloadGallery: false,
        downloadCategoryImages: false,
        downloadDescriptionImages: false,
        downloadShortDescImages: false,
      }));
      return;
    }

    setMediaOptions((prev) => ({
      ...prev,
      downloadThumbnails: true,
      downloadGallery: true,
      downloadCategoryImages: true,
      downloadDescriptionImages: true,
      downloadShortDescImages: true,
    }));
  }, [setMediaOptions, setPreserveImages]);

  const isCancelledRef = useRef(false);

  const toggleType = (type: MigrationDataType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

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
        let accumulatedCategories: WooCategory[] = [];
        const catResult = await fetchCategories(
          { wordpressUrl, consumerKey: wooKey, consumerSecret: wooSecret },
          (pageCategories) => {
            accumulatedCategories = [
              ...accumulatedCategories,
              ...pageCategories,
            ];
            setCategories(accumulatedCategories);
          }
        );

        if (catResult.success && catResult.data) {
          setCategories(catResult.data);
        } else if (!catResult.success) {
          setCategories([]);
        }

        let accumulatedProducts: WooProduct[] = [];
        const prodResult = await fetchAllProducts(
          { wordpressUrl, consumerKey: wooKey, consumerSecret: wooSecret },
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

    saveMigrationHistory({
      id: `migration_${Date.now()}`,
      startedAt: startLog.timestamp,
      status: "in_progress",
      stats: DEFAULT_STATS,
      logs: [],
      progress: DEFAULT_PROGRESS,
    });

    try {
      const result = await startMigration(
        {
          wordpressUrl,
          wooConsumerKey: wooKey,
          wooConsumerSecret: wooSecret,
          medusaAdminKey: medusaKey,
          medusaAdminEmail: medusaEmail,
          medusaAdminPassword: medusaPassword,
          medusaBackendUrl: medusaUrl,
          adminUiUrl: window.location.origin,
        },
        {
          selectedTypes,
          conflictStrategy,
          migrationMode: "restart" as const,
          batchSize,
          skipOnError,
          preserveImages,
          mediaOptions,
          imageConfig,
        },
        (log: MigrationLog) => {
          if (isCancelledRef.current) return;
          setLogs((prev) => {
            const updated = [...prev, log];
            updateMigrationHistoryLogs(updated);
            return updated;
          });
        },
        (prog: MigrationProgress) => {
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

      if (result.mapping) {
        setMappingData(result.mapping);
      }

      clearMigrationHistory();
      setProgress((prev) => ({ ...prev, phase: "done" }));
    } catch {
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
  }, [
    wordpressUrl,
    wooKey,
    wooSecret,
    medusaKey,
    medusaEmail,
    medusaPassword,
    medusaUrl,
    selectedTypes,
    conflictStrategy,
    batchSize,
    skipOnError,
    preserveImages,
    mediaOptions,
    imageConfig,
  ]);

  const handleCancel = useCallback(() => {
    isCancelledRef.current = true;
    setIsCancelled(true);
    setIsRunning(false);
    setProgress((prev) => {
      const updated = { ...prev, phase: "failed" as const };
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
    setLogs((prev) => [
      ...prev,
      {
        id: `log_${Date.now()}`,
        step: "cancel",
        action: "WARNING",
        status: "warning" as const,
        message: "Migration đã bị huỷ bởi người dùng.",
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  const handleRollback = useCallback(async () => {
    setIsRunning(true);
    setProgress((prev) => ({
      ...prev,
      phase: "rolling_back" as const,
      rollbackStats: {
        total:
          Object.keys(mappingData.products).length +
          Object.keys(mappingData.categories).length,
        deleted: 0,
        errors: 0,
        failedItems: [],
      },
      rollbackProgress: 0,
    }));

    const totalItems =
      Object.keys(mappingData.products).length +
      Object.keys(mappingData.categories).length;
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
        (log: MigrationLog) => {
          setLogs((prev) => [...prev, log]);
        },
        (prog: MigrationProgress) => {
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

      setMappingData({
        categories: {},
        products: {},
        images: {},
        tags: {},
      });

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
            deleted:
              result.deletedProducts + result.deletedCategories,
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
  }, [
    wordpressUrl,
    wooKey,
    wooSecret,
    medusaKey,
    medusaEmail,
    medusaPassword,
    medusaUrl,
    mappingData,
  ]);

  const handleClearLogs = useCallback(() => {
    setLogs([]);
    updateMigrationHistoryLogs([]);
  }, []);

  const handleClearMapping = useCallback(() => {
    setMappingData({
      categories: {},
      products: {},
      images: {},
      tags: {},
    });
    clearIdMapping();
  }, []);

  const handleMigrateMedia = useCallback(async () => {
    setIsRunning(true);
    setIsCancelled(false);
    isCancelledRef.current = false;
    setProgress((prev) => ({
      ...prev,
      phase: "media_migration",
      mediaProgress: { totalProducts: 0, processedProducts: 0 },
    }));
    const startLog: MigrationLog = {
      id: `log_${Date.now()}`,
      step: "media_only",
      action: "INFO",
      status: "info",
      message: "Bắt đầu migrate ảnh riêng...",
      timestamp: new Date().toISOString(),
    };
    setLogs((prev) => [...prev, startLog]);

    try {
      const result = await migrateMediaOnly(
        {
          wordpressUrl,
          wooConsumerKey: wooKey,
          wooConsumerSecret: wooSecret,
          medusaAdminKey: medusaKey,
          medusaAdminEmail: medusaEmail,
          medusaAdminPassword: medusaPassword,
          medusaBackendUrl: medusaUrl,
          adminUiUrl: window.location.origin,
        },
        {
          selectedTypes: ["products"],
          conflictStrategy: "update",
          migrationMode: "continue",
          batchSize,
          skipOnError,
          preserveImages: false,
          mediaOptions,
        }
      );

      if (result.success) {
        setProgress((prev) => ({ ...prev, phase: "done" }));
        setLogs((prev) => [
          ...prev,
          {
            id: `log_${Date.now()}`,
            step: "media_only",
            action: "SUCCESS",
            status: "success",
            message: `Migrate ảnh hoàn tất! Đã cập nhật ${result.stats.updated} sản phẩm.`,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        setProgress((prev) => ({ ...prev, phase: "failed" }));
      }
    } catch {
      setProgress((prev) => ({ ...prev, phase: "failed" }));
    } finally {
      if (!isCancelledRef.current) {
        setIsRunning(false);
      }
    }
  }, [
    wordpressUrl,
    wooKey,
    wooSecret,
    medusaKey,
    medusaEmail,
    medusaPassword,
    medusaUrl,
    batchSize,
    skipOnError,
    mediaOptions,
  ]);

  const isConnected = connectionState.status === "success";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Đồng bộ WooCommerce
          </h1>
          <p className="text-muted-foreground">
            Di chuyển dữ liệu từ WordPress/WooCommerce sang Medusa qua{" "}
            <strong>WooCommerce REST API</strong>. Không kết nối MySQL
            WordPress trực tiếp. Cấu hình kết nối được lấy từ trang Cài đặt.
          </p>
        </div>
        <MigrationOptionsPopup
          selectedTypes={selectedTypes}
          conflictStrategy={conflictStrategy}
          batchSize={batchSize}
          skipOnError={skipOnError}
          preserveImages={preserveImages}
          mediaOptions={mediaOptions}
          imageConfig={imageConfig}
          onTypeToggle={toggleType}
          onConflictChange={setConflictStrategy}
          onBatchSizeChange={setBatchSize}
          onSkipOnErrorChange={setSkipOnError}
          onPreserveImagesChange={handlePreserveImagesChange}
          onMediaOptionsChange={setMediaOptions}
          onImageConfigChange={(cfg) => {
            setImageConfig(cfg);
            setMediaOptions((prev) => ({
              ...prev,
              imageUploadConfig: cfg,
            }));
          }}
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
              Bạn cần cấu hình kết nối WordPress/WooCommerce và Medusa
              trước khi sử dụng chức năng Migration. Vui lòng vào trang{" "}
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
                onMigrateMedia={handleMigrateMedia}
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

          {/* Debug tabs */}
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
                categoryMappings={Object.entries(
                  mappingData.categories
                ).map(([wooId, medusaId]) => ({
                  wooId: parseInt(wooId, 10),
                  medusaId,
                }))}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
