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

### Vercel Postgres (Admin Portal)

The admin portal stores per-tenant configuration and usage analytics in PostgreSQL:

1. Go to Vercel Dashboard > Storage > Add > Postgres
2. Connect it to your project — `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` are auto-set
3. Push the schema: `npx prisma db push`

### Environment Variables (Vercel Dashboard)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_AZURE_CLIENT_ID` | `f1eaf3ca-725c-4559-9306-af1afdbcf73f` |
| `NEXT_PUBLIC_AZURE_REDIRECT_URI` | `https://chat-iota-cyan.vercel.app` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` (server-only, powers AI synthesis) |
| `POSTGRES_PRISMA_URL` | Auto-set by Vercel Postgres (pooled connection) |
| `POSTGRES_URL_NON_POOLING` | Auto-set by Vercel Postgres (direct connection) |

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
# Edit .env.local with your Azure AD client ID, Anthropic API key, and Postgres URLs

# 3. Push database schema (requires Postgres URL in .env.local)
npx prisma db push
npx prisma generate

# 4. Run dev server
npm run dev
# Open http://localhost:3000 (chat) or http://localhost:3000/admin (admin portal)
```

> **Note**: The admin portal requires `Directory.Read.All` permission to be granted on the Azure AD app registration. Without it, admin role verification will fail.

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
| Admin portal "Access Denied" | User lacks admin role | Assign Global Admin or SharePoint Admin role in Azure AD |
| Admin portal "Access Denied" | Missing `Directory.Read.All` permission | Add the permission to the Azure AD app registration and grant admin consent |
| Admin config 500 errors | Missing Postgres env vars | Ensure `POSTGRES_PRISMA_URL` is set and run `npx prisma db push` |
| Filter bar shows defaults after admin edit | Config not reloaded | Refresh the page — `TenantConfigProvider` fetches config on mount |
