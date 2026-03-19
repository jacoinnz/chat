import { GraphClient } from "./graph-client";

export async function fetchBrandingLogo(
  client: GraphClient
): Promise<string | null> {
  let tenantId: string;
  try {
    tenantId = client.account.tenantId;
    if (!tenantId) return null;
  } catch {
    return null;
  }

  try {
    for (const logoType of ["bannerLogo", "squareLogo"]) {
      const response = await client.get(
        `https://graph.microsoft.com/v1.0/organization/${tenantId}/branding/localizations/default/${logoType}`
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
