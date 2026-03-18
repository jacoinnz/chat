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
│   ├── schema.prisma                # Tenant, TenantConfig, UsageLog, AuditLog, SavedQuery, Favorite, RecentSearch models (SQLite/Turso)
│   └── prisma.config.ts             # Prisma 7 datasource config (Turso URL)
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
│   │   │   ├── saved-queries/
│   │   │   │   └── route.ts         # GET/POST/DELETE saved queries (max 50/user)
│   │   │   ├── favorites/
│   │   │   │   └── route.ts         # GET/POST/DELETE document favorites (upsert)
│   │   │   ├── recent-searches/
│   │   │   │   └── route.ts         # GET/POST recent searches (dedup + auto-prune)
│   │   │   └── admin/
│   │   │       ├── config/
│   │   │       │   ├── route.ts     # GET/PUT full tenant config (admin, auto-provisions)
│   │   │       │   ├── versions/
│   │   │       │   │   ├── route.ts # GET paginated version history
│   │   │       │   │   └── [id]/
│   │   │       │   │       └── rollback/
│   │   │       │   │           └── route.ts # POST rollback to version
│   │   │       │   ├── draft/
│   │   │       │   │   └── route.ts # GET/POST/DELETE draft config
│   │   │       │   └── publish/
│   │   │       │       └── route.ts # POST publish draft to live
│   │   │       ├── taxonomy/
│   │   │       │   └── route.ts     # PATCH taxonomy arrays (admin)
│   │   │       ├── content-types/
│   │   │       │   └── route.ts     # PATCH content types (admin)
│   │   │       ├── kql-map/
│   │   │       │   └── route.ts     # PATCH KQL property map (admin)
│   │   │       ├── search-fields/
│   │   │       │   └── route.ts     # PATCH search fields (admin)
│   │   │       ├── keywords/
│   │   │       │   └── route.ts     # PATCH keyword synonym groups (admin)
│   │   │       ├── review-policies/
│   │   │       │   └── route.ts     # PATCH review policies (admin)
│   │   │       ├── search-behaviour/
│   │   │       │   └── route.ts     # PATCH search behaviour settings (admin)
│   │   │       ├── analytics/
│   │   │       │   └── route.ts     # GET usage stats, health, alerts, error monitoring, audit log (admin)
│   │   │       ├── tenant-info/
│   │   │       │   └── route.ts     # GET tenant info, admin roles, system status, version (admin)
│   │   │       ├── reset/
│   │   │       │   └── route.ts     # POST reset config to defaults (admin, audit-logged)
│   │   │       └── health/
│   │   │           └── route.ts     # GET system health checks (DB, Azure AD, AI, Graph API)
│   │   ├── admin/                   # Tenant Control Plane pages
│   │   │   ├── layout.tsx           # Admin shell — sidebar + header + auth guards
│   │   │   ├── page.tsx             # Tenant Overview — health, usage summary, alerts, error monitoring, audit log
│   │   │   ├── metadata/
│   │   │   │   └── page.tsx         # Department / Sensitivity / Status editors
│   │   │   ├── content-types/
│   │   │   │   └── page.tsx         # Content types editor
│   │   │   ├── keywords/
│   │   │   │   └── page.tsx         # Keywords & synonyms editor
│   │   │   ├── review-policies/
│   │   │   │   └── page.tsx         # Review policies editor (staleness thresholds)
│   │   │   ├── search-behaviour/
│   │   │   │   └── page.tsx         # Default filters, result limits, ranking weights
│   │   │   ├── kql-config/
│   │   │   │   └── page.tsx         # KQL property map + search fields editors
│   │   │   ├── settings/
│   │   │   │   └── page.tsx         # Tenant info, access control, system status, version
│   │   │   ├── version-history/
│   │   │   │   └── page.tsx         # Config version history with rollback
│   │   │   └── system-health/
│   │   │       └── page.tsx         # System health dashboard (DB, Azure AD, AI, Graph API)
│   │   ├── layout.tsx               # Root layout — wraps app in MsalProvider, Barlow font
│   │   ├── page.tsx                 # Home page — AuthGuard > TenantConfigProvider > AppShell > ChatPage
│   │   ├── globals.css              # Tailwind CSS + ocean blue theme + WhatsApp wallpaper
│   │   └── favicon.ico
│   │
│   ├── components/
│   │   ├── admin/
│   │   │   ├── admin-auth-guard.tsx  # Gates admin portal behind Azure AD admin roles
│   │   │   ├── admin-sidebar.tsx    # Grouped nav — Overview, Taxonomy, Governance sections
│   │   │   ├── admin-header.tsx     # Top bar with tenant name + user info
│   │   │   ├── save-bar.tsx         # SaveBar (reset/save/draft buttons) + MessageBanner (success/error feedback)
│   │   │   ├── draft-banner.tsx    # Amber banner for unpublished drafts (publish/discard actions)
│   │   │   ├── section-card.tsx     # SectionCard — white card wrapper with title + optional description
│   │   │   ├── editable-list.tsx    # Reusable add/remove/reorder list component
│   │   │   ├── stat-card.tsx        # Dashboard stat card (value + label + trend)
│   │   │   ├── daily-chart.tsx      # CSS bar chart for daily usage breakdown
│   │   │   ├── health-indicator.tsx # Tenant health status (healthy/warning/degraded)
│   │   │   ├── kql-map-editor.tsx   # Key-value table editor for KQL property map
│   │   │   ├── keyword-editor.tsx   # Keyword groups with synonym management
│   │   │   └── review-policy-editor.tsx # Per-content-type staleness rules editor
│   │   │
│   │   ├── auth/
│   │   │   ├── auth-guard.tsx       # Gates content behind M365 login
│   │   │   └── login-button.tsx     # Sign in / Sign out button (opens popup)
│   │   │
│   │   ├── shell/
│   │   │   ├── app-shell.tsx        # Layout wrapper — GlobalHeader + AppSidebar + main content
│   │   │   ├── global-header.tsx    # 56px sticky header — logo, env badge, profile dropdown, sign out
│   │   │   ├── app-sidebar.tsx      # 240px/56px collapsible sidebar — recent, saved, favorites, admin link
│   │   │   └── sidebar-context.tsx  # React context — executeQuery/registerExecuteQuery for sidebar→chat
│   │   │
│   │   ├── chat/
│   │   │   ├── chat-page.tsx        # Main orchestrator — 4-phase flow (search → cards → stream → render)
│   │   │   ├── chat-input.tsx       # Input with Send icon, clear button, rotating placeholder, 200-char limit
│   │   │   ├── site-selector.tsx    # Always-visible multi-select site dropdown (scopes search to selected sites)
│   │   │   ├── filter-bar.tsx       # Dynamic taxonomy filters + safety toggles + mobile bottom sheet
│   │   │   ├── message-list.tsx     # Scrollable message area with auto-scroll
│   │   │   ├── message-bubble.tsx   # Bubbles + AI label + expand/collapse + CitedText + streaming cursor
│   │   │   ├── file-result-card.tsx # File card with safety banners + copy/favorite/preview buttons
│   │   │   ├── empty-state.tsx      # Welcome screen with example queries + recent searches + tips
│   │   │   ├── no-results-state.tsx # No results feedback with suggestions + clear filters
│   │   │   ├── error-state.tsx      # Error display with retry button + role="alert"
│   │   │   └── document-preview-panel.tsx  # 320px slide-in panel with full document metadata
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
│   │       ├── separator.tsx
│   │       └── sr-only-announce.tsx  # Screen reader live region announcements
│   │
│   ├── hooks/
│   │   ├── use-admin-api.ts        # Admin hooks: useAdminToken, useAdminFetch, useAdminSave, useAdminConfig
│   │   ├── use-user-data.ts        # User data hooks: useSavedQueries, useFavorites, useRecentSearches
│   │   └── use-media-query.ts      # Responsive breakpoint hook (window.matchMedia)
│   │
│   ├── lib/
│   │   ├── admin-auth.ts           # JWT extraction, SHA-256 hashing, admin role verification via Graph API
│   │   ├── msal-config.ts          # MSAL configuration and auth scopes (search + admin)
│   │   ├── prisma.ts               # Singleton Prisma client with LibSQL adapter (Turso)
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
│   ├── DEPLOYMENT.md                # Vercel deployment, Turso setup, env vars, troubleshooting
│   ├── TROUBLESHOOTING.md           # Troubleshooting runbook — auth, search, AI, DB, deployment
│   ├── API-REFERENCE.md             # REST API endpoint documentation
│   ├── ADMIN-USER-GUIDE.md          # Administrator portal user guide
│   ├── ENTERPRISE-NEXT-STEPS.md     # Enterprise feature progress tracker
│   └── roadmap.md                   # Component roadmap + next stage development
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
                    └── AppShell
                        ├── GlobalHeader (logo, env badge, profile dropdown, sign out)
                        ├── AppSidebar (recent searches, saved queries, favorites, admin link)
                        └── ChatPage
                            ├── SiteSelector (always-visible multi-select site dropdown)
                            ├── FilterBar (dynamic filters + toggles + mobile bottom sheet)
                            ├── EmptyState (when no messages — example queries + tips + recent searches)
                            ├── MessageList
                            │   └── MessageBubble (per message)
                            │       ├── AI Generated label (Sparkles icon)
                            │       ├── CitedText (streamed AI text + expand/collapse + citations)
                            │       ├── NoResultsState (suggestions + clear filters button)
                            │       ├── ErrorState (error message + retry button)
                            │       ├── IntentIndicator (refined query + detected filters)
                            │       ├── FileResultCard (per search hit)
                            │       │   ├── Sensitivity banner (Confidential/Restricted)
                            │       │   ├── File info + metadata badges
                            │       │   ├── Summary excerpt + staleness warning
                            │       │   └── Open / Download / Copy Link / Favorite / Preview buttons
                            │       └── Compliance disclaimer
                            ├── ChatInput (200-char limit + clear button + rotating placeholder)
                            └── DocumentPreviewPanel (320px slide-in, full metadata, Escape closes)
```

### Tenant Control Plane (Admin Portal)

```
layout.tsx
└── MsalProviderWrapper
    └── admin/layout.tsx
        └── AuthGuard
            └── AdminAuthGuard (verifies Global Admin / SharePoint Admin role)
                ├── (denied) → "Access Denied" + link back to chat
                └── (authorized)
                    ├── AdminSidebar (grouped: Overview, Taxonomy, Governance, Administration)
                    ├── AdminHeader (tenant name + user info)
                    └── <page content>
                        ├── /admin                → Tenant Overview (health, usage summary,
                        │                           alerts, error monitoring, query insights,
                        │                           peak hours, DailyChart, audit log)
                        ├── /admin/settings       → Tenant info, access control (role counts),
                        │                           system status, version info
                        ├── /admin/version-history → Config version list with rollback
                        ├── /admin/system-health  → System health dashboard (DB, Azure AD, AI, Graph API)
                        ├── /admin/metadata       → EditableList ×3 (Department, Sensitivity, Status)
                        ├── /admin/content-types  → EditableList ×1 (content types)
                        ├── /admin/keywords       → KeywordEditor (synonym groups)
                        ├── /admin/review-policies → ReviewPolicyEditor (per-content-type staleness)
                        ├── /admin/search-behaviour → Toggles, sliders (safety, limits, weights)
                        └── /admin/kql-config     → KqlMapEditor + EditableList (search fields)
```

## Key Data Flow

### Chat Flow

```
On mount: graph-search.ts → fetchUserSites() → GET /sites?search=* → populate SiteSelector
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
    ├── useAdminConfig() or useAdminFetch() hook
    │   ├── useAdminToken() → acquireTokenSilent(Directory.Read.All)
    │   └── GET /api/admin/config (auto-provisions tenant on first visit)
    │       ├── Middleware: decode JWT → x-tenant-id header
    │       ├── Route: verifyAdminRole() → Graph API
    │       └── Prisma: upsert Tenant + TenantConfig (seed defaults)
    │
    ├── Admin edits values in UI
    │
    ├── Save → useAdminSave() → PATCH /api/admin/{taxonomy|content-types|...}
    │   ├── Middleware: decode JWT → x-tenant-id, x-user-id, x-user-name headers
    │   ├── Route: checkAdmin() → Graph API role verification
    │   ├── Prisma: update TenantConfig
    │   ├── logAudit() → AuditLog entry (fire-and-forget)
    │   └── createConfigVersion() → ConfigVersion snapshot (fire-and-forget)
    │
    ├── Save as Draft → POST /api/admin/config/draft
    │   └── ConfigVersion with status="draft" (TenantConfig unchanged)
    │
    ├── Publish Draft → POST /api/admin/config/publish
    │   └── Copy draft snapshot to TenantConfig, mark draft as published
    │
    ├── Rollback → POST /api/admin/config/versions/[id]/rollback
    │   └── Copy target snapshot to TenantConfig, create "rollback" version
    │
    └── Changes take effect on next chat page load (TenantConfigProvider refetches)
```

## Library Module Responsibilities

| Module | Purpose |
|---|---|
| `admin-auth.ts` | JWT decoding, SHA-256 hashing, admin role verification, audit logging, shared `checkAdmin()`, config versioning via `createConfigVersion()` |
| `prisma.ts` | Singleton Prisma client with LibSQL adapter for Turso (dev-safe global caching) |
| `taxonomy-defaults.ts` | Hardcoded defaults for taxonomy, keywords, review policies, search behaviour |
| `graph-search.ts` | Orchestrates the full retrieval pipeline + fetches user's accessible sites. Includes `normalizeHit()` (reconstructs name/webUrl from Graph fields), `getFields()` (camelCase→PascalCase normalization), `findField()` (multi-key lookup), `getSharePointRoot()` (derives tenant URL from MSAL account) |
| `intent.ts` | Classifies queries, extracts entities, expands synonyms, refines search terms |
| `ranking.ts` | Scores and re-orders results by configurable relevance weights |
| `taxonomy.ts` | TenantTaxonomyConfig interface (7 sections), MetadataFilters, KQL filter construction |
| `content-prep.ts` | Deduplication (by listItemUniqueId → webUrl → hitId), summary formatting, highlight tag stripping, page detection |
| `safety.ts` | Input/content sanitisation, sensitivity checks, policy-aware freshness assessment |
| `context-builder.ts` | Prepares document context + conversation history for Claude API |
| `prompts.ts` | Builds Claude system prompt with document injection + keyword grounding |
| `msal-config.ts` | Azure AD auth configuration — search and admin scope sets |
| `graph-branding.ts` | Tenant logo fetching from organisational branding API |
| `file-utils.ts` | File extension mapping, site/folder URL parsing, file size formatting |
