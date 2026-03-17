import { IPublicClientApplication } from "@azure/msal-browser";
import { graphScopes } from "./msal-config";

async function getAccessToken(
  msalInstance: IPublicClientApplication
): Promise<string> {
  let account = msalInstance.getActiveAccount();
  if (!account) {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0]);
      account = accounts[0];
    } else {
      throw new Error("No active account");
    }
  }

  try {
    const response = await msalInstance.acquireTokenSilent({
      scopes: graphScopes.search,
      account,
    });
    return response.accessToken;
  } catch {
    throw new Error("Failed to acquire token");
  }
}

export async function fetchBrandingLogo(
  msalInstance: IPublicClientApplication
): Promise<string | null> {
  const account =
    msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
  if (!account) return null;

  const tenantId = account.tenantId;
  if (!tenantId) return null;

  try {
    const accessToken = await getAccessToken(msalInstance);

    // Try banner logo first, then square logo
    for (const logoType of ["bannerLogo", "squareLogo"]) {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/organization/${tenantId}/branding/localizations/default/${logoType}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 0) {
          return URL.createObjectURL(blob);
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}
