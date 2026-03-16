"use client";

import { ReactNode } from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { LoginButton } from "./login-button";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress } = useMsal();

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
