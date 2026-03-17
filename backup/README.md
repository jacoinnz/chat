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
https://login.microsoftonline.com/common/adminconsent?client_id=YOUR_CLIENT_ID&redirect_uri=https://chat-iota-cyan.vercel.app
```

The admin clicks the link, signs in, and approves the permissions. After that, all users in their organisation can sign in and search their SharePoint files.

## Tech Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS + shadcn/ui
- MSAL React (Multi-tenant Microsoft 365 authentication)
- Microsoft Graph Search API
- Anthropic Claude Sonnet via Vercel AI SDK (`ai`, `@ai-sdk/anthropic`)

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

## Project Structure

```
src/
  app/
    api/chat/route.ts        # Claude streaming API route
    layout.tsx                # Root layout with MSAL provider
    page.tsx                  # Entry point
  components/
    auth/
      auth-guard.tsx          # Authentication gate
      login-button.tsx        # Sign in / sign out
    chat/
      chat-page.tsx           # Main chat orchestrator (4-phase flow)
      chat-header.tsx         # Header with branding + user avatar
      chat-input.tsx          # Message input with character limit
      filter-bar.tsx          # Site selector + metadata filters (6 dropdowns + toggles + chips)
      message-bubble.tsx      # Message display with CitedText + streaming
      message-list.tsx        # Scrollable message container
      file-result-card.tsx    # SharePoint file result card
    providers/
      msal-provider.tsx       # MSAL initialization wrapper
    ui/                       # shadcn/ui primitives
  lib/
    context-builder.ts        # Prepares documents + history for Claude API
    content-prep.ts           # Summary sanitization, deduplication
    file-utils.ts             # File type detection, path extraction, size formatting
    graph-branding.ts         # Org branding logo fetch
    graph-search.ts           # Microsoft Graph Search API client + site fetching
    intent.ts                 # Query intent analysis + entity extraction
    msal-config.ts            # Azure AD configuration
    prompts.ts                # Claude system prompt builder
    ranking.ts                # Custom result re-ranking
    safety.ts                 # Input sanitization, sensitivity, staleness
    taxonomy.ts               # Two-tier metadata model, managed properties, KQL filter builder
    utils.ts                  # Tailwind class merge utility
  types/
    search.ts                 # TypeScript interfaces (SearchHit, ChatMessage, SharePointSite, etc.)
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
- All filter values validated against fixed taxonomy constants before KQL insertion
- `npm run audit` scans production dependencies for known vulnerabilities
