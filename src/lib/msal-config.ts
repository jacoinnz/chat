import { Configuration, LogLevel } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
    redirectUri:
      process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI || "http://localhost:3000",
    postLogoutRedirectUri:
      process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI || "http://localhost:3000",
  },
  cache: {
    cacheLocation: "localStorage",
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (level === LogLevel.Error) console.error(message);
        if (level === LogLevel.Warning) console.warn(message);
      },
    },
  },
};

export const graphScopes = {
  search: ["User.Read", "Files.Read.All", "Sites.Read.All"],
};

export const loginRequest = {
  scopes: graphScopes.search,
};
