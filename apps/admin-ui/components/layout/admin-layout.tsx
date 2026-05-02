"use client";

import { useState } from "react";
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

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <AdminMobileSidebar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        {/* Desktop sidebar - always visible on md+ */}
        <AdminSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          onMobileOpen={() => setMobileOpen(true)}
        />

        {/* Desktop header */}
        <AdminHeader
          sidebarCollapsed={collapsed}
          onMobileMenuOpen={() => setMobileOpen(true)}
        />

        {/* Desktop main content */}
        <main
          className="hidden min-h-screen pt-16 transition-all duration-300 md:block"
          style={{
            marginLeft: collapsed ? "4rem" : "16rem",
          }}
        >
          <div className="p-4 lg:p-6">{children}</div>
        </main>

        {/* Mobile main content */}
        <main className="min-h-screen pt-16 md:hidden">
          <div className="p-4">{children}</div>
        </main>
      </div>
    </TooltipProvider>
  );
}
