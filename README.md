# SharePoint Search Chat

A multi-tenant SaaS chat app for searching SharePoint files. Users from any Microsoft 365 organisation sign in with their own credentials and search across their SharePoint sites.

## Setup

### 1. Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com) > Microsoft Entra ID > App registrations > New registration
2. Name: `SharePoint Chat`
3. Supported account types: **Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant)**
4. Redirect URI: Select **Single-page application (SPA)** and add:
   - `http://localhost:3000`
   - `https://chat-mirutech.vercel.app`
5. Go to API permissions > Add: `User.Read`, `Files.Read.All`, `Sites.Read.All` (Delegated)
6. Grant admin consent for your own tenant

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_AZURE_CLIENT_ID=your-client-id
NEXT_PUBLIC_AZURE_REDIRECT_URI=http://localhost:3000
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Onboarding New Clients

No per-client setup is needed on your side. Send the client's IT admin this consent URL:

```
https://login.microsoftonline.com/common/adminconsent?client_id=YOUR_CLIENT_ID&redirect_uri=https://chat-mirutech.vercel.app
```

The admin clicks the link, signs in, and approves the permissions. After that, all users in their organisation can sign in and search their SharePoint files.

## Tech Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS + shadcn/ui
- MSAL React (Multi-tenant Microsoft 365 authentication)
- Microsoft Graph Search API
