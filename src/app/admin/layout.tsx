import React from "react";
import { AuthProvider } from "@/lib/auth/auth-context";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata = {
  title: "Admin Portal",
  description: "NIYAT Skincare Backoffice & Operations Hub",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminShell>{children}</AdminShell>
    </AuthProvider>
  );
}
