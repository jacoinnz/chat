"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Tags,
  FileText,
  Search,
  MessageSquare,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/metadata", label: "Metadata", icon: Tags },
  { href: "/admin/content-types", label: "Content Types", icon: FileText },
  { href: "/admin/kql-config", label: "KQL Config", icon: Search },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-[#0d3b66] text-white flex flex-col shrink-0">
      <div className="px-4 py-4 border-b border-[#0a2d4f]">
        <h1 className="text-sm font-semibold tracking-wide">Admin Portal</h1>
      </div>

      <nav className="flex-1 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-[#1976d2] text-white"
                  : "text-white/70 hover:text-white hover:bg-[#0a2d4f]"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-[#0a2d4f]">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          Back to Chat
        </Link>
      </div>
    </aside>
  );
}
