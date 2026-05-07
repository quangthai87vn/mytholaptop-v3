"use client";

/**
 * useMigration - React hook để subscribe vào MigrationManager singleton
 * Dùng trong các component con (MigrationProgress, MigrationLog)
 * để cập nhật UI mà không cần props drilling
 */

import { useState, useEffect } from "react";
import type { MigrationStats, MigrationProgress, MigrationLog, IdMapping } from "@/types";
import type { MigrationPhase } from "./migration-manager";
import {
  subscribe,
  subscribeLogs,
} from "./migration-manager";

// ============================================================
// HOOK
// ============================================================

export function useMigration() {
  const [snapshot, setSnapshot] = useState({
    phase: "idle" as MigrationPhase,
    progress: {
      phase: "idle",
      totalItems: 0,
      processedItems: 0,
      successCount: 0,
      failCount: 0,
      errors: [],
    } as MigrationProgress,
    stats: {
      totalCategories: 0,
      migratedCategories: 0,
      failedCategories: 0,
      totalProducts: 0,
      migratedProducts: 0,
      failedProducts: 0,
      skippedProducts: 0,
      totalVariants: 0,
      migratedVariants: 0,
    } as MigrationStats,
    isRunning: false,
    logs: [] as MigrationLog[],
    mapping: { categories: {}, products: {}, images: {}, tags: {} } as IdMapping,
  });

  useEffect(() => {
    const unsubscribeState = subscribe((state) => {
      setSnapshot((prev) => ({ ...prev, ...state }));
    });
    const unsubscribeLogs = subscribeLogs((log) => {
      setSnapshot((prev) => ({
        ...prev,
        logs: [...prev.logs.slice(-499), log],
      }));
    });
    return () => {
      unsubscribeState();
      unsubscribeLogs();
    };
  }, []);

  return {
    phase: snapshot.phase,
    progress: snapshot.progress,
    stats: snapshot.stats,
    isRunning: snapshot.isRunning,
    logs: snapshot.logs,
    mapping: snapshot.mapping,
  };
}
