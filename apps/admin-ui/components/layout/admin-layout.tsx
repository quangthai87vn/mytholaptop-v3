"use client";

import { useState, useEffect } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { AdminMobileSidebar } from "./admin-mobile-sidebar";
import { AdminHeader } from "./admin-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CompanySettingsProvider } from "@/lib/company-settings";
import { useUISettings } from "@/hooks/use-ui-settings";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CompanySettingsProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </CompanySettingsProvider>
  );
}

function AdminLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const { settings: uiSettings } = useUISettings();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedCollapsed = localStorage.getItem("admin-sidebar-collapsed");
    if (savedCollapsed === "true") {
      setCollapsed(true);
    } else if (uiSettings.sidebarCollapsedDefault && savedCollapsed === null) {
      setCollapsed(true);
    }
  }, [uiSettings.sidebarCollapsedDefault]);

  const handleToggle = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("admin-sidebar-collapsed", String(newState));
  };

  const handleMobileOpen = () => setMobileOpen(true);
  const handleMobileClose = () => setMobileOpen(false);

  if (!mounted) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar: sticky, rendered as part of flex row */}
        <AdminSidebar
          collapsed={collapsed}
          onToggle={handleToggle}
          onMobileOpen={handleMobileOpen}
        />

        {/* Mobile overlay sidebar */}
        <AdminMobileSidebar
          open={mobileOpen}
          onClose={handleMobileClose}
        />

        {/* Main content: flex-col, header scrolls with page */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header uses sidebarCollapsed to shift its left position */}
          <AdminHeader
            onMobileMenuOpen={handleMobileOpen}
          />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
