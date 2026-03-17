# Project Structure

```
chat/
├── public/                          # Static assets served at /
│   ├── redirect.html                # MSAL popup redirect page
│   ├── msal-redirect-bridge.min.js  # MSAL v5 redirect bridge script
│   └── *.svg                        # Default Next.js icons
│
├── src/
│   ├── app/                         # Next.js App Router
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
│   │   │   ├── chat-page.tsx        # Main orchestrator — state, search, layout
│   │   │   ├── chat-header.tsx      # Top bar — tenant logo, user avatar, sign out
│   │   │   ├── chat-input.tsx       # Input with Send icon, 200-char limit + counter
│   │   │   ├── filter-bar.tsx       # Collapsible filter dropdowns + safety toggles
│   │   │   ├── message-list.tsx     # Scrollable message area with auto-scroll
│   │   │   ├── message-bubble.tsx   # WhatsApp-style bubbles + intent indicator + disclaimer
│   │   │   └── file-result-card.tsx # File card with safety banners + metadata + staleness
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
│   │   ├── graph-search.ts          # 5-step retrieval pipeline (intent → KQL → rank)
│   │   ├── graph-branding.ts        # Tenant logo from organisational branding API
│   │   ├── intent.ts                # Query intent detection (keyword/question/topic/recent/person)
│   │   ├── ranking.ts               # Custom result ranking (recency, match, penalties)
│   │   ├── taxonomy.ts              # Metadata filters, TAXONOMY values, KQL builder
│   │   ├── content-prep.ts          # Deduplication, summary extraction, page detection
│   │   ├── safety.ts                # Sanitisation, sensitivity checks, staleness detection
│   │   ├── file-utils.ts            # File type mapping, site/folder extraction
│   │   └── utils.ts                 # cn() class name utility
│   │
│   └── types/
│       └── search.ts                # TypeScript types for Graph API responses + ChatMessage
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
├── next.config.ts                   # Next.js configuration
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
                    ├── FilterBar (dropdowns + Approved only + Hide restricted)
                    ├── MessageList
                    │   └── MessageBubble (per message)
                    │       ├── IntentIndicator (refined query + detected filters)
                    │       ├── FileResultCard (per search hit)
                    │       │   ├── Sensitivity banner (Confidential/Restricted)
                    │       │   ├── File info + metadata badges
                    │       │   ├── Summary excerpt
                    │       │   ├── Staleness warning
                    │       │   └── Open / Download buttons
                    │       └── Compliance disclaimer
                    └── ChatInput (200-char limit + counter)
```

## Key Data Flow

```
ChatInput (user types query, max 200 chars)
    │
    ▼
ChatPage.handleSendMessage()
    │
    ├── Adds user message + loading bubble to state
    │
    ├── graph-search.ts: 5-step retrieval pipeline
    │   │
    │   ├── 1. intent.ts → analyzeIntent()
    │   │   └── Classify as keyword/question/topic/recent/person
    │   │   └── Extract taxonomy entities, author, file type
    │   │
    │   ├── 2. taxonomy.ts → mergeFilters() + buildKqlFilter()
    │   │   └── Manual filters (filter bar) + detected filters → KQL string
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
    └── Updates loading bubble with ranked results + intent
         │
         ▼
    MessageBubble
    ├── IntentIndicator ("HR policy" · Dept: HR · Recent first)
    ├── FileResultCard (per hit)
    │   ├── safety.ts → getSensitivityLevel() → warning banner
    │   ├── safety.ts → assessFreshness() → staleness warning
    │   ├── content-prep.ts → stripHighlightTags() → sanitised summary
    │   └── Open / Download
    └── Disclaimer: "Verify against official sources"
```

## Library Module Responsibilities

| Module | Purpose |
|---|---|
| `graph-search.ts` | Orchestrates the full retrieval pipeline |
| `intent.ts` | Classifies queries, extracts entities, refines search terms |
| `ranking.ts` | Scores and re-orders results by relevance signals |
| `taxonomy.ts` | Predefined metadata values, KQL filter construction |
| `content-prep.ts` | Deduplication, summary formatting, page detection |
| `safety.ts` | Input/content sanitisation, sensitivity checks, freshness assessment |
| `msal-config.ts` | Azure AD auth configuration and scopes |
| `graph-branding.ts` | Tenant logo fetching from organisational branding API |
| `file-utils.ts` | File extension mapping, site/folder URL parsing |
