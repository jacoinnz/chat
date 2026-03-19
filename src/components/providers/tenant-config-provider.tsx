"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useMsal } from "@azure/msal-react";
import { graphScopes } from "@/lib/msal-config";
import type { TenantTaxonomyConfig } from "@/lib/taxonomy";
import {
  DEFAULT_TAXONOMY,
  DEFAULT_CONTENT_TYPES,
  DEFAULT_KQL_PROPERTY_MAP,
  DEFAULT_SEARCH_FIELDS,
  DEFAULT_KEYWORDS,
  DEFAULT_REVIEW_POLICIES,
  DEFAULT_SEARCH_BEHAVIOUR,
} from "@/lib/taxonomy-defaults";

const DEFAULT_CONFIG: TenantTaxonomyConfig = {
  taxonomy: DEFAULT_TAXONOMY,
  contentTypes: DEFAULT_CONTENT_TYPES,
  kqlPropertyMap: DEFAULT_KQL_PROPERTY_MAP,
  searchFields: DEFAULT_SEARCH_FIELDS,
  keywords: DEFAULT_KEYWORDS,
  reviewPolicies: DEFAULT_REVIEW_POLICIES,
  searchBehaviour: DEFAULT_SEARCH_BEHAVIOUR,
};

interface TenantConfigContextValue {
  config: TenantTaxonomyConfig;
  configExists: boolean;
  isLoading: boolean;
}

const TenantConfigContext = createContext<TenantConfigContextValue>({
  config: DEFAULT_CONFIG,
  configExists: true,
  isLoading: true,
});

export function useTenantConfig() {
  return useContext(TenantConfigContext);
}

export function TenantConfigProvider({ children }: { children: ReactNode }) {
  const { instance } = useMsal();
  const [config, setConfig] = useState<TenantTaxonomyConfig>(DEFAULT_CONFIG);
  const [configExists, setConfigExists] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const account = instance.getActiveAccount() ?? instance.getAllAccounts()[0];
        if (!account) {
          setIsLoading(false);
          return;
        }

        let tokenResponse;
        try {
          tokenResponse = await instance.acquireTokenSilent({
            scopes: graphScopes.search,
            account,
          });
        } catch {
          await instance.acquireTokenRedirect({
            scopes: graphScopes.search,
          });
          return;
        }

        const response = await fetch("/api/tenant-config", {
          headers: {
            Authorization: `Bearer ${tokenResponse.accessToken}`,
          },
        });

        if (!cancelled && response.ok) {
          const data = await response.json();
          setConfig(data);
          setConfigExists(data.configExists !== false);
        }
      } catch {
        // Fall back to defaults on any error
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, [instance]);

  return (
    <TenantConfigContext.Provider value={{ config, configExists, isLoading }}>
      {children}
    </TenantConfigContext.Provider>
  );
}
