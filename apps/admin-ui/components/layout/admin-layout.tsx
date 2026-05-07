"use client";

import { useState, useEffect } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { AdminMobileSidebar } from "./admin-mobile-sidebar";
import { AdminHeader } from "./admin-header";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch with localStorage
  useEffect(() => {
    setMounted(true);
    const savedCollapsed = localStorage.getItem("admin-sidebar-collapsed");
    if (savedCollapsed === "true") {
      setCollapsed(true);
    }
  }, []);

  const handleToggle = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("admin-sidebar-collapsed", String(newState));
  };

  const sidebarWidth = mounted ? (collapsed ? 64 : 256) : 256;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile sidebar */}
        <AdminMobileSidebar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <AdminSidebar
            collapsed={collapsed}
            onToggle={handleToggle}
            onMobileOpen={() => setMobileOpen(true)}
          />
        </div>

        {/* Header - full width, sidebar offset handled by header itself */}
        <AdminHeader
          sidebarCollapsed={mounted ? collapsed : false}
          onMobileMenuOpen={() => setMobileOpen(true)}
        />

        {/* Main content - full width with proper sidebar offset */}
        <main
          className="min-h-screen pt-16 transition-all duration-300 ease-in-out w-full"
          style={{
            paddingLeft: sidebarWidth,
            transition: "padding-left 300ms ease-in-out",
          }}
        >
          {/* Full-width container */}
          <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
