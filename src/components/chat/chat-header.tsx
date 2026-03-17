"use client";

import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LoginButton } from "@/components/auth/login-button";
import { fetchBrandingLogo } from "@/lib/graph-branding";

export function ChatHeader() {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const initials =
    account?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

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

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 border-b border-[#0a2d4f] bg-[#0d3b66] text-white shadow-sm">
      <div className="flex items-center gap-2 sm:gap-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Company logo"
            className="h-6 sm:h-8 max-w-[120px] sm:max-w-[180px] object-contain brightness-0 invert"
          />
        ) : (
          <h1 className="text-sm sm:text-lg font-semibold text-white">
            Microsoft SharePoint Chatbot
          </h1>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {account && (
          <div className="hidden sm:flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-[#1976d2] text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-white/80 hidden md:inline">
              {account.name}
            </span>
          </div>
        )}
        <LoginButton />
      </div>
    </header>
  );
}
