"use client";

import React, { useCallback, useEffect, useState } from "react";

export interface UISettings {
  sidebarCollapsedDefault: boolean;
}

export const DEFAULT_UI_SETTINGS: UISettings = {
  sidebarCollapsedDefault: false,
};

const LS_KEY = "mtl-ui-settings";

export function loadUISettings(): UISettings {
  if (typeof window === "undefined") return DEFAULT_UI_SETTINGS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_UI_SETTINGS;
    return { ...DEFAULT_UI_SETTINGS, ...JSON.parse(raw) } as UISettings;
  } catch {
    return DEFAULT_UI_SETTINGS;
  }
}

export function saveUISettings(settings: UISettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(settings));
}

export function useUISettings() {
  const [settings, setSettings] = useState<UISettings>(DEFAULT_UI_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loaded = loadUISettings();
    setSettings(loaded);
    setMounted(true);
  }, []);

  const updateSettings = useCallback((patch: Partial<UISettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveUISettings(next);
      return next;
    });
  }, []);

  return { settings, mounted, updateSettings };
}
