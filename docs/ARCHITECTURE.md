# Architecture

## Overview

SharePoint Search Chat is a Next.js application that authenticates users via Microsoft Entra ID (Azure AD), queries the Microsoft Graph Search API to find files across SharePoint sites, and synthesises conversational AI answers using Anthropic Claude. Graph Search calls are made client-side using the user's own access token. AI synthesis runs server-side via a streaming API route.

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
    ├── 5. Query submitted → 5-step retrieval pipeline
    │       ├── Intent detection
    │       ├── Filter merge + KQL construction
    │       ├── POST graph.microsoft.com/v1.0/search/query
    │       ├── Permission filtering (token-scoped)
    │       └── Deduplication + custom ranking
    │
    ├── 6. Results displayed with safety controls
    │       ├── Sensitivity banners
    │       ├── Staleness warnings
    │       ├── Source attribution
    │       └── Open / Download links to SharePoint
    │
    └── 7. AI synthesis (server-side streaming)
            ├── POST /api/chat with document context + conversation history
            ├── Claude synthesises answer with [1][2] citations
            ├── Response streams back via Vercel AI SDK
            └── Citations rendered as clickable badges linking to file cards
```

## Multi-Tenant Model

The app uses a single Azure AD app registration with `authority: https://login.microsoftonline.com/common`. Any Microsoft 365 organisation can use the app — the tenant admin grants consent once via the admin consent URL, and all users in that tenant can then sign in.

Each user's access token determines which SharePoint files they can see. Per-tenant metadata configuration is stored in Turso (edge SQLite) and managed through the admin portal at `/admin`.

### Tenant Configuration Flow

```
Regular User                      Admin User (Tenant Control Plane)
    │                                 │
    ├── GET /api/tenant-config        ├── GET /api/admin/config
    │   ├── DB record exists?         │   ├── Auto-provisions tenant + config
    │   │   ├── Yes → return config   │   │   (seeds defaults on first access)
    │   │   └── No  → return defaults │   └── Returns full config (all 7 sections)
    │   └── DB error → return defaults│
    │                                 ├── PATCH taxonomy / content-types / keywords
    └── Filter bar + intent detection │   └── Metadata & taxonomy management
        + keyword synonym expansion   │
        + review policy staleness     ├── PATCH review-policies / search-behaviour
        + search behaviour defaults   │   └── Governance controls
                                      │
                                      ├── PATCH kql-map / search-fields
                                      │   └── SharePoint property mapping
                                      │
                                      └── GET /api/admin/analytics
                                          └── Monitoring + tenant health indicators
```

### Data Model (Prisma)

- **Tenant** — Azure AD tenant GUID, name, timestamps
- **TenantConfig** — 1:1 with Tenant. JSON columns: `taxonomy`, `contentTypes`, `kqlPropertyMap`, `searchFields`, `keywords`, `reviewPolicies`, `searchBehaviour`
- **UsageLog** — Event type (search/chat/error/no_results/graph_error/auth_error), SHA-256 hashed user ID, result count, filter keys used, intent type, timestamp. Indexed by `(tenantId, timestamp)` and `(tenantId, event)`.

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
- **Admin portal**: Acquires additional scope `Directory.Read.All` for admin role verification
- **Token refresh**: `acquireTokenSilent` (automatic, uses cached refresh token)
- **Fallback**: `acquireTokenPopup` if silent fails (e.g., consent required)
- **Storage**: `sessionStorage` (tokens cleared when browser closes; no cross-session persistence)

## Retrieval Pipeline

The app uses a 5-step retrieval pipeline (`src/lib/graph-search.ts`):

### Step 1: Receive User Question
User submits query via `ChatInput` → `ChatPage.handleSendMessage()`.

### Step 2: Identify Intent (`src/lib/intent.ts`)
Rule-based intent detection classifies the query:

| Intent | Trigger | Action |
|---|---|---|
| `keyword` | Default | Standard KQL search |
| `question` | Starts with who/what/how/why or ends with `?` | Strip question words, extract keywords |
| `topic` | Query matches a taxonomy value (e.g., "SOP", "HR") | Auto-populate metadata filters |
| `recent` | Contains "latest", "newest", "recent" | Add `LastModifiedTime>=` KQL, boost recency in ranking |
| `person` | Contains "by [Name]" or "[Name]'s" | Add `Author:"Name"` to KQL |

Entity extraction also detects file types ("excel" → `FileType:xlsx`) and taxonomy values.

### Step 3: Query SharePoint via Graph Search API

```
POST https://graph.microsoft.com/v1.0/search/query
{
  "requests": [{
    "entityTypes": ["driveItem", "listItem"],
    "query": { "queryString": "refined query + KQL filters" },
    "fields": ["department", "docType", "sensitivity", "status", "reviewDate", "keywords"],
    "from": 0,
    "size": 15
  }]
}
```

KQL is constructed by combining:
- Sanitised refined query (question words stripped)
- Metadata filters from filter bar (`Department:"HR" AND Status:"Approved"`)
- Intent-detected extras (`Author:"name"`, `FileType:docx`, `LastModifiedTime>=date`)

### Step 4: Filter by Permissions
Handled automatically by Microsoft Graph — the user's access token restricts results to content they have permission to view.

### Step 5: Deduplicate + Rank

**Deduplication** (`src/lib/content-prep.ts`):
- By `listItemUniqueId` (exact same item)
- By `name + size` (same file in multiple locations)
- Keeps highest-ranked hit

**Custom Ranking** (`src/lib/ranking.ts`):

| Signal | Points | Condition |
|---|---|---|
| Graph rank (base) | `1000 - rank` | Always |
| Recency | +50 | Modified within 30 days |
| Recency | +25 | Modified within 90 days |
| Title match | +40 | File name contains query word |
| Summary match | +30 | Summary contains query string |
| Metadata match | +20 | Department/DocType matches filter |
| Approved status | +15 | Status is "Approved" |
| Document size | +10 | File > 10KB |
| SharePoint page | +10 | Result is a SP page |
| Archived | -100 | Status is "Archived" |
| Stale | -50 | Not modified in 12+ months |
| Overdue review | -30 | Review date is in the past |

When `sortByRecency` is true (intent = "recent"), recency weights are tripled.

## Metadata & Taxonomy Layer

### Dynamic Per-Tenant Configuration

Taxonomy values, content types, KQL property mappings, and search fields are now **configurable per tenant** via the admin portal. The system uses a layered approach:

1. **Hardcoded defaults** (`src/lib/taxonomy-defaults.ts`) — used when no tenant config exists
2. **Database config** (`TenantConfig` model) — per-tenant overrides set by admin
3. **Runtime resolution** — `TenantConfigProvider` loads config on mount, falls back to defaults on error

The `TenantTaxonomyConfig` interface (in `taxonomy.ts`) is threaded through `buildKqlFilter()`, `analyzeIntent()`, and `searchSharePoint()` as an optional parameter. When provided, tenant-specific values are used instead of hardcoded constants.

`FILE_TYPES` and `DATE_RANGES` are **not** tenant-configurable (built-in SharePoint properties).

### SharePoint Metadata Model (`src/lib/taxonomy.ts`)

The metadata model has two tiers:

**Tier 1 — Built-in managed properties** (always indexed, no tenant setup):

| Filter | KQL Managed Property | Notes |
|---|---|---|
| Content Type | `ContentType` | Document, Form, Report, Wiki Page, Task, etc. |
| File Type | `FileType` | docx, xlsx, pdf, pptx, etc. |
| Author | `Author` | Detected from query via intent analysis |
| Last Modified | `LastModifiedTime` | Date range filter (past week/month/3 months/year) |
| Site Scope | `Path` | Scopes search to a specific SharePoint site URL |

**Tier 2 — Custom managed properties** (require tenant admin to create site columns):

| Filter | Default KQL Property | Fallback (refinable slot) | Values |
|---|---|---|---|
| Department | `Department` | `RefinableString00` | Engineering, HR, Finance, Legal, Operations, Marketing, IT |
| Sensitivity | `Sensitivity` | `RefinableString01` | Public, Internal, Confidential, Restricted |
| Status | `Status` | `RefinableString02` | Draft, Approved, Archived |

Custom properties use auto-mapped managed property names by default. If auto-mapping doesn't work, the tenant admin can map site columns to refinable property slots via the admin portal at `/admin/kql-config` (or by editing `KQL_PROPERTY_MAP` in `taxonomy.ts` for the default config).

### Graph Search Fields

The `fields` parameter in the Graph Search API request specifies which list item fields to return for display. Field names use PascalCase to match SharePoint column internal names:

```typescript
SEARCH_FIELDS = ["ContentType", "Department", "Sensitivity", "Status", "ReviewDate", "Keywords"]
```

### KQL Filter Construction

`buildKqlFilter()` converts active filters into KQL:
```
ContentType:"Document" AND Department:"HR" AND Status:"Approved" AND NOT Sensitivity:"Restricted" AND FileType:xlsx AND LastModifiedTime>=2026-02-15 AND Path:"https://contoso.sharepoint.com/sites/HR"
```

Filters merge: auto-detected (from intent) + manual (from filter bar). Manual selections take priority.

**Conflict resolution:**
- When an explicit `status` is selected in the filter bar, the `approvedOnly` toggle is ignored to avoid contradictory KQL (e.g. `Status:"Approved" AND Status:"Draft"`)
- When an explicit `sensitivity` is selected, the `hideRestricted` toggle is ignored
- When the filter bar sets a file type or date range, intent-detected `FileType`/`LastModifiedTime` KQL is suppressed (`buildIntentKql` checks for filter-bar overrides)

### Filter Bar

**Site selector** (full-width dropdown): Lists all SharePoint sites the user has access to, fetched via `GET /sites?search=*`. Scopes search to the selected site using `Path:` KQL.

**Six dropdown filters** in a 3x2 grid: Content Type, Department, Sensitivity, Status, File Type, Modified (date range).

**Toggles:**
- **Approved only** (default: ON) — `Status:"Approved"` (auto-disabled when explicit status is selected)
- **Hide restricted** (default: ON) — `NOT Sensitivity:"Restricted"` (auto-disabled when explicit sensitivity is selected)

**Active filter chips:** Shown below the filter toggle bar, visible even when the filter panel is collapsed. Each chip shows the filter label and value with an X button to remove it individually. Site chips show the site display name instead of the raw URL. A "Clear filters" button resets all dropdown filters at once.

## Safety & Compliance Controls (`src/lib/safety.ts`)

### Data Leakage Prevention
- **Sensitivity banners**: Confidential docs show amber warning; Restricted show red
- **Hide restricted toggle**: Default ON, excludes Restricted from search via KQL
- `getSensitivityLevel()` classifies each result

### Prompt Injection Prevention
- **`sanitizeContent()`**: Strips ALL HTML tags, JS protocols, event handlers from Graph API summaries
- **`sanitizeForKql()`**: Escapes quotes, brackets, special chars before KQL insertion
- **Input limit**: 200 characters max with visible counter

### Hallucination Prevention
- **Source attribution**: Summaries prefixed with "Excerpt:" to clarify they're from documents
- **Compliance disclaimer**: "Results from SharePoint search. Verify against official sources."
- **Intent indicator**: Shows what the system detected so users know auto-filters were applied
- **Claude grounding**: System prompt instructs Claude to answer ONLY from provided documents
- **Citation format**: `[1]`, `[2]` citations link answers to specific source documents

### Transport & Browser Security
- **Content Security Policy**: `script-src 'self'` (no inline scripts, no eval); `style-src 'self' 'unsafe-inline'` (required for Next.js/Tailwind); `connect-src` allowlists Microsoft login + Graph API + Google Fonts
- **Subresource Integrity**: SRI hashes on auth redirect scripts (`redirect.html`)
- **Security headers**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` (HSTS with preload), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo disabled)
- **Token storage**: `sessionStorage` — MSAL tokens do not persist across browser sessions, reducing XSS token-theft window

### Outdated Policy Protection
- **`assessFreshness()`**: Detects archived docs, overdue reviews, stale content (>12 months)
- **Staleness warnings**: Orange warning line on affected cards
- **Ranking penalties**: Archived -100, Stale -50, Overdue review -30

## AI Synthesis Layer

After search results are displayed, the app sends document metadata and conversation history to a server-side API route that streams a Claude-generated answer.

### Architecture

```
Browser                              Server
  │                                    │
  ├── Phase 1: searchSharePoint()      │
  │   (Graph API, MSAL token)          │
  │                                    │
  ├── Phase 2: Render file cards       │
  │                                    │
  ├── Phase 3: POST /api/chat ────────►│
  │   { messages, currentDocuments }   ├── Build system prompt (src/lib/prompts.ts)
  │                                    ├── streamText() with Claude Sonnet
  │◄── streamed plain text ────────────┤   (Vercel AI SDK + @ai-sdk/anthropic)
  │                                    │
  └── Phase 4: Render streamed text    │
      with [N] citation badges         │
```

### Key Constraint

The MSAL access token never leaves the browser. The server API route only receives sanitised document summaries and conversation history — never raw tokens or full document content.

### API Route: `POST /api/chat` (`src/app/api/chat/route.ts`)

| Setting | Value |
|---|---|
| Model | `claude-sonnet-4-20250514` |
| Temperature | 0.3 (factually grounded) |
| Max output tokens | 1024 |
| Streaming | `toTextStreamResponse()` (plain UTF-8 chunks) |

**Request body** (`ChatApiRequest`):
- `messages`: Conversation history (last 6 turns, user + assistant messages)
- `currentDocuments`: Top 10 search results as `DocumentContext` objects

**Error handling**: Returns `400` (missing data) or `500` (generation failure) as JSON. Client falls back to showing results without AI summary.

### Context Preparation (`src/lib/context-builder.ts`)

**`buildDocumentContext(hits)`**: Converts top 10 `SearchHit` objects into compact `DocumentContext` with:
- 1-based index for `[1]`, `[2]` citations
- Sanitised summary via `stripHighlightTags()`
- Freshness assessment via `assessFreshness()`
- Sensitivity level via `getSensitivityLevel()`

**`buildConversationHistory(messages)`**: Filters out welcome/loading/streaming messages, takes last 6 turns (12 messages) for token budget.

### System Prompt (`src/lib/prompts.ts`)

Instructs Claude to:
- Synthesise answers ONLY from provided Source Documents
- Use `[1]`, `[2]` citation format matching document indices
- Combine insights across multiple documents
- Acknowledge when information is insufficient
- Warn about stale or sensitive content
- Handle follow-up questions using conversation context

Document context is injected as a structured section at the end of the system prompt, separated from instructions (prompt injection defense).

### Citation Rendering (`CitedText` in `src/components/chat/message-bubble.tsx`)

- Splits streamed content on `[N]` regex patterns
- Renders each `[N]` as a clickable `<sup>` badge
- Clicking a citation scrolls to and highlights the corresponding `FileResultCard` via `id="file-card-{hitId}"`
- Shows a blinking cursor while `isStreaming` is true

### Stream Cancellation

An `AbortController` ref in `ChatPage` cancels in-flight streams when the user sends a new message, preventing stale responses from overwriting fresh ones.

### Graceful Fallback

If the Claude API fails for any reason (missing key, rate limit, network error), the app shows "Found N results. (AI summary unavailable)" and the file cards remain fully functional.

## Tenant Branding

On login, the app fetches the tenant's logo from the Microsoft Graph organisational branding API:

```
GET /organization/{tenantId}/branding/localizations/default/bannerLogo
```

Falls back to `squareLogo`, then to plain text if no branding is configured.

## Admin Portal

### Architecture

```
Admin Browser                                Server
  │                                            │
  ├── 1. MSAL acquires token with              │
  │      Directory.Read.All scope              │
  │                                            │
  ├── 2. AdminAuthGuard checks admin role      │
  │      GET /me/memberOf ──────────────────► Graph API
  │      ◄── directory roles ─────────────────┤
  │      Check for Global Admin / SP Admin     │
  │                                            │
  ├── 3. Admin portal loads config             │
  │      GET /api/admin/config ──────────────►│
  │      (middleware extracts tenant from JWT)  ├── verifyAdminRole() → Graph API
  │      ◄── tenant config ──────────────────┤  ├── Auto-provision if first visit
  │                                            │  └── Return config from Turso
  │                                            │
  ├── 4. Admin edits metadata/KQL/etc.         │
  │      PATCH /api/admin/taxonomy ──────────►│
  │      ◄── updated config ─────────────────┤
  │                                            │
  └── 5. Changes propagate to chat users       │
         (TenantConfigProvider refetches       │
          on next page load)                   │
```

### Auth Infrastructure

**Edge Middleware** (`src/middleware.ts`):
- Matches `/api/admin/*`, `/api/tenant-config`, `/api/usage`
- Decodes JWT (no cryptographic verification — Microsoft-issued tokens verified by Graph on use)
- Extracts `tid` (tenant ID) and `oid` (user ID) from token claims
- Forwards as `x-tenant-id` and `x-user-id` headers to route handlers
- Returns 401 for missing or malformed tokens

**Admin Auth** (`src/lib/admin-auth.ts`):
- `extractTenantInfo(request)` — parse JWT, compute SHA-256 of user OID
- `verifyAdminRole(accessToken)` — call `GET /me/memberOf`, check for Global Administrator (`62e90394-...`) or SharePoint Administrator (`f28a1f94-...`) role template IDs

**Client-Side Guard** (`src/components/admin/admin-auth-guard.tsx`):
- Acquires token with `Directory.Read.All` scope
- Calls Graph API to verify admin role before rendering the admin UI
- Shows "Access Denied" page with link back to chat if not admin

### Usage Analytics

- Events logged via `POST /api/usage` from the chat client (fire-and-forget, non-blocking)
- Three event types: `search`, `chat`, `error`
- User identity anonymised via SHA-256 hash of Azure AD object ID
- Rate limited: 100 events per user per minute (in-memory counter)
- Analytics API returns aggregated counts + daily breakdown for configurable periods (7d/30d/90d)

### Database Layer

**Prisma 7** with `@prisma/adapter-libsql` driver adapter (Turso):
- Schema at `prisma/schema.prisma` (SQLite provider — Turso is LibSQL/SQLite-compatible)
- Config at `prisma/prisma.config.ts` (datasource URL for migrations)
- Singleton client at `src/lib/prisma.ts` (dev-safe global caching pattern)

**Environment Variables:**
- `TURSO_DATABASE_URL` — Turso database URL (`libsql://...turso.io`)
- `TURSO_AUTH_TOKEN` — Turso authentication token
