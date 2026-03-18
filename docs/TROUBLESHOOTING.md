# Troubleshooting Runbook

This document provides solutions to common issues in the SharePoint Search Chat application.

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [Search Issues](#search-issues)
- [AI Chat Issues](#ai-chat-issues)
- [Database Issues](#database-issues)
- [Admin Portal Issues](#admin-portal-issues)
- [Cron Jobs](#cron-jobs)
- [Deployment Issues](#deployment-issues)
- [Secret Rotation](#secret-rotation)
- [Health Check](#health-check)

---

## Authentication Issues

### "No active account" / MSAL login failures

**Symptoms:** Users cannot log in, see blank screen or error messages during authentication flow.

**Solutions:**

1. Verify Azure AD application configuration:
   - Check `NEXT_PUBLIC_AZURE_CLIENT_ID` matches the Application (client) ID in Azure portal
   - Verify `NEXT_PUBLIC_AZURE_TENANT_ID` is correct
   - Confirm redirect URI is registered in Azure AD app under "Authentication"

2. Check redirect URI configuration:
   ```bash
   # Verify these match exactly (including trailing slashes)
   NEXT_PUBLIC_AZURE_REDIRECT_URI=https://your-domain.com/auth/callback
   ```

3. Clear browser cache and local storage:
   - Open browser DevTools > Application > Local Storage
   - Delete all entries under your domain
   - Retry login

### Token expiration

**Symptoms:** Users get logged out frequently, need to re-authenticate.

**Solutions:**

1. MSAL should handle silent token renewal automatically. If this fails:
   - Check browser console for `acquireTokenSilent` errors
   - Verify `Sites.Read.All` scope is granted in Azure AD
   - Force a full re-login to refresh the session

2. Check token lifetime settings in Azure AD:
   - Navigate to Azure AD > App registrations > Token configuration
   - Review access token and refresh token lifetimes

### Admin portal access denied (403)

**Symptoms:** User can log in but gets 403 when accessing `/admin` routes.

**Solutions:**

1. Verify user has required Azure AD role:
   - User needs **Global Administrator** OR **SharePoint Administrator** role
   - Check in Azure AD > Users > [user] > Assigned roles

2. Verify Graph API permissions:
   - App registration needs `Directory.Read.All` (delegated or application)
   - Admin consent must be granted for the permission

3. Check `AdminAuthGuard` is functioning:
   - Review `/src/components/admin/admin-auth-guard.tsx`
   - Check `/api/admin/check-admin` endpoint returns correct role

### Role-related 403s within admin portal

**Symptoms:** User can access some admin pages but not others.

**Solutions:**

1. Understand internal role hierarchy:
   ```
   platform_admin > config_admin > auditor > viewer
   ```

2. Check user's assigned internal role:
   - Query `UserRole` model in database for the user's tenant
   - Verify role assignment matches required permission level

3. Review `checkAdmin()` helper:
   - Located in `/src/lib/admin-auth.ts`
   - This shared helper gates all admin API routes

---

## Search Issues

### Zero results returned

**Symptoms:** Search queries return no results even though content exists in SharePoint.

**Solutions:**

1. Verify KQL property mappings:
   - Check `/admin/kql-config` matches actual SharePoint managed properties
   - Common properties: `Title`, `Path`, `FileType`, `LastModifiedTime`, `Author`
   - Use SharePoint Search Schema to confirm property names

2. Test KQL directly in SharePoint:
   - Navigate to `https://your-tenant.sharepoint.com/_api/search/query?querytext='test'`
   - Verify search service is working

3. Check search scope configuration:
   - Review tenant config for restricted paths or file types
   - Verify users have permissions to the content being searched

### Graph API 403 errors

**Symptoms:** Search requests fail with 403 Forbidden.

**Solutions:**

1. Verify user permissions:
   - User needs `Sites.Read.All` OR `Files.Read.All` delegated permission
   - Check permission grants in Azure AD > App registrations > API permissions

2. Check admin consent:
   - Some permissions require admin consent
   - Admin must grant consent in Azure AD portal

3. Verify user has SharePoint access:
   - User must have access to the SharePoint sites being searched
   - Test by having user access the site directly in browser

### Graph API 401 errors

**Symptoms:** Search requests fail with 401 Unauthorized.

**Solutions:**

1. Verify token scopes:
   - Check access token includes `Sites.Read.All` scope
   - Review MSAL configuration in `/src/lib/msal-config.ts`

2. Update scopes in MSAL request:
   ```typescript
   const scopes = ["Sites.Read.All", "User.Read"];
   ```

3. Clear token cache and re-authenticate:
   - Delete local storage entries
   - Force full login to acquire new token with correct scopes

### Slow search performance

**Symptoms:** Search queries take >5 seconds to complete.

**Solutions:**

1. Review search behaviour configuration:
   - Check `maxResults` setting in `/admin/search-behaviour`
   - Reduce if set too high (recommend 10-20 for optimal performance)

2. Optimize KQL queries:
   - Avoid wildcard searches at the beginning of terms
   - Use specific property restrictions where possible
   - Review KQL in `/admin/kql-config`

3. Consider implementing caching:
   - Add Redis or similar for frequently accessed searches
   - Cache search results with appropriate TTL

---

## AI Chat Issues

### "AI summary unavailable" error

**Symptoms:** AI chat returns error message instead of summary.

**Solutions:**

1. Verify Anthropic API key:
   ```bash
   # Check environment variable is set
   echo $ANTHROPIC_API_KEY
   ```

2. Test API key validity:
   ```bash
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -H "content-type: application/json" \
     -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":1024,"messages":[{"role":"user","content":"test"}]}'
   ```

3. Check Anthropic API status:
   - Visit https://status.anthropic.com/
   - Verify no ongoing incidents

### Streaming errors

**Symptoms:** AI responses fail to stream, timeout, or show partial content.

**Solutions:**

1. Verify `/api/chat` endpoint is accessible:
   ```bash
   curl -X POST https://your-domain.com/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"test","conversationId":"123","searchResults":[]}'
   ```

2. Check Claude API status:
   - Visit https://status.anthropic.com/
   - Verify streaming endpoints are operational

3. Review browser console for errors:
   - Check for network errors or CORS issues
   - Verify streaming response is being handled correctly

4. Check rate limits:
   - Anthropic API has rate limits per tier
   - Review your account's usage and limits

### Poor AI responses

**Symptoms:** AI summaries are inaccurate, incomplete, or irrelevant.

**Solutions:**

1. Review keyword synonyms configuration:
   - Navigate to `/admin/taxonomy`
   - Add relevant synonyms to improve context understanding

2. Check document context building:
   - Review how search results are passed to AI in `/api/chat`
   - Ensure document content is properly extracted and formatted

3. Adjust AI prompt configuration:
   - Review system prompts in chat implementation
   - Consider adjusting temperature or max tokens settings

---

## Database Issues

### Turso connection failures

**Symptoms:** Database operations fail, admin portal shows errors.

**Solutions:**

1. Verify environment variables:
   ```bash
   # Check both are set correctly
   echo $TURSO_DATABASE_URL
   echo $TURSO_AUTH_TOKEN
   ```

2. Test Turso connection:
   ```bash
   # Install Turso CLI
   curl -sSfL https://get.tur.so/install.sh | bash

   # Test connection
   turso db shell your-database-name
   ```

3. Check Turso dashboard:
   - Visit https://turso.tech/
   - Verify database is active and accessible

### Prisma schema drift

**Symptoms:** Database schema doesn't match Prisma models, query errors.

**Solutions:**

1. Sync schema with database:
   ```bash
   npx prisma db push
   ```

2. Regenerate Prisma Client:
   ```bash
   npx prisma generate
   ```

3. Review schema differences:
   ```bash
   npx prisma db pull
   # Compare with your schema.prisma
   ```

### Migration errors

**Symptoms:** Prisma migrations fail with SQL errors.

**Solutions:**

1. Remember Turso uses SQLite dialect:
   - Some PostgreSQL features are not supported
   - Check for unsupported column types or constraints

2. Use `db push` instead of migrations:
   - Turso works best with `prisma db push` for schema updates
   - Avoid using `prisma migrate` unless necessary

3. Verify Prisma 7 configuration:
   - Check `prisma/prisma.config.ts` uses `defineConfig()`
   - Ensure `@prisma/adapter-libsql` is configured correctly:
   ```typescript
   import { PrismaLibSql } from "@prisma/adapter-libsql";

   const adapter = new PrismaLibSql({
     url: process.env.TURSO_DATABASE_URL,
     authToken: process.env.TURSO_AUTH_TOKEN,
   });
   ```

---

## Admin Portal Issues

### Config not saving

**Symptoms:** Changes to configuration don't persist, save button doesn't work.

**Solutions:**

1. Check browser console:
   - Look for 400 Bad Request errors (validation failure)
   - Look for 500 Internal Server Error (server issue)
   - Review error messages for specific validation issues

2. Verify validation logic:
   - Check config schema validation in API route
   - Ensure all required fields are populated

3. Test API endpoint directly:
   ```bash
   curl -X POST https://your-domain.com/api/admin/config \
     -H "Content-Type: application/json" \
     -d '{"section":"ui","config":{...}}'
   ```

### Draft not publishing

**Symptoms:** "Publish Draft" button fails, draft remains in draft state.

**Solutions:**

1. Verify draft exists:
   - Check `ConfigVersion` table for draft entry
   - Ensure only one draft exists per tenant (at-most-one constraint)

2. Check for concurrent modifications:
   - Another admin may have saved config changes
   - Discard and recreate draft if needed

3. Review publish endpoint:
   ```bash
   curl -X POST https://your-domain.com/api/admin/config/draft/publish
   ```

### Analytics showing no data

**Symptoms:** Usage analytics dashboard is empty or incomplete.

**Solutions:**

1. Verify usage logging endpoint:
   ```bash
   curl -X POST https://your-domain.com/api/usage \
     -H "Content-Type: application/json" \
     -d '{"event":"search","metadata":{}}'
   ```

2. Check `UsageLog` table:
   ```sql
   SELECT COUNT(*) FROM UsageLog;
   ```

3. Verify analytics aggregation:
   - Check if `daily-aggregate` cron job is running
   - Review aggregated data in database

4. Check user ID hashing:
   - User IDs should be SHA-256 hashed before storage
   - Verify hashing logic in usage tracking code

### Version history empty

**Symptoms:** No config versions shown in version history page.

**Solutions:**

1. Verify config saves create versions:
   - Check `createConfigVersion()` is called after each save
   - Review `ConfigVersion` table for entries

2. Manually create a test version:
   - Save any config change in admin portal
   - Verify version appears in `/admin/version-history`

3. Check version creation logic:
   - Located in `/src/lib/config-versioning.ts`
   - Ensure fire-and-forget snapshot creation is working

---

## Cron Jobs

### daily-aggregate not running

**Symptoms:** Usage data not aggregated, analytics stale.

**Solutions:**

1. Verify CRON_SECRET environment variable:
   ```bash
   echo $CRON_SECRET
   ```

2. Check Vercel cron configuration:
   - Review `vercel.json` crons array
   - Verify cron schedule is correct:
   ```json
   {
     "crons": [{
       "path": "/api/cron/daily-aggregate",
       "schedule": "0 0 * * *"
     }]
   }
   ```

3. Test endpoint manually:
   ```bash
   curl -X GET https://your-domain.com/api/cron/daily-aggregate \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

4. Check Vercel logs:
   - Navigate to Vercel dashboard > Deployments > [deployment] > Functions
   - Review cron function logs for errors

### weekly-cleanup not running

**Symptoms:** Old data not being cleaned up, database growing.

**Solutions:**

1. Verify CRON_SECRET (same as daily-aggregate)

2. Check cron configuration in `vercel.json`:
   ```json
   {
     "crons": [{
       "path": "/api/cron/weekly-cleanup",
       "schedule": "0 0 * * 0"
     }]
   }
   ```

3. Test cleanup endpoint:
   ```bash
   curl -X GET https://your-domain.com/api/cron/weekly-cleanup \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

4. Verify cleanup logic:
   - Check retention period settings
   - Review cleanup implementation in API route

---

## Deployment Issues

### Build failures

**Symptoms:** Vercel deployment fails during build step.

**Solutions:**

1. Verify all required environment variables are set:
   ```
   Required for build:
   - TURSO_DATABASE_URL
   - TURSO_AUTH_TOKEN
   - NEXT_PUBLIC_AZURE_CLIENT_ID
   - NEXT_PUBLIC_AZURE_TENANT_ID
   - NEXT_PUBLIC_AZURE_REDIRECT_URI
   - ANTHROPIC_API_KEY
   - CRON_SECRET
   ```

2. Check build logs in Vercel:
   - Navigate to Vercel dashboard > Deployments > [deployment]
   - Review full build output for specific errors

3. Test build locally:
   ```bash
   npm run build
   ```

4. Common build errors:
   - TypeScript errors: Run `npm run type-check`
   - Missing dependencies: Run `npm install`
   - Environment variable errors: Check `.env.local`

### Runtime crashes

**Symptoms:** Application crashes after deployment, returns 500 errors.

**Solutions:**

1. Check health endpoint:
   ```bash
   curl https://your-domain.com/api/health
   ```

2. Review Vercel function logs:
   - Navigate to Vercel dashboard > Deployments > [deployment] > Functions
   - Look for runtime errors and stack traces

3. Verify database connection:
   - Test Turso credentials are correct
   - Check Prisma adapter is initialized properly

4. Check for SSR issues:
   - MSAL library is client-only; `window is not defined` errors during SSG are expected
   - Ensure client-only code is wrapped in `useEffect` or dynamic imports

### CORS errors

**Symptoms:** Browser console shows CORS errors, API requests blocked.

**Solutions:**

1. Verify redirect URI matches deployment URL:
   ```bash
   # Check these match exactly
   NEXT_PUBLIC_AZURE_REDIRECT_URI=https://your-actual-domain.com/auth/callback
   ```

2. Update Azure AD app registration:
   - Navigate to Azure AD > App registrations > Authentication
   - Add production URL to redirect URIs
   - Add production URL to "Web" platform configuration

3. Check CORS headers in API routes:
   - Next.js API routes should handle CORS automatically
   - If using custom headers, verify configuration

---

## Secret Rotation

### Anthropic API key rotation

**Steps:**

1. Generate new API key in Anthropic dashboard
2. Update Vercel environment variable:
   - Navigate to Vercel dashboard > Settings > Environment Variables
   - Update `ANTHROPIC_API_KEY` value
3. Redeploy application:
   ```bash
   vercel --prod
   ```

### Turso auth token rotation

**Steps:**

1. Generate new token in Turso dashboard:
   ```bash
   turso db tokens create your-database-name
   ```
2. Update Vercel environment variable:
   - Update `TURSO_AUTH_TOKEN` value
3. Redeploy application

### Azure client secret rotation

**Steps:**

1. Create new client secret in Azure AD:
   - Navigate to Azure AD > App registrations > Certificates & secrets
   - Add new client secret
2. Update in Vercel environment variables (if using client secret)
3. Redeploy application
4. Remove old secret after verifying new one works

### CRON_SECRET rotation

**Steps:**

1. Generate new secret:
   ```bash
   openssl rand -hex 32
   ```
2. Update Vercel environment variable:
   - Update `CRON_SECRET` value
3. Redeploy application

---

## Health Check

The application provides a health check endpoint for monitoring.

### Endpoint

```bash
GET /api/health
```

### Response Format

```json
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "azureClientId": "ok",
    "anthropicKey": "ok"
  }
}
```

Or when degraded:

```json
{
  "status": "degraded",
  "checks": {
    "database": "ok",
    "azureClientId": "ok",
    "anthropicKey": "missing"
  }
}
```

### Usage

1. Set up uptime monitoring:
   - Use service like UptimeRobot, Pingdom, or DataDog
   - Monitor `/api/health` endpoint
   - Alert on non-200 status or "degraded" status

2. Manual health check:
   ```bash
   curl https://your-domain.com/api/health
   ```

3. Interpret results:
   - `database: "ok"` - Turso connection successful
   - `azureClientId: "ok"` - Azure client ID configured
   - `anthropicKey: "ok"` - Anthropic API key configured
   - Any check showing error indicates that component needs attention

---

## Additional Resources

- Next.js 16 Documentation: https://nextjs.org/docs
- Azure MSAL.js Documentation: https://github.com/AzureAD/microsoft-authentication-library-for-js
- Microsoft Graph API: https://learn.microsoft.com/en-us/graph/api/overview
- Anthropic API Documentation: https://docs.anthropic.com/
- Prisma 7 Documentation: https://www.prisma.io/docs
- Turso Documentation: https://docs.turso.tech/

For issues not covered in this runbook, check application logs in Vercel dashboard or contact the development team.
