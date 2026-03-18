"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Clock,
  Bookmark,
  Heart,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
} from "lucide-react";
import { useSidebarContext } from "./sidebar-context";
import { useSavedQueries } from "@/hooks/use-user-data";
import { useFavorites } from "@/hooks/use-user-data";
import { useRecentSearches } from "@/hooks/use-user-data";

const STORAGE_KEY = "sidebar-collapsed";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  const { executeQuery } = useSidebarContext();
  const { queries, deleteQuery } = useSavedQueries();
  const { favorites } = useFavorites();
  const { searches } = useRecentSearches();

  const handleQueryClick = (query: string) => {
    executeQuery(query);
    onMobileClose();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Collapse toggle — desktop only */}
      <div className="hidden lg:flex items-center justify-between px-3 h-12 border-b border-[#0a2d4f]">
        {!collapsed && <span className="text-sm font-medium text-white/90">Navigation</span>}
        <button
          type="button"
          onClick={onToggle}
          className="p-1 rounded hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile close */}
      <div className="flex lg:hidden items-center justify-between px-3 h-12 border-b border-[#0a2d4f]">
        <span className="text-sm font-medium text-white/90">Navigation</span>
        <button
          type="button"
          onClick={onMobileClose}
          className="p-1 rounded hover:bg-white/10 transition-colors text-white/60"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav role="navigation" aria-label="Main navigation" className="flex-1 overflow-y-auto py-2">
        {/* Chat / Search */}
        <SidebarSection
          icon={MessageSquare}
          label="Chat & Search"
          collapsed={collapsed}
          onClick={() => handleQueryClick("")}
          isMain
        />

        {/* Recent Searches */}
        {!collapsed && searches.length > 0 && (
          <div className="mt-2">
            <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">
              Recent
            </div>
            {searches.slice(0, 5).map((search) => (
              <button
                key={search.id}
                type="button"
                onClick={() => handleQueryClick(search.query)}
                className="flex items-center gap-2 w-full px-4 py-1.5 text-xs text-white/70 hover:text-white hover:bg-[#0a2d4f] transition-colors text-left"
              >
                <Clock className="h-3 w-3 shrink-0" />
                <span className="truncate">{search.query}</span>
              </button>
            ))}
          </div>
        )}

        {/* Saved Queries */}
        {!collapsed && queries.length > 0 && (
          <div className="mt-2">
            <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">
              Saved Queries
            </div>
            {queries.slice(0, 10).map((q) => (
              <div key={q.id} className="group flex items-center gap-1 px-4 py-1.5">
                <button
                  type="button"
                  onClick={() => handleQueryClick(q.query)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-xs text-white/70 hover:text-white transition-colors text-left"
                >
                  <Bookmark className="h-3 w-3 shrink-0" />
                  <span className="truncate">{q.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteQuery(q.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-white/40 hover:text-red-400 transition-all"
                  aria-label={`Delete saved query: ${q.title}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Favorites */}
        {!collapsed && favorites.length > 0 && (
          <div className="mt-2">
            <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">
              Favorites
            </div>
            {favorites.slice(0, 10).map((fav) => (
              <a
                key={fav.id}
                href={fav.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-1.5 text-xs text-white/70 hover:text-white hover:bg-[#0a2d4f] transition-colors"
              >
                <Heart className="h-3 w-3 shrink-0" />
                <span className="truncate">{fav.title}</span>
              </a>
            ))}
          </div>
        )}

        {/* Collapsed icons */}
        {collapsed && (
          <div className="flex flex-col items-center gap-1 mt-2">
            <button
              type="button"
              className="p-2 rounded text-white/60 hover:text-white hover:bg-[#0a2d4f] transition-colors"
              aria-label="Recent searches"
              title="Recent searches"
            >
              <Clock className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="p-2 rounded text-white/60 hover:text-white hover:bg-[#0a2d4f] transition-colors"
              aria-label="Saved queries"
              title="Saved queries"
            >
              <Bookmark className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="p-2 rounded text-white/60 hover:text-white hover:bg-[#0a2d4f] transition-colors"
              aria-label="Favorites"
              title="Favorites"
            >
              <Heart className="h-4 w-4" />
            </button>
          </div>
        )}
      </nav>

      {/* Admin link */}
      <div className="border-t border-[#0a2d4f] px-3 py-3">
        <a
          href="/admin"
          className={`flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          <Settings className="h-4 w-4" />
          {!collapsed && "Admin Portal"}
        </a>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-[#0d3b66] transform transition-transform duration-200 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-[#0d3b66] transition-all duration-200 ${
          collapsed ? "w-14" : "w-60"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

function SidebarSection({
  icon: Icon,
  label,
  collapsed,
  onClick,
  isMain,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  collapsed: boolean;
  onClick?: () => void;
  isMain?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
        isMain
          ? "bg-[#1976d2] text-white"
          : "text-white/70 hover:text-white hover:bg-[#0a2d4f]"
      } ${collapsed ? "justify-center px-2" : ""}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && label}
    </button>
  );
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return { collapsed, toggle };
}
