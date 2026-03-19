"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Tags,
  FileText,
  Search,
  BookOpen,
  ClipboardCheck,
  SlidersHorizontal,
  MessageSquare,
  Settings,
  History,
  CheckCircle,
  UserCog,
  Flag,
  Upload,
  Activity,
  Shield,
  Database,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/settings", label: "Tenant Settings", icon: Settings },
      { href: "/admin/version-history", label: "Version History", icon: History },
      { href: "/admin/system-health", label: "System Health", icon: Activity },
    ],
  },
  {
    label: "Taxonomy",
    items: [
      { href: "/admin/metadata", label: "Metadata", icon: Tags },
      { href: "/admin/content-types", label: "Content Types", icon: FileText },
      { href: "/admin/keywords", label: "Keywords", icon: BookOpen },
    ],
  },
  {
    label: "Governance",
    items: [
      { href: "/admin/review-policies", label: "Review Policies", icon: ClipboardCheck },
      { href: "/admin/search-behaviour", label: "Search Behaviour", icon: SlidersHorizontal },
      { href: "/admin/kql-config", label: "KQL Mapping", icon: Search },
      { href: "/admin/schema-discovery", label: "Schema Discovery", icon: Database },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/onboarding", label: "Setup Wizard", icon: CheckCircle },
      { href: "/admin/onboarding", label: "Onboarding", icon: CheckCircle },
      { href: "/admin/roles", label: "Role Management", icon: UserCog },
      { href: "/admin/feature-flags", label: "Feature Flags", icon: Flag },
      { href: "/admin/bulk", label: "Import / Export", icon: Upload },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: Shield },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-[#0d3b66] text-white flex flex-col shrink-0">
      <div className="px-4 py-4 border-b border-[#0a2d4f]">
        <h1 className="text-sm font-semibold tracking-wide">Tenant Control Plane</h1>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-1">
            <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">
              {section.label}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
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
          </div>
        ))}
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
