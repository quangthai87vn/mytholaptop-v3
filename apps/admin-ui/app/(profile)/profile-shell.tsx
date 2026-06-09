"use client";

/**
 * ProfileShell — wraps profile children in AdminLayout for consistent sidebar/header.
 * Used by the (profile) route group's layout.tsx.
 */

import AdminLayout from "@/components/layout/admin-layout";

export default function ProfileShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
