# Project Structure

```
chat/
├── public/                          # Static assets served at /
│   ├── redirect.html                # MSAL popup redirect page (SRI-protected, no inline scripts)
│   ├── msal-redirect-bridge.min.js  # MSAL v5 redirect bridge script
│   ├── msal-redirect-init.js        # Extracted redirect bridge initialiser (SRI-protected)
│   └── *.svg                        # Default Next.js icons
│
├── prisma/                          # Database schema and config
│   ├── schema.prisma                # Tenant, TenantConfig, UsageLog models (PostgreSQL)
│   └── prisma.config.ts             # Prisma 7 datasource configuration
│
├── src/
│   ├── middleware.ts                # Edge middleware — JWT extraction for API routes
│   │
│   ├── app/                         # Next.js App Router
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   │   └── route.ts         # Claude streaming API route (POST /api/chat)
│   │   │   ├── tenant-config/
│   │   │   │   └── route.ts         # GET tenant config (DB or defaults)
│   │   │   ├── usage/
│   │   │   │   └── route.ts         # POST anonymised usage events (rate-limited)
│   │   │   └── admin/
│   │   │       ├── config/
│   │   │       │   └── route.ts     # GET/PUT full tenant config (admin, auto-provisions)
│   │   │       ├── taxonomy/
│   │   │       │   └── route.ts     # PATCH taxonomy arrays (admin)
│   │   │       ├── content-types/
│   │   │       │   └── route.ts     # PATCH content types (admin)
│   │   │       ├── kql-map/
│   │   │       │   └── route.ts     # PATCH KQL property map (admin)
│   │   │       ├── search-fields/
│   │   │       │   └── route.ts     # PATCH search fields (admin)
│   │   │       ├── analytics/
│   │   │       │   └── route.ts     # GET aggregated usage stats (admin)
│   │   │       └── reset/
│   │   │           └── route.ts     # POST reset config to defaults (admin)
│   │   ├── admin/                   # Admin portal pages
│   │   │   ├── layout.tsx           # Admin shell — sidebar + header + auth guards
│   │   │   ├── page.tsx             # Dashboard — stat cards + daily chart + period selector
│   │   │   ├── metadata/
│   │   │   │   └── page.tsx         # Department / Sensitivity / Status editors
│   │   │   ├── content-types/
│   │   │   │   └── page.tsx         # Content types editor
│   │   │   └── kql-config/
│   │   │       └── page.tsx         # KQL property map + search fields editors
│   │   ├── layout.tsx               # Root layout — wraps app in MsalProvider, Barlow font
│   │   ├── page.tsx                 # Home page — AuthGuard > TenantConfigProvider > ChatPage
│   │   ├── globals.css              # Tailwind CSS + ocean blue theme + WhatsApp wallpaper
│   │   └── favicon.ico
│   │
│   ├── components/
│   │   ├── admin/
│   │   │   ├── admin-auth-guard.tsx # Gates admin portal behind Azure AD admin roles
│   │   │   ├── admin-sidebar.tsx    # Vertical nav — Dashboard, Metadata, Content Types, KQL Config
│   │   │   ├── admin-header.tsx     # Top bar with tenant name + user info
│   │   │   ├── editable-list.tsx    # Reusable add/remove/reorder list component
│   │   │   ├── stat-card.tsx        # Dashboard stat card (value + label + trend)
│   │   │   ├── daily-chart.tsx      # CSS bar chart for daily usage breakdown
│   │   │   └── kql-map-editor.tsx   # Key-value table editor for KQL property map
│   │   │
│   │   ├── auth/
│   │   │   ├── auth-guard.tsx       # Gates content behind M365 login
│   │   │   └── login-button.tsx     # Sign in / Sign out button (opens popup)
│   │   │
│   │   ├── chat/
│   │   │   ├── chat-page.tsx        # Main orchestrator — 4-phase flow (search → cards → stream → render)
│   │   │   ├── chat-header.tsx      # Top bar — tenant logo, user avatar, sign out
│   │   │   ├── chat-input.tsx       # Input with Send icon, 200-char limit + counter
│   │   │   ├── filter-bar.tsx       # Site selector + dynamic filters from tenant config + safety toggles
│   │   │   ├── message-list.tsx     # Scrollable message area with auto-scroll
│   │   │   ├── message-bubble.tsx   # WhatsApp-style bubbles + CitedText + streaming cursor
│   │   │   └── file-result-card.tsx # File card with safety banners + metadata tags + citation scroll target
│   │   │
│   │   ├── providers/
│   │   │   ├── msal-provider.tsx    # MSAL initialisation and redirect handling
│   │   │   └── tenant-config-provider.tsx  # Loads per-tenant config, provides useTenantConfig() hook
│   │   │
│   │   └── ui/                      # shadcn/ui components (Base UI + Tailwind)
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── scroll-area.tsx
│   │       └── separator.tsx
│   │
│   ├── lib/
│   │   ├── admin-auth.ts           # JWT extraction, SHA-256 hashing, admin role verification via Graph API
│   │   ├── msal-config.ts          # MSAL configuration and auth scopes (search + admin)
│   │   ├── prisma.ts               # Singleton Prisma client with PG adapter
│   │   ├── graph-search.ts         # 5-step retrieval pipeline (intent → KQL → rank) + fetchUserSites()
│   │   ├── graph-branding.ts       # Tenant logo from organisational branding API
│   │   ├── intent.ts               # Query intent detection (keyword/question/topic/recent/person)
│   │   ├── ranking.ts              # Custom result ranking (recency, match, penalties)
│   │   ├── taxonomy.ts             # TenantTaxonomyConfig interface, MetadataFilters, KQL builder
│   │   ├── taxonomy-defaults.ts    # Hardcoded default taxonomy values (fallback when no DB config)
│   │   ├── content-prep.ts         # Deduplication, summary extraction, page detection
│   │   ├── safety.ts               # Sanitisation, sensitivity checks, staleness detection
│   │   ├── file-utils.ts           # File type mapping, site/folder extraction, file size formatting
│   │   ├── context-builder.ts      # Prepares document context + conversation history for Claude
│   │   ├── prompts.ts              # Claude system prompt builder with document injection
│   │   └── utils.ts                # cn() class name utility
│   │
│   └── types/
│       └── search.ts               # TypeScript types (SearchHit, ChatMessage, SharePointSite, DocumentContext)
│
├── docs/                            # Project documentation
│   ├── ARCHITECTURE.md              # System design, retrieval pipeline, safety controls, admin portal
│   ├── PROJECT-STRUCTURE.md         # This file — directory tree + data flow
│   ├── AUTHENTICATION.md            # MSAL setup, Azure AD config, token flow, admin auth
│   └── DEPLOYMENT.md                # Vercel deployment, Postgres setup, env vars, troubleshooting
│
├── .env.example                     # Environment variable template
├── .env.local                       # Local environment variables (not committed)
├── components.json                  # shadcn/ui configuration
├── next.config.ts                   # Next.js configuration + security headers + CSP
├── package.json                     # Dependencies and scripts
├── postcss.config.mjs               # PostCSS with Tailwind
├── tsconfig.json                    # TypeScript configuration
└── vercel.json                      # Vercel deployment — framework: nextjs
```

## Component Hierarchy

### Chat App

```
layout.tsx
└── MsalProviderWrapper
    └── page.tsx
        └── AuthGuard
            ├── (not authenticated) → Login screen + LoginButton
            ├── (main window)      → "Close this tab" message
            └── (popup, authenticated)
                └── TenantConfigProvider
                    └── ChatPage
                        ├── ChatHeader (tenant logo, avatar, sign out)
                        ├── FilterBar (site selector + dynamic filters from tenant config + toggles + chips)
                        ├── MessageList
                        │   └── MessageBubble (per message)
                        │       ├── CitedText (streamed AI text + clickable [N] citation badges)
                        │       ├── IntentIndicator (refined query + detected filters)
                        │       ├── FileResultCard (per search hit, id="file-card-{hitId}")
                        │       │   ├── Sensitivity banner (Confidential/Restricted)
                        │       │   ├── File info + metadata badges + file size + review date
                        │       │   ├── Summary excerpt
                        │       │   ├── Staleness warning
                        │       │   └── Open / Download buttons
                        │       └── Compliance disclaimer
                        └── ChatInput (200-char limit + counter)
```

### Admin Portal

```
layout.tsx
└── MsalProviderWrapper
    └── admin/layout.tsx
        └── AuthGuard
            └── AdminAuthGuard (verifies Global Admin / SharePoint Admin role)
                ├── (denied) → "Access Denied" + link back to chat
                └── (authorized)
                    ├── AdminSidebar (Dashboard, Metadata, Content Types, KQL Config, Back to Chat)
                    ├── AdminHeader (tenant name + user info)
                    └── <page content>
                        ├── /admin           → Dashboard (StatCard ×4, DailyChart, period selector)
                        ├── /admin/metadata  → EditableList ×3 (Department, Sensitivity, Status)
                        ├── /admin/content-types → EditableList ×1 (content types)
                        └── /admin/kql-config    → KqlMapEditor + EditableList (search fields)
```

## Key Data Flow

### Chat Flow

```
On mount: graph-search.ts → fetchUserSites() → GET /sites?search=* → populate site selector
On mount: TenantConfigProvider → GET /api/tenant-config → load tenant config (or defaults)

ChatInput (user types query, max 200 chars)
    │
    ▼
ChatPage.handleSendMessage() — 4-phase flow
    │
    ├── Phase 1: Adds user message + loading bubble to state
    │
    ├── Phase 2: graph-search.ts — 5-step retrieval pipeline (with tenant config)
    │   │
    │   ├── 1. intent.ts → analyzeIntent(query, config)
    │   │   └── Classify as keyword/question/topic/recent/person
    │   │   └── Extract taxonomy entities using tenant-specific values
    │   │
    │   ├── 2. taxonomy.ts → mergeFilters() + buildKqlFilter(filters, config)
    │   │   └── Manual filters (filter bar) + detected filters → KQL string
    │   │   └── Uses tenant-specific KQL property map when available
    │   │
    │   ├── 3. safety.ts → sanitizeForKql()
    │   │   └── Escape user input before KQL injection
    │   │
    │   ├── 4. POST /search/query (Graph API, token-scoped, tenant search fields)
    │   │
    │   ├── 5. content-prep.ts → deduplicateHits()
    │   │
    │   └── 6. ranking.ts → rankResults()
    │
    ├── Logs usage: POST /api/usage { event: "search" }
    │
    ├── Phase 3: AI synthesis (server-side)
    │   ├── POST /api/chat → route.ts
    │   └── Stream read via ReadableStream reader
    │
    ├── Logs usage: POST /api/usage { event: "chat" }
    │
    └── Phase 4: Render streamed response

Fallback: If Claude API fails → "Found N results. (AI summary unavailable)"
Error: Logs POST /api/usage { event: "error", errorCode: "..." }
```

### Admin Flow

```
On mount: AdminAuthGuard → acquireToken(Directory.Read.All) → GET /me/memberOf → verify admin role

Admin loads page
    │
    ├── GET /api/admin/config (auto-provisions tenant on first visit)
    │   ├── Middleware: decode JWT → x-tenant-id header
    │   ├── Route: verifyAdminRole() → Graph API
    │   └── Prisma: upsert Tenant + TenantConfig (seed defaults)
    │
    ├── Admin edits values in UI
    │
    ├── Save → PATCH /api/admin/{taxonomy|content-types|kql-map|search-fields}
    │   ├── Middleware: decode JWT → x-tenant-id header
    │   ├── Route: verifyAdminRole() → Graph API
    │   └── Prisma: update TenantConfig
    │
    └── Changes take effect on next chat page load (TenantConfigProvider refetches)
```

## Library Module Responsibilities

| Module | Purpose |
|---|---|
| `admin-auth.ts` | JWT decoding, SHA-256 hashing of user OIDs, admin role verification via Graph API |
| `prisma.ts` | Singleton Prisma client with PG adapter (dev-safe global caching) |
| `taxonomy-defaults.ts` | Hardcoded default taxonomy values (fallback when no DB config exists) |
| `graph-search.ts` | Orchestrates the full retrieval pipeline + fetches user's accessible sites |
| `intent.ts` | Classifies queries, extracts entities, refines search terms (accepts optional tenant config) |
| `ranking.ts` | Scores and re-orders results by relevance signals |
| `taxonomy.ts` | TenantTaxonomyConfig interface, MetadataFilters, SEARCH_FIELDS, KQL filter construction (accepts optional tenant config) |
| `content-prep.ts` | Deduplication, summary formatting, page detection |
| `safety.ts` | Input/content sanitisation, sensitivity checks, freshness assessment |
| `context-builder.ts` | Prepares document context + conversation history for Claude API |
| `prompts.ts` | Builds Claude system prompt with document injection |
| `msal-config.ts` | Azure AD auth configuration — search and admin scope sets |
| `graph-branding.ts` | Tenant logo fetching from organisational branding API |
| `file-utils.ts` | File extension mapping, site/folder URL parsing, file size formatting |
