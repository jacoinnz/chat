# Deployment

## Vercel

The app is deployed to Vercel at **https://chat-iota-cyan.vercel.app**.

### Configuration

- **GitHub repo**: https://github.com/jacoinnz/chat
- **Framework Preset**: Next.js (set via `vercel.json`)
- **Build Command**: `next build` (default)
- **Output Directory**: `.next` (default)

### vercel.json

```json
{
  "framework": "nextjs"
}
```

This file is required — without it, Vercel may detect the wrong framework and produce 404 errors.

### Environment Variables (Vercel Dashboard)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_AZURE_CLIENT_ID` | `f1eaf3ca-725c-4559-9306-af1afdbcf73f` |
| `NEXT_PUBLIC_AZURE_REDIRECT_URI` | `https://chat-iota-cyan.vercel.app` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` (server-only, powers AI synthesis) |

### Deploy Process

Automatic deployment on push to `main`:

```
git push origin main → GitHub → Vercel auto-builds → live at chat-iota-cyan.vercel.app
```

### Manual Deploy (CLI)

```bash
npx vercel --prod
```

## Local Development

```bash
# 1. Clone and install
git clone https://github.com/jacoinnz/chat.git
cd chat
npm install

# 2. Set environment variables
cp .env.example .env.local
# Edit .env.local with your Azure AD client ID and Anthropic API key

# 3. Run dev server
npm run dev
# Open http://localhost:3000
```

### Azure AD Redirect URI for Local Dev

Make sure `http://localhost:3000` is registered as a SPA redirect URI in the Azure AD app registration.

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| 404 on Vercel | Missing `vercel.json` or wrong framework preset | Add `{"framework": "nextjs"}` to `vercel.json` |
| `block_nested_popups` | Stale MSAL interaction state in sessionStorage | Clear sessionStorage and retry |
| `no_token_request_cache_error` | Failed previous auth left stale cache | Handled automatically in `msal-provider.tsx` |
| Popup stays open | MSAL redirect bridge not loaded | Check `public/redirect.html` includes the bridge script |
| "No active account" on search | Active account not set after redirect | Fixed — `graph-search.ts` falls back to `getAllAccounts()[0]` |
| "AI summary unavailable" | Missing or invalid `ANTHROPIC_API_KEY` | Set the key in Vercel env vars or `.env.local` |
| AI answers but no search results | Graph API token issue | Check MSAL auth — AI only runs after successful search |
