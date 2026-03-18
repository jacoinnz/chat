"use client";

import { useEffect, useState, useRef } from "react";
import { useMsal } from "@azure/msal-react";
import { Menu, HelpCircle, ChevronDown, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { fetchBrandingLogo } from "@/lib/graph-branding";

interface GlobalHeaderProps {
  onMenuToggle: () => void;
}

export function GlobalHeader({ onMenuToggle }: GlobalHeaderProps) {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials =
    account?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const envBadge = process.env.NEXT_PUBLIC_APP_ENV || "Dev";

  useEffect(() => {
    if (account) {
      fetchBrandingLogo(instance).then(setLogoUrl);
    }
  }, [account, instance]);

  useEffect(() => {
    return () => {
      if (logoUrl) URL.revokeObjectURL(logoUrl);
    };
  }, [logoUrl]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const handleLogout = async () => {
    try {
      await instance.logoutRedirect({ postLogoutRedirectUri: "/" });
    } catch {
      // Best-effort
    }
  };

  return (
    <header
      role="banner"
      className="shrink-0 z-30 flex items-center justify-between px-3 h-14 border-b border-[#0a2d4f] bg-[#0d3b66] text-white shadow-sm"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 rounded hover:bg-white/10 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Company logo"
            className="h-6 sm:h-8 max-w-[120px] sm:max-w-[180px] object-contain brightness-0 invert"
          />
        ) : (
          <h1 className="text-sm sm:text-lg font-semibold text-white">
            SharePoint AI
          </h1>
        )}

        {envBadge !== "Production" && (
          <span className="hidden sm:inline-flex text-[10px] font-medium bg-amber-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wide">
            {envBadge}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <a
          href="/docs"
          className="hidden sm:flex p-1.5 rounded hover:bg-white/10 transition-colors"
          aria-label="Help"
        >
          <HelpCircle className="h-4.5 w-4.5" />
        </a>

        {account && (
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1 rounded hover:bg-white/10 transition-colors"
              aria-label="User menu"
              aria-expanded={dropdownOpen}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-[#1976d2] text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-sm text-white/80 max-w-[120px] truncate">
                {account.name}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-white/60 hidden md:block" />
            </button>

            {dropdownOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-[#d0d8e0] py-1 z-50"
              >
                <div className="px-3 py-2 border-b border-[#d0d8e0]">
                  <p className="text-sm font-medium text-[#1a2a3a] truncate">{account.name}</p>
                  <p className="text-xs text-[#667781] truncate">{account.username}</p>
                </div>
                <a
                  href="/admin"
                  role="menuitem"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-[#1a2a3a] hover:bg-[#f0f2f5] transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Settings className="h-4 w-4 text-[#667781]" />
                  Admin Portal
                </a>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-[#1a2a3a] hover:bg-[#f0f2f5] transition-colors w-full text-left"
                >
                  <LogOut className="h-4 w-4 text-[#667781]" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
