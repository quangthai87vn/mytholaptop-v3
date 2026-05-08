"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface CompanySettings {
  name: string;
  logoUrl: string;
  website: string;
  phone: string;
  address: string;
}

export const DEFAULT_COMPANY: CompanySettings = {
  name: "Mỹ Tho Laptop",
  logoUrl: "",
  website: "https://mytholaptop.vn",
  phone: "0273 381 2345",
  address: "123 Trần Hưng Đạo, P.1, TP. Mỹ Tho, Tiền Giang",
};

const LS_KEY = "mtl-company-settings";

const CompanySettingsContext = createContext<CompanySettings>(DEFAULT_COMPANY);

export function CompanySettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_COMPANY);

  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<CompanySettings>;
        setSettings({ ...DEFAULT_COMPANY, ...parsed });
      } catch {
        setSettings(DEFAULT_COMPANY);
      }
    }
  }, []);

  return (
    <CompanySettingsContext.Provider value={settings}>
      {children}
    </CompanySettingsContext.Provider>
  );
}

export function useCompanySettings(): CompanySettings {
  return useContext(CompanySettingsContext);
}

/** Save company settings to localStorage — call this from the Settings page on save */
export function saveCompanySettings(settings: CompanySettings): void {
  localStorage.setItem(LS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent("company-settings-changed", { detail: settings }));
}

/** Read company settings from localStorage — for use in non-context consumers */
export function loadCompanySettings(): CompanySettings {
  if (typeof window === "undefined") return DEFAULT_COMPANY;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_COMPANY;
    const parsed = JSON.parse(raw) as Partial<CompanySettings>;
    return { ...DEFAULT_COMPANY, ...parsed };
  } catch {
    return DEFAULT_COMPANY;
  }
}
