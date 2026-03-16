"use client";

import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/msal-config";
import { Button } from "@/components/ui/button";

export function LoginButton() {
  const { instance, accounts } = useMsal();
  const isLoggedIn = accounts.length > 0;

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await instance.logoutPopup({
        postLogoutRedirectUri: "/",
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

  return <Button onClick={handleLogin}>Sign in with Microsoft</Button>;
}
