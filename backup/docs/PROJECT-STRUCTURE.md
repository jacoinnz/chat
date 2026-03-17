# Project Structure

```
chat/
├── public/                          # Static assets served at /
│   ├── redirect.html                # MSAL popup redirect page (SRI-protected, no inline scripts)
│   ├── msal-redirect-bridge.min.js  # MSAL v5 redirect bridge script
│   ├── msal-redirect-init.js        # Extracted redirect bridge initialiser (SRI-protected)
│   └── *.svg                        # Default Next.js icons
│
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts         # Claude streaming API route (POST /api/chat)
│   │   ├── layout.tsx               # Root layout — wraps app in MsalProvider, Barlow font
│   │   ├── page.tsx                 # Home page — AuthGuard > ChatPage
│   │   ├── globals.css              # Tailwind CSS + ocean blue theme + WhatsApp wallpaper
│   │   └── favicon.ico
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   ├── auth-guard.tsx       # Gates content behind M365 login
│   │   │   └── login-button.tsx     # Sign in / Sign out button (opens popup)
│   │   │
│   │   ├── chat/
│   │   │   ├── chat-page.tsx        # Main orchestrator — 4-phase flow (search → cards → stream → render)
│   │   │   ├── chat-header.tsx      # Top bar — tenant logo, user avatar, sign out
│   │   │   ├── chat-input.tsx       # Input with Send icon, 200-char limit + counter
│   │   │   ├── filter-bar.tsx       # Site selector + 6 filter dropdowns + safety toggles + active filter chips
│   │   │   ├── message-list.tsx     # Scrollable message area with auto-scroll
│   │   │   ├── message-bubble.tsx   # WhatsApp-style bubbles + CitedText + streaming cursor
│   │   │   └── file-result-card.tsx # File card with safety banners + metadata tags + file size + review date + citation scroll target
│   │   │
│   │   ├── providers/
│   │   │   └── msal-provider.tsx    # MSAL initialisation and redirect handling
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
│   │   ├── msal-config.ts           # MSAL configuration and auth scopes
│   │   ├── graph-search.ts          # 5-step retrieval pipeline (intent → KQL → rank) + fetchUserSites()
│   │   ├── graph-branding.ts        # Tenant logo from organisational branding API
│   │   ├── intent.ts                # Query intent detection (keyword/question/topic/recent/person)
│   │   ├── ranking.ts               # Custom result ranking (recency, match, penalties)
│   │   ├── taxonomy.ts              # Two-tier metadata model (built-in + custom managed properties), KQL builder
│   │   ├── content-prep.ts          # Deduplication, summary extraction, page detection
│   │   ├── safety.ts                # Sanitisation, sensitivity checks, staleness detection
│   │   ├── file-utils.ts            # File type mapping, site/folder extraction, file size formatting
│   │   ├── context-builder.ts       # Prepares document context + conversation history for Claude
│   │   ├── prompts.ts               # Claude system prompt builder with document injection
│   │   └── utils.ts                 # cn() class name utility
│   │
│   └── types/
│       └── search.ts                # TypeScript types (SearchHit, ChatMessage, SharePointSite, DocumentContext)
│
├── docs/                            # Project documentation
│   ├── ARCHITECTURE.md              # System design, retrieval pipeline, safety controls
│   ├── PROJECT-STRUCTURE.md         # This file — directory tree + data flow
│   ├── AUTHENTICATION.md            # MSAL setup, Azure AD config, token flow
│   └── DEPLOYMENT.md                # Vercel deployment, env vars, troubleshooting
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

```
layout.tsx
└── MsalProviderWrapper
    └── page.tsx
        └── AuthGuard
            ├── (not authenticated) → Login screen + LoginButton
            ├── (main window)      → "Close this tab" message
            └── (popup, authenticated)
                └── ChatPage
                    ├── ChatHeader (tenant logo, avatar, sign out)
                    ├── FilterBar (site selector + 6 dropdowns + Approved only + Hide restricted + active filter chips)
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

## Key Data Flow

```
On mount: graph-search.ts → fetchUserSites() → GET /sites?search=* → populate site selector

ChatInput (user types query, max 200 chars)
    │
    ▼
ChatPage.handleSendMessage() — 4-phase flow
    │
    ├── Phase 1: Adds user message + loading bubble to state
    │
    ├── Phase 2: graph-search.ts — 5-step retrieval pipeline
    │   │
    │   ├── 1. intent.ts → analyzeIntent()
    │   │   └── Classify as keyword/question/topic/recent/person
    │   │   └── Extract taxonomy entities, author, file type
    │   │
    │   ├── 2. taxonomy.ts → mergeFilters() + buildKqlFilter()
    │   │   └── Manual filters (filter bar) + detected filters → KQL string
    │   │   └── Site scoping via Path:"url" KQL when site is selected
    │   │   └── Conflict resolution: toggles yield to explicit dropdowns; intent yields to filter bar
    │   │
    │   ├── 3. safety.ts → sanitizeForKql()
    │   │   └── Escape user input before KQL injection
    │   │
    │   ├── 4. POST /search/query (Graph API, token-scoped)
    │   │
    │   ├── 5. content-prep.ts → deduplicateHits()
    │   │   └── Remove duplicates by listItemUniqueId or name+size
    │   │
    │   └── 6. ranking.ts → rankResults()
    │       └── Custom scoring: recency, match, metadata, penalties
    │
    ├── Updates bubble: show file cards, set isStreaming: true
    │
    ├── Phase 3: AI synthesis (server-side)
    │   │
    │   ├── context-builder.ts → buildDocumentContext() (top 10 hits)
    │   ├── context-builder.ts → buildConversationHistory() (last 6 turns)
    │   ├── POST /api/chat → route.ts
    │   │   ├── prompts.ts → buildSystemPrompt() (instructions + documents)
    │   │   └── streamText() with Claude Sonnet → toTextStreamResponse()
    │   └── Stream read via ReadableStream reader
    │
    └── Phase 4: Render streamed response
         │
         ▼
    MessageBubble
    ├── CitedText (AI answer with clickable [N] citation badges + streaming cursor)
    ├── IntentIndicator ("HR policy" · Dept: HR · Recent first)
    ├── FileResultCard (per hit, id="file-card-{hitId}")
    │   ├── safety.ts → getSensitivityLevel() → warning banner
    │   ├── safety.ts → assessFreshness() → staleness warning + review date overdue
    │   ├── content-prep.ts → stripHighlightTags() → sanitised summary
    │   ├── file-utils.ts → formatFileSize() → human-readable size
    │   ├── Metadata badges: contentType, department, status, sensitivity, review date, keywords (split)
    │   └── Open / Download
    └── Disclaimer: "Verify against official sources"

Fallback: If Claude API fails → "Found N results. (AI summary unavailable)"
Cancellation: AbortController cancels stale streams on new message
```

## Library Module Responsibilities

| Module | Purpose |
|---|---|
| `graph-search.ts` | Orchestrates the full retrieval pipeline + fetches user's accessible sites |
| `intent.ts` | Classifies queries, extracts entities, refines search terms |
| `ranking.ts` | Scores and re-orders results by relevance signals |
| `taxonomy.ts` | Two-tier metadata model (built-in + custom managed properties), SEARCH_FIELDS, KQL filter construction with site scoping + conflict resolution |
| `content-prep.ts` | Deduplication, summary formatting, page detection |
| `safety.ts` | Input/content sanitisation, sensitivity checks, freshness assessment |
| `context-builder.ts` | Prepares document context + conversation history for Claude API |
| `prompts.ts` | Builds Claude system prompt with document injection |
| `msal-config.ts` | Azure AD auth configuration and scopes |
| `graph-branding.ts` | Tenant logo fetching from organisational branding API |
| `file-utils.ts` | File extension mapping, site/folder URL parsing, file size formatting |
