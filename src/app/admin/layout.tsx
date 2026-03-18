"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AdminAuthGuard } from "@/components/admin/admin-auth-guard";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { ToastProvider } from "@/components/ui/toast";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AdminAuthGuard>
        <ToastProvider>
          <div className="flex h-screen overflow-hidden bg-[#e8eef4]">
            <AdminSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <AdminHeader />
              <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
          </div>
        </ToastProvider>
      </AdminAuthGuard>
    </AuthGuard>
  );
}
