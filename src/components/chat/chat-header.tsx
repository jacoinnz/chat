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

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (logoUrl) URL.revokeObjectURL(logoUrl);
    };
  }, [logoUrl]);

  return (
    <header className="flex items-center justify-between px-2 py-2 sm:px-4 sm:py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2 sm:gap-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Company logo"
            className="h-6 sm:h-8 max-w-[120px] sm:max-w-[180px] object-contain"
          />
        ) : (
          <h1 className="text-sm sm:text-lg font-semibold">Microsoft SharePoint Chatbot</h1>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {account && (
          <div className="hidden sm:flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground hidden md:inline">
              {account.name}
            </span>
          </div>
        )}
        <LoginButton />
      </div>
    </header>
  );
}
