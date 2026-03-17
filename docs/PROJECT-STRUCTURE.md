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
│   │   ├── layout.tsx               # Root layout — wraps app in MsalProvider
│   │   ├── page.tsx                 # Home page — AuthGuard > ChatPage
│   │   ├── globals.css              # Tailwind CSS imports
│   │   └── favicon.ico
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   ├── auth-guard.tsx       # Gates content behind M365 login
│   │   │   └── login-button.tsx     # Sign in / Sign out button
│   │   │
│   │   ├── chat/
│   │   │   ├── chat-page.tsx        # Main orchestrator — state, search, layout
│   │   │   ├── chat-header.tsx      # Top bar — tenant logo, user avatar, sign out
│   │   │   ├── chat-input.tsx       # Search input with submit button
│   │   │   ├── message-list.tsx     # Scrollable message area with auto-scroll
│   │   │   ├── message-bubble.tsx   # User/assistant message with loading state
│   │   │   └── file-result-card.tsx # File card — emoji, badge, Open/Download
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
│   │   ├── graph-search.ts          # SharePoint search via Microsoft Graph
│   │   ├── graph-branding.ts        # Tenant logo from organisational branding API
│   │   ├── file-utils.ts            # File type mapping, site/folder extraction
│   │   └── utils.ts                 # cn() class name utility
│   │
│   └── types/
│       └── search.ts                # TypeScript types for Graph API responses
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
                    ├── MessageList
                    │   └── MessageBubble (per message)
                    │       └── FileResultCard (per search hit)
                    └── ChatInput
```

## Key Data Flow

```
ChatInput (user types query)
    │
    ▼
ChatPage.handleSendMessage()
    │
    ├── Adds user message + loading bubble to state
    │
    ├── graph-search.ts → acquireTokenSilent → POST /search/query
    │
    └── Updates loading bubble with results or error
         │
         ▼
    MessageBubble → FileResultCard (Open / Download)
```
