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
    setIsPopupWindow(sessionStorage.getItem("isPopupWindow") === "true");
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("login") === "true" &&
      !isAuthenticated &&
      inProgress === InteractionStatus.None
    ) {
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
      <div className="flex h-screen items-center justify-center bg-[#e8eef4]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1976d2]" />
      </div>
    );
  }

  if (isAuthenticated && !isPopupWindow) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-4 bg-[#e8eef4]">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-[#0d3b66]">Signed in</h1>
          <p className="text-sm text-[#667781]">
            You can close this tab. Use the popup window to chat.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 sm:gap-6 px-3 sm:px-4 bg-[#e8eef4]">
        <div className="text-center space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0d3b66]">
            Microsoft SharePoint Chatbot
          </h1>
          <p className="text-sm sm:text-base text-[#667781]">
            Sign in with your Microsoft 365 account to search SharePoint files.
          </p>
        </div>
        <LoginButton />
      </div>
    );
  }

  return <>{children}</>;
}
