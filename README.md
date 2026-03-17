# SharePoint Search Chat

A multi-tenant SaaS chat app for searching SharePoint files. Users from any Microsoft 365 organisation sign in with their own credentials and search across their SharePoint sites.

## Setup

### 1. Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com) > Microsoft Entra ID > App registrations > New registration
2. Name: `SharePoint Chat`
3. Supported account types: **Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant)**
4. Redirect URI: Select **Single-page application (SPA)** and add:
   - `http://localhost:3000`
   - `https://chat-iota-cyan.vercel.app`
5. Go to API permissions > Add the following Delegated permissions:
   - `User.Read` — user profile and tenant branding
   - `Files.Read.All` — search files across all drives
   - `Sites.Read.All` — search across SharePoint sites
   - `Directory.Read.All` — admin portal role verification (required for `/admin`)
6. Grant admin consent for your own tenant

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_AZURE_CLIENT_ID=your-client-id
NEXT_PUBLIC_AZURE_REDIRECT_URI=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-...

# Turso Database (admin portal)
TURSO_DATABASE_URL=libsql://your-db-name-your-org.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

### 2b. Database Setup (Admin Portal)

The admin portal requires a Turso database. Sign up at [turso.tech](https://turso.tech), create a database, and get your URL + auth token.

```bash
npx prisma db push    # Create/sync tables
npx prisma generate   # Generate Prisma client
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
https://login.microsoftonline.com/common/adminconsent?client_id=YOUR_CLIENT_ID&redirect_uri=https://chat-iota-cyan.vercel.app
```

The admin clicks the link, signs in, and approves the permissions. After that, all users in their organisation can sign in and search their SharePoint files.

## Tech Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS + shadcn/ui
- MSAL React (Multi-tenant Microsoft 365 authentication)
- Microsoft Graph Search API
- Anthropic Claude Sonnet via Vercel AI SDK (`ai`, `@ai-sdk/anthropic`)
- Prisma 7 + Turso (LibSQL/SQLite) for admin portal storage

## Conversational AI

The chatbot synthesises natural language answers from SharePoint search results using Anthropic Claude. Answers stream word-by-word above file cards with clickable `[1]`, `[2]` citation badges that scroll to the corresponding result.

### How It Works

1. **Client-side search** — `searchSharePoint()` queries the Graph API using the user's MSAL token (stays in browser)
2. **File cards render immediately** — search results are shown while the AI processes
3. **Server streams Claude response** — `POST /api/chat` receives document metadata + conversation history, streams a synthesised answer with citations
4. **Client renders streamed text** — text appears progressively with a blinking cursor, citations become clickable

### Multi-Turn Context

Follow-up questions include the last 6 turns of conversation history so Claude can reference earlier answers.

### Graceful Fallback

If the Claude API is unavailable (missing key, network error, rate limit), search results are still displayed with an "AI summary unavailable" message.

### Environment Variable

Add to `.env.local` (server-only, no `NEXT_PUBLIC_` prefix):

```env
ANTHROPIC_API_KEY=sk-ant-...
```

Set this in Vercel project settings for production.

### API Route: `POST /api/chat`

Streams a Claude-generated response.

**Request body:**

```json
{
  "messages": [
    { "role": "user", "content": "What is the leave policy?" }
  ],
  "currentDocuments": [
    {
      "index": 1,
      "name": "Leave-Policy-2024.docx",
      "webUrl": "https://...",
      "summary": "Employees must submit leave requests...",
      "lastModified": "1/15/2024",
      "isStale": false
    }
  ]
}
```

**Response:** Streamed plain text (UTF-8 chunks).

**Errors:** `400` (missing messages/documents), `500` (generation failure) as JSON.

## Admin Portal

The admin portal at `/admin` allows tenant administrators to customise metadata, KQL mappings, and view usage analytics — all per-tenant.

### Access Control

Only users with **Global Administrator** or **SharePoint Administrator** Azure AD directory roles can access the admin portal. Role verification is done via the Microsoft Graph API (`GET /me/memberOf`).

### Features

| Page | Route | Description |
|---|---|---|
| Dashboard | `/admin` | Usage analytics — search/chat counts, error rate, active users, daily breakdown chart. Selectable period (7d/30d/90d). |
| Metadata | `/admin/metadata` | Edit department, sensitivity, and status taxonomy values. Add/remove/reorder items per section. |
| Content Types | `/admin/content-types` | Manage the list of SharePoint content types shown in the filter bar. |
| KQL Config | `/admin/kql-config` | Configure KQL property mappings (e.g., `department` → `RefinableString00`) and Graph Search fields. |

### How It Works

1. **First admin visit** auto-provisions the tenant in the database with default values
2. **Regular users** see the tenant's custom config (or defaults if no admin has configured anything)
3. **Zero-downtime**: Existing chat users are unaffected — static defaults remain as fallbacks
4. **Usage logging**: Search, chat, and error events are anonymously logged (SHA-256 hashed user IDs)

### API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/tenant-config` | GET | Returns tenant config (DB or defaults) |
| `/api/usage` | POST | Log anonymised usage event |
| `/api/admin/config` | GET/PUT | Fetch or replace full config (admin only) |
| `/api/admin/taxonomy` | PATCH | Update taxonomy arrays (admin only) |
| `/api/admin/content-types` | PATCH | Update content types (admin only) |
| `/api/admin/kql-map` | PATCH | Update KQL property map (admin only) |
| `/api/admin/search-fields` | PATCH | Update search fields (admin only) |
| `/api/admin/analytics` | GET | Aggregated usage stats (admin only) |
| `/api/admin/reset` | POST | Reset config to defaults (admin only) |

## Project Structure

```
src/
  app/
    api/
      chat/route.ts              # Claude streaming API route
      tenant-config/route.ts     # GET tenant config (DB or defaults)
      usage/route.ts             # POST anonymised usage events
      admin/
        config/route.ts          # GET/PUT full tenant config (admin)
        taxonomy/route.ts        # PATCH taxonomy arrays (admin)
        content-types/route.ts   # PATCH content types (admin)
        kql-map/route.ts         # PATCH KQL property map (admin)
        search-fields/route.ts   # PATCH search fields (admin)
        analytics/route.ts       # GET aggregated usage stats (admin)
        reset/route.ts           # POST reset config to defaults (admin)
    admin/
      layout.tsx                 # Admin shell — sidebar + auth guard
      page.tsx                   # Dashboard — stats + daily chart
      metadata/page.tsx          # Dept/Sensitivity/Status editors
      content-types/page.tsx     # Content types editor
      kql-config/page.tsx        # KQL map + search fields editors
    layout.tsx                   # Root layout with MSAL provider
    page.tsx                     # Entry point (AuthGuard > TenantConfigProvider > ChatPage)
  components/
    admin/
      admin-auth-guard.tsx       # Gates admin portal behind Azure AD admin roles
      admin-sidebar.tsx          # Vertical nav — Dashboard, Metadata, Content Types, KQL Config
      admin-header.tsx           # Top bar with tenant name + user info
      editable-list.tsx          # Reusable add/remove/reorder list component
      stat-card.tsx              # Dashboard stat card (value + label + trend)
      daily-chart.tsx            # CSS bar chart for daily usage breakdown
      kql-map-editor.tsx         # Key-value table editor for KQL property map
    auth/
      auth-guard.tsx             # Authentication gate
      login-button.tsx           # Sign in / sign out
    chat/
      chat-page.tsx              # Main chat orchestrator (4-phase flow)
      chat-header.tsx            # Header with branding + user avatar
      chat-input.tsx             # Message input with character limit
      filter-bar.tsx             # Site selector + metadata filters (dynamic from tenant config)
      message-bubble.tsx         # Message display with CitedText + streaming
      message-list.tsx           # Scrollable message container
      file-result-card.tsx       # SharePoint file result card
    providers/
      msal-provider.tsx          # MSAL initialization wrapper
      tenant-config-provider.tsx # Loads per-tenant config, provides useTenantConfig() hook
    ui/                          # shadcn/ui primitives
  lib/
    admin-auth.ts                # JWT extraction, SHA-256 hashing, admin role verification via Graph API
    context-builder.ts           # Prepares documents + history for Claude API
    content-prep.ts              # Summary sanitization, deduplication
    file-utils.ts                # File type detection, path extraction, size formatting
    graph-branding.ts            # Org branding logo fetch
    graph-search.ts              # Microsoft Graph Search API client + site fetching
    intent.ts                    # Query intent analysis + entity extraction
    msal-config.ts               # Azure AD configuration (search + admin scopes)
    prisma.ts                    # Singleton Prisma client (PG adapter)
    prompts.ts                   # Claude system prompt builder
    ranking.ts                   # Custom result re-ranking
    safety.ts                    # Input sanitization, sensitivity, staleness
    taxonomy.ts                  # TenantTaxonomyConfig interface, MetadataFilters, KQL filter builder
    taxonomy-defaults.ts         # Hardcoded default taxonomy values (fallback)
    utils.ts                     # Tailwind class merge utility
  types/
    search.ts                    # TypeScript interfaces
  middleware.ts                  # Edge middleware — JWT extraction for /api/admin/*, /api/tenant-config, /api/usage
prisma/
  schema.prisma                  # Tenant, TenantConfig, UsageLog models
  prisma.config.ts               # Prisma 7 datasource config
```

## Security

- **Token storage**: `sessionStorage` — MSAL tokens cleared on browser close, not persisted across sessions
- **Content Security Policy**: `script-src 'self'` (no inline scripts, no eval); blocks XSS script injection
- **Security headers**: `X-Frame-Options: DENY`, HSTS with preload, `nosniff`, strict referrer policy, permissions policy (camera/mic/geo disabled)
- **Subresource Integrity**: SRI hashes on auth redirect scripts (`redirect.html`)
- MSAL access tokens never leave the browser
- `ANTHROPIC_API_KEY` is server-only (no `NEXT_PUBLIC_` prefix)
- Document summaries are sanitized before being sent to the Claude API
- System prompt separates instructions from document content (prompt injection defense)
- Claude is instructed to only reference provided documents (hallucination prevention)
- Sensitivity and staleness warnings are preserved in both AI output and the UI
- All filter values validated against taxonomy constants before KQL insertion
- `npm run audit` scans production dependencies for known vulnerabilities
- **Admin portal**: Protected by Azure AD directory role check (Global Admin / SharePoint Admin) via Graph API — not just auth, but role-based authorization
- **Usage logging**: User IDs are SHA-256 hashed before storage — no PII in the database
- **API middleware**: Edge middleware validates Bearer tokens and extracts tenant/user claims for all admin and tenant API routes
- **Rate limiting**: Usage logging endpoint is rate-limited (100 events per user per minute)
- **Database**: Turso (edge SQLite) — data stays close to users, sub-millisecond reads
