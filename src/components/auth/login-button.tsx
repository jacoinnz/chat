"use client";

import { useMsal } from "@azure/msal-react";
import { Button } from "@/components/ui/button";

export function LoginButton() {
  const { instance, accounts } = useMsal();
  const isLoggedIn = accounts.length > 0;

  const handleLogin = () => {
    const width = 390;
    const height = 650;
    const left = Math.round((window.screen.width - width) / 2);
    const top = Math.round((window.screen.height - height) / 2);

    window.open(
      "/?login=true",
      "chatApp",
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
    );
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
        className="bg-white/10 border-white text-white text-[13px] hover:bg-white/10 hover:text-white"
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
