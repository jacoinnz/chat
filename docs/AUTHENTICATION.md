# Authentication

## Overview

The app uses **MSAL React v5** (`@azure/msal-browser@5.5.0`, `@azure/msal-react@5.0.7`) for Microsoft Entra ID authentication. It is a multi-tenant SPA with no backend — all auth is handled client-side.

## Azure AD App Registration

| Setting | Value |
|---|---|
| **App name** | SharePoint Chat |
| **Supported account types** | Accounts in any organizational directory (Multitenant) |
| **Platform** | Single-page application (SPA) |
| **Client ID** | `f1eaf3ca-725c-4559-9306-af1afdbcf73f` |

### Redirect URIs (SPA)

- `http://localhost:3000` (local dev)
- `https://chat-iota-cyan.vercel.app` (production)
- `https://chat-iota-cyan.vercel.app/redirect.html` (popup redirect bridge)

### API Permissions (Delegated)

| Permission | Purpose |
|---|---|
| `User.Read` | Read user profile, fetch tenant branding |
| `Files.Read.All` | Search files across all drives |
| `Sites.Read.All` | Search across all SharePoint sites + list accessible sites for site selector |
| `Directory.Read.All` | Admin portal — verify Global Admin / SharePoint Admin directory roles |

## Auth Flow

### Popup Window Login

The app uses a custom popup approach (not MSAL's built-in `loginPopup`):

1. **Main window**: User clicks "Sign in with Microsoft"
2. **Main window**: `window.open("/?login=true", "chatApp", "width=390,height=650,...")` opens a sized popup
3. **Popup**: Auth guard detects `?login=true`, sets `sessionStorage("isPopupWindow", "true")`
4. **Popup**: Calls `instance.loginRedirect()` — navigates to Microsoft login
5. **Microsoft**: User authenticates, redirected back to app
6. **Popup**: `MsalProviderWrapper` calls `handleRedirectPromise()` → sets active account
7. **Popup**: Auth guard sees authenticated + `sessionStorage` flag → shows chat
8. **Main window**: Auth guard sees authenticated + no flag → shows "close this tab"

### Why Not MSAL's loginPopup()?

MSAL v5 changed popup handling to use a "redirect bridge" via BroadcastChannel API. While the redirect bridge script (`msal-redirect-bridge.min.js`) is included in `/public/`, we use the manual `window.open` + `loginRedirect` approach for reliability. The redirect bridge files are kept for potential future use with `acquireTokenPopup`.

### Token Acquisition

```
User action (search) → getAccessToken()
    │
    ├── acquireTokenSilent (uses cached refresh token)
    │   └── Success → returns access token
    │
    └── Failure → acquireTokenPopup (re-consent if needed)
        └── Returns access token
```

Tokens are stored in `sessionStorage` and cleared when the browser closes (no cross-session persistence).

## MSAL Configuration

**File**: `src/lib/msal-config.ts`

| Option | Value | Notes |
|---|---|---|
| `authority` | `https://login.microsoftonline.com/common` | Multi-tenant |
| `redirectUri` | From `NEXT_PUBLIC_AZURE_REDIRECT_URI` | Production or localhost |
| `cacheLocation` | `sessionStorage` | Cleared on browser close (security hardening) |
| `navigatePopups` | `false` | Popup opens directly to URL |

### Scope Sets

```typescript
graphScopes = {
  search: ["User.Read", "Files.Read.All", "Sites.Read.All"],  // Chat app
  admin:  ["User.Read", "Directory.Read.All"],                 // Admin portal
};
```

The chat app uses `search` scopes for all Graph API calls. The admin portal additionally acquires `admin` scopes to verify directory role membership.

## Onboarding New Tenants

No code changes needed. Send the tenant admin this URL:

```
https://login.microsoftonline.com/common/adminconsent?client_id=f1eaf3ca-725c-4559-9306-af1afdbcf73f&redirect_uri=https://chat-iota-cyan.vercel.app
```

The admin signs in, reviews the requested permissions, and clicks "Accept". All users in that tenant can then sign in immediately.

## Admin Portal Authentication

### Admin Role Verification

The admin portal uses a two-layer auth check:

1. **Client-side** (`AdminAuthGuard`): Acquires token with `Directory.Read.All`, calls `GET /me/memberOf`, checks for admin role. Shows "Access Denied" if not admin. This provides immediate UX feedback.

2. **Server-side** (route handlers): Every admin API route calls `verifyAdminRole(accessToken)` which makes the same Graph API check. This prevents bypassing the client-side guard.

### Accepted Admin Roles

| Role | Template ID | Purpose |
|---|---|---|
| Global Administrator | `62e90394-69f5-4237-9190-012177145e10` | Full tenant admin |
| SharePoint Administrator | `f28a1f94-e044-4c59-956a-681e95fa6d63` | SharePoint-specific admin |

### Edge Middleware

All admin and tenant API routes are protected by Next.js edge middleware (`src/middleware.ts`):

```
Request → Middleware → Route Handler
  │                      │
  ├── Extract Bearer JWT  ├── x-tenant-id header (Azure AD tenant GUID)
  ├── Decode payload      ├── x-user-id header (Azure AD object ID)
  └── 401 if invalid      └── verifyAdminRole() for /api/admin/* routes
```

Matcher: `/api/admin/*`, `/api/tenant-config`, `/api/usage`

The middleware does not perform full JWT verification — Microsoft-issued tokens are validated by the Graph API when used. The middleware only decodes claims for routing purposes.

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_AZURE_CLIENT_ID` | Azure AD app registration client ID | `f1eaf3ca-725c-4559-9306-af1afdbcf73f` |
| `NEXT_PUBLIC_AZURE_REDIRECT_URI` | Redirect URI after auth | `https://chat-iota-cyan.vercel.app` |
| `TURSO_DATABASE_URL` | Turso database URL | `libsql://your-db.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso auth token | `eyJ...` |

Azure and Anthropic variables must be set in Vercel project settings for production. Turso variables are obtained from the Turso dashboard.
