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
    ├── 5. Query submitted → 5-step retrieval pipeline
    │       ├── Intent detection
    │       ├── Filter merge + KQL construction
    │       ├── POST graph.microsoft.com/v1.0/search/query
    │       ├── Permission filtering (token-scoped)
    │       └── Deduplication + custom ranking
    │
    └── 6. Results displayed with safety controls
            ├── Sensitivity banners
            ├── Staleness warnings
            ├── Source attribution
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

### Local Taxonomy (`src/lib/taxonomy.ts`)

Predefined values for metadata filters:

| Field | Values |
|---|---|
| Department | Engineering, HR, Finance, Legal, Operations, Marketing, IT |
| Document Type | Policy, SOP, Guide, Template, Report, Form |
| Sensitivity | Public, Internal, Confidential, Restricted |
| Status | Draft, Approved, Archived |

### KQL Filter Construction

`buildKqlFilter()` converts active filters into KQL:
```
Department:"HR" AND DocType:"Policy" AND Status:"Approved" AND NOT Sensitivity:"Restricted"
```

Filters merge: auto-detected (from intent) + manual (from filter bar). Manual selections take priority.

### Filter Bar Toggles
- **Approved only** (default: ON) — `Status:"Approved"`
- **Hide restricted** (default: ON) — `NOT Sensitivity:"Restricted"`

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

### Outdated Policy Protection
- **`assessFreshness()`**: Detects archived docs, overdue reviews, stale content (>12 months)
- **Staleness warnings**: Orange warning line on affected cards
- **Ranking penalties**: Archived -100, Stale -50, Overdue review -30

## Tenant Branding

On login, the app fetches the tenant's logo from the Microsoft Graph organisational branding API:

```
GET /organization/{tenantId}/branding/localizations/default/bannerLogo
```

Falls back to `squareLogo`, then to plain text if no branding is configured.
