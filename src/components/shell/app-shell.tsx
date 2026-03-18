"use client";

import { useState } from "react";
import { GlobalHeader } from "./global-header";
import { AppSidebar, useSidebarCollapsed } from "./app-sidebar";
import { SidebarContextProvider } from "./sidebar-context";
import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { collapsed, toggle } = useSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <SidebarContextProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-[#e8eef4]">
        <GlobalHeader onMenuToggle={() => setMobileOpen((o) => !o)} />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar
            collapsed={collapsed}
            onToggle={toggle}
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
          />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </SidebarContextProvider>
  );
}
