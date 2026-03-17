# Architecture

## Overview

SharePoint Search Chat is a client-side Next.js application that authenticates users via Microsoft Entra ID (Azure AD) and queries the Microsoft Graph Search API to find files across SharePoint sites. There is no backend server — all API calls are made directly from the browser using the user's own access token.

## High-Level Flow

```
User Browser
    │
    ├── 1. Opens app (390x650 popup window)
    │
    ├── 2. MSAL redirects to Microsoft login
    │       └── login.microsoftonline.com/common
    │
    ├── 3. Redirect back with auth code
    │       └── MSAL redirect bridge (BroadcastChannel API)
    │
    ├── 4. Token acquired silently from cache
    │
    ├── 5. Search query submitted
    │       └── POST graph.microsoft.com/v1.0/search/query
    │
    └── 6. Results displayed as file cards
            └── Open / Download links to SharePoint
```

## Multi-Tenant Model

The app uses a single Azure AD app registration with `authority: https://login.microsoftonline.com/common`. Any Microsoft 365 organisation can use the app — the tenant admin grants consent once via the admin consent URL, and all users in that tenant can then sign in.

No per-tenant configuration, database, or backend is required. Each user's access token determines which SharePoint files they can see.

## Authentication Flow

1. User clicks "Sign in with Microsoft" on the main page
2. A 390x650 popup window opens at `/?login=true`
3. The auth guard detects `?login=true` and triggers `loginRedirect`
4. User authenticates on Microsoft's login page
5. Microsoft redirects back to the app — MSAL processes the response via `handleRedirectPromise()`
6. The popup window becomes the app (main window shows "close this tab")

The popup/main window detection uses `sessionStorage` (per-window, survives redirects).

## Token Management

- **Login**: `loginRedirect` with scopes `User.Read`, `Files.Read.All`, `Sites.Read.All`
- **Token refresh**: `acquireTokenSilent` (automatic, uses cached refresh token)
- **Fallback**: `acquireTokenPopup` if silent fails (e.g., consent required)
- **Storage**: `localStorage` (tokens persist across sessions)

## Search

The app sends keyword queries to the Microsoft Graph Search API:

```
POST https://graph.microsoft.com/v1.0/search/query
{
  "requests": [{
    "entityTypes": ["driveItem"],
    "query": { "queryString": "user input" },
    "from": 0,
    "size": 15
  }]
}
```

Results include file metadata (name, URL, modified date, author) which are displayed as interactive cards with Open and Download buttons.

## Tenant Branding

On login, the app fetches the tenant's logo from the Microsoft Graph organisational branding API:

```
GET /organization/{tenantId}/branding/localizations/default/bannerLogo
```

Falls back to `squareLogo`, then to plain text if no branding is configured.
