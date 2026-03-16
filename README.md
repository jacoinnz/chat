# SharePoint Search Chat

A chat-style web app for searching SharePoint files. Users sign in with their Microsoft 365 account and search across all SharePoint sites they have access to.

## Setup

### 1. Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com) > Microsoft Entra ID > App registrations > New registration
2. Name: `SharePoint Chat`
3. Supported account types: Single tenant
4. Redirect URI: Select **Single-page application (SPA)** and add:
   - `http://localhost:3000`
   - `https://chat-iota-cyan.vercel.app`
5. Go to API permissions > Add: `User.Read`, `Files.Read.All`, `Sites.Read.All` (Delegated)
6. Grant admin consent

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_AZURE_CLIENT_ID=your-client-id
NEXT_PUBLIC_AZURE_TENANT_ID=your-tenant-id
NEXT_PUBLIC_AZURE_REDIRECT_URI=http://localhost:3000
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS + shadcn/ui
- MSAL React (Microsoft 365 authentication)
- Microsoft Graph Search API
