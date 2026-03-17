"use client";

import { ReactNode, useEffect, useState } from "react";
import {
  PublicClientApplication,
  EventType,
  EventMessage,
  AuthenticationResult,
  BrowserAuthError,
} from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "@/lib/msal-config";

const msalInstance = new PublicClientApplication(msalConfig);

msalInstance.addEventCallback((event: EventMessage) => {
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
    const result = event.payload as AuthenticationResult;
    msalInstance.setActiveAccount(result.account);
  }
});

interface MsalProviderWrapperProps {
  children: ReactNode;
}

export function MsalProviderWrapper({ children }: MsalProviderWrapperProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await msalInstance.initialize();

        // MUST always call handleRedirectPromise to clear stale interaction state
        try {
          const response = await msalInstance.handleRedirectPromise();
          if (response) {
            msalInstance.setActiveAccount(response.account);
          }
        } catch (redirectError) {
          // Stale cache from failed previous attempts — safe to ignore
          if (
            redirectError instanceof BrowserAuthError &&
            redirectError.errorCode === "no_token_request_cache_error"
          ) {
            console.warn("Cleared stale MSAL interaction state");
          } else {
            console.error("Redirect handling error:", redirectError);
          }
        }

        // Set active account from cache if not already set
        if (!msalInstance.getActiveAccount()) {
          const accounts = msalInstance.getAllAccounts();
          if (accounts.length > 0) {
            msalInstance.setActiveAccount(accounts[0]);
          }
        }
      } catch (error) {
        console.error("MSAL initialization failed:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    init();
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
