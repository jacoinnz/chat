"use client";

import { useEffect } from "react";
import {
  PublicClientApplication,
} from "@azure/msal-browser";
import { msalConfig } from "@/lib/msal-config";

export default function RedirectPage() {
  useEffect(() => {
    const instance = new PublicClientApplication(msalConfig);
    instance
      .initialize()
      .then(() => instance.handleRedirectPromise())
      .catch((error) => {
        console.error("Popup redirect handling error:", error);
      });
  }, []);

  return null;
}
