"use client";

import { useMsal } from "@azure/msal-react";
import { Button } from "@/components/ui/button";
import { graphScopes } from "@/lib/msal-config";

export function LoginButton() {
  const { instance, accounts } = useMsal();
  const isLoggedIn = accounts.length > 0;

  const handleLogin = () => {
    instance.loginRedirect({
      scopes: graphScopes.search,
    });
  };

  const handleLogout = async () => {
    try {
      await instance.logoutRedirect({
        postLogoutRedirectUri: "/",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isLoggedIn) {
    return (
      <Button
        variant="outline"
        onClick={handleLogout}
        size="sm"
        className="bg-white/10 border-white text-white text-[13px] font-semibold font-[family-name:var(--font-dm-sans)] hover:bg-white/10 hover:text-white"
      >
        Sign out
      </Button>
    );
  }

  return (
    <Button
      onClick={handleLogin}
      size="sm"
      className="sm:text-sm text-xs bg-[#1976d2] hover:bg-[#0d3b66] text-white border-none"
    >
      Sign in with Microsoft
    </Button>
  );
}
