"use client";

import { useMsal } from "@azure/msal-react";
import { graphScopes } from "@/lib/msal-config";
import { Button } from "@/components/ui/button";

export function LoginButton() {
  const { instance, accounts } = useMsal();
  const isLoggedIn = accounts.length > 0;

  const handleLogin = async () => {
    const width = 390;
    const height = 650;
    const left = Math.max(0, (window.innerWidth - width) / 2 + (window.screenLeft ?? window.screenX));
    const top = Math.max(0, (window.innerHeight - height) / 2 + (window.screenTop ?? window.screenY));

    try {
      await instance.loginPopup({
        scopes: graphScopes.search,
        redirectUri: "/redirect.html",
        popupWindowAttributes: {
          popupSize: { width, height },
          popupPosition: { top, left },
        },
      });
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await instance.logoutPopup({
        mainWindowRedirectUri: "/",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isLoggedIn) {
    return (
      <Button variant="outline" onClick={handleLogout} size="sm">
        Sign out
      </Button>
    );
  }

  return (
    <Button onClick={handleLogin} size="sm" className="sm:text-sm text-xs">
      Sign in with Microsoft
    </Button>
  );
}
