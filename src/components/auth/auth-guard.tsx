"use client";

import { ReactNode, useEffect, useState } from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { LoginButton } from "./login-button";
import { graphScopes } from "@/lib/msal-config";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const isAuthenticated = useIsAuthenticated();
  const { instance, inProgress } = useMsal();
  const [isPopupWindow, setIsPopupWindow] = useState(true);

  useEffect(() => {
    // sessionStorage is per-window — only the popup has this flag
    setIsPopupWindow(sessionStorage.getItem("isPopupWindow") === "true");
  }, []);

  useEffect(() => {
    // Auto-trigger redirect login when opened via popup with ?login=true
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("login") === "true" &&
      !isAuthenticated &&
      inProgress === InteractionStatus.None
    ) {
      // Mark this window as the popup before redirecting — survives the redirect
      sessionStorage.setItem("isPopupWindow", "true");
      window.history.replaceState({}, "", "/");
      instance.loginRedirect({
        scopes: graphScopes.search,
      });
    }
  }, [isAuthenticated, inProgress, instance]);

  if (
    inProgress === InteractionStatus.Startup ||
    inProgress === InteractionStatus.HandleRedirect
  ) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Main window (not the popup) — show close message when authenticated
  if (isAuthenticated && !isPopupWindow) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">Signed in</h1>
          <p className="text-sm text-muted-foreground">
            You can close this tab. Use the popup window to chat.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 sm:gap-6 px-3 sm:px-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold">SharePoint Search</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Sign in with your Microsoft 365 account to search SharePoint files.
          </p>
        </div>
        <LoginButton />
      </div>
    );
  }

  return <>{children}</>;
}
