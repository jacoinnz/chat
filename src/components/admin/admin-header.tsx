"use client";

import { useMsal } from "@azure/msal-react";
import { Settings } from "lucide-react";

export function AdminHeader() {
  const { instance } = useMsal();
  const account = instance.getActiveAccount();

  return (
    <header className="h-12 bg-white border-b border-[#d0d8e0] flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4 text-[#667781]" />
        <span className="text-sm font-medium text-[#1a2a3a]">
          Tenant Configuration
        </span>
      </div>
      <div className="text-xs text-[#667781]">
        {account?.name || account?.username || "Admin"}
      </div>
    </header>
  );
}
