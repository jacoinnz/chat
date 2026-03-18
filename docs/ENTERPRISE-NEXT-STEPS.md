# SharePoint Search Chat — Enterprise Implementation Roadmap

Your platform is already architecturally strong and production-capable.
The following roadmap focuses on advancing from **"production working" → "enterprise-grade control plane."**

> **Last audited:** 2026-03-18
> **Legend:** DONE = fully implemented | PARTIAL = partially implemented | TODO = not yet started

---

## Progress Overview

| # | Feature | Priority | Status |
|---|---------|----------|--------|
| 1 | Config Versioning & Rollback | Critical | DONE |
| 2 | Server-Side Validation | Critical | DONE |
| 3 | Audit Logging | Critical | DONE |
| 4 | Rate Limiting | High | DONE |
| 5 | Analytics Dashboard | High | DONE |
| 6 | Fine-Grained Role Model | High | DONE |
| 7 | Secret Management | High | DONE |
| 8 | Content Security Monitoring | Medium | DONE |
| 9 | Caching Layer | High | DONE |
| 10 | Background Jobs | Medium | DONE |
| 11 | Multi-Turn Context | High | DONE |
| 12 | Feedback Loop | Medium | DONE |
| 13 | Bulk Administration | High | DONE |
| 14 | Tenant Onboarding Automation | High | DONE |
| 15 | System Health Dashboard | High | DONE |
| 16 | Feature Flags | Medium | DONE |
| 17 | CI/CD Hardening | Medium | DONE |
| 18 | Documentation Portal | Medium | DONE |

**Completed: 18 | Partial: 0 | Remaining: 0**

---

## Critical Next Implementations (High Priority)

### 1) Tenant Configuration Versioning & Rollback — DONE

Full version history with draft/publish workflow and one-click rollback.

**What was implemented:**

- `ConfigVersion` model storing full config snapshots per save (version, status, snapshot JSON, section, author)
- Draft workflow: at-most-one draft per tenant, publish/discard via dedicated endpoints
- Rollback: any published version can be restored, copying its snapshot back to `TenantConfig`
- Version History page at `/admin/version-history` with paginated list and rollback buttons
- `DraftBanner` component: amber banner shown across config pages when a draft exists
- Change author tracking via JWT claims

**Key files:**

- `prisma/schema.prisma` — `ConfigVersion` model
- `src/lib/admin-auth.ts` — `createConfigVersion()` fire-and-forget snapshot creation
- `src/app/api/admin/config/draft/route.ts` — GET/POST/DELETE draft
- `src/app/api/admin/config/publish/route.ts` — Publish draft to live
- `src/app/api/admin/config/versions/route.ts` — Paginated version history
- `src/app/api/admin/config/versions/[id]/rollback/route.ts` — Rollback endpoint
- `src/app/admin/version-history/page.tsx` — Version history UI
- `src/components/admin/draft-banner.tsx` — Draft indicator banner

---

### 2) Server-Side Validation for Admin Changes — DONE

Comprehensive Zod-based validation on all admin API routes with KQL injection prevention.

**What was implemented:**

- `src/lib/validations.ts` — Central schema file with:
  - Reusable primitives: `safeString(maxLen)`, `safeStringArray(maxItems, maxLen)`
  - `sharePointProperty` regex (`^[A-Za-z][A-Za-z0-9_]{0,63}$`) blocks KQL injection characters (quotes, colons, parens, brackets)
  - Per-section schemas with bounds: taxonomy (50 items/100 chars), contentTypes (50/100), keywords (100 groups/20 synonyms), reviewPolicies (50 policies, maxAgeDays 1-3650, warningDays <= maxAgeDays), searchBehaviour (ranges 5-50, 7-365, 0-5, weight sum <= 15), kqlPropertyMap (1-20 entries), searchFields (1-30)
  - Composite schemas for full config PUT, draft POST, and reset
  - `validateBody()` helper returning typed data or 400 with structured `issues` array
- All 10 write endpoints migrated from ad-hoc `typeof`/`Array.isArray` checks to `schema.safeParse()`

**Key files:**

- `src/lib/validations.ts` — All Zod schemas and `validateBody()` helper
- All `src/app/api/admin/*/route.ts` PATCH/PUT/POST handlers

---

### 3) Audit Logging of Admin Actions — DONE

All configuration changes are tracked with anonymised user identification.

**What was implemented:**

- `AuditLog` model with tenantId, userHash (SHA-256), action, section, details, createdAt
- `logAudit()` function in `admin-auth.ts` — fire-and-forget, non-blocking
- Tracks all config updates, resets, and administrative actions with human-readable detail strings
- Recent audit entries (last 20) displayed in admin analytics dashboard
- User IDs hashed for privacy compliance

**Key files:**

- `prisma/schema.prisma` — `AuditLog` model
- `src/lib/admin-auth.ts` — `logAudit()` function
- `src/app/api/admin/analytics/route.ts` — Retrieves recent audit entries

---

### 4) Rate Limiting & Abuse Protection — DONE

In-memory rate limiting on usage tracking endpoint.

**What was implemented:**

- Sliding window rate limiter: 100 events per user per minute
- Applied to `/api/usage` endpoint (protects AI cost surface)
- In-memory Map-based implementation

**Key files:**

- `src/app/api/usage/route.ts` — Rate limiter implementation

---

### 5) Analytics Dashboard — DONE

Full operational visibility for administrators with configurable time periods.

**What was implemented:**

- Comprehensive analytics API at `/api/admin/analytics`
- Dashboard UI at `/admin` with:
  - Core counts: searches, chats, errors (7d/30d/90d periods)
  - Usage summary: today/7d/30d breakdowns
  - Daily activity breakdown with hourly peak analysis
  - Query intent analysis with percentages
  - Most used filters
  - Error monitoring: Graph API, auth, and AI failures
  - Health status indicators (healthy/warning/degraded)
  - Recent audit log entries (last 20)
  - Alerts system (critical/warning/info)
  - Feedback summary (thumbs up/down/reports)

**Key files:**

- `src/app/api/admin/analytics/route.ts` — Analytics data aggregation
- `src/app/admin/page.tsx` — Dashboard UI
- `src/components/admin/health-indicator.tsx` — Health status component

---

## Security & Compliance Improvements

### 6) Fine-Grained Role Model — DONE

Internal role hierarchy with database-backed role assignments.

**What was implemented:**

- `AdminRole` model with tenantId, userHash, role, assignedBy
- Four-tier role hierarchy: Platform Admin (4), Config Admin (3), Auditor (2), Viewer (1)
- `requireRole(auth, minRole)` — compares hierarchy levels, returns 403 if insufficient
- `getInternalRole()` — DB lookup; Azure AD admins default to `platform_admin` if no internal role
- All config write routes require `config_admin` or higher
- Role management page at `/admin/roles` with assign/remove UI
- Role management API: GET/PATCH/DELETE `/api/admin/roles`

**Key files:**

- `prisma/schema.prisma` — `AdminRole` model
- `src/lib/admin-auth.ts` — `RoleTier`, `ROLE_HIERARCHY`, `requireRole()`, `getInternalRole()`
- `src/app/api/admin/roles/route.ts` — Role CRUD API
- `src/app/admin/roles/page.tsx` — Role management UI

---

### 7) Secret Management — DONE

Runtime environment validation with health check endpoint.

**What was implemented:**

- `src/lib/env-validation.ts` — Zod schema validating all required env vars
- `validateEnv()` singleton — fail-fast on missing/malformed secrets in production
- Called from `prisma.ts` on import (validates on first DB access)
- Health check endpoint at `/api/health` — checks env var presence + DB connectivity
- Returns `{ status: "healthy"|"degraded", checks: { database, azureClientId, anthropicKey } }`

**Key files:**

- `src/lib/env-validation.ts` — Zod env validation
- `src/lib/prisma.ts` — Calls `validateEnv()` on init
- `src/app/api/health/route.ts` — Public health check endpoint
- `.env.example` — Documents all required + optional vars

---

### 8) Content Security Monitoring — DONE

Comprehensive content sanitisation and classification.

**What was implemented:**

- `sanitizeForKql()` — KQL injection prevention (strips special chars, enforces 200 char limit)
- `sanitizeContent()` — HTML/XSS prevention (strips tags, escapes entities, blocks JS protocols)
- `getSensitivityLevel()` — Classifies documents as Public/Internal/Confidential/Restricted
- `requiresWarning()` — Warns users when accessing sensitive documents
- `assessFreshness()` — Staleness detection with archive/review date checking
- Zod validation on kql-map and search-fields routes blocks KQL injection at input

**Key files:**

- `src/lib/safety.ts` — All content security functions
- `src/lib/validations.ts` — `sharePointProperty` regex for input validation

---

## Performance & Reliability

### 9) Caching Layer — DONE

In-memory TTL cache for tenant configuration.

**What was implemented:**

- `TtlCache<T>` class: Map-based, configurable TTL (default 5 minutes)
- Methods: `get(key)`, `set(key, data)`, `invalidate(key)`, `invalidateAll()`
- Singleton `configCache` exported via `globalThis` pattern (survives hot reloads)
- `GET /api/tenant-config` — checks cache before DB query, sets cache after query
- All admin write routes invalidate cache after DB writes (10 routes)
- Publish and rollback routes also invalidate cache

**Key files:**

- `src/lib/config-cache.ts` — TTL cache implementation
- `src/app/api/tenant-config/route.ts` — Cache read/write
- All admin PATCH/PUT/POST routes — `configCache.invalidate(tenantId)`

---

### 10) Background Jobs — DONE

Vercel Cron Jobs for usage aggregation and data cleanup.

**What was implemented:**

- `GET /api/cron/daily-aggregate` — aggregates yesterday's UsageLogs into UsageDailySummary per tenant
- `GET /api/cron/weekly-cleanup` — deletes UsageLog rows older than 90 days
- Both protected by `Authorization: Bearer ${CRON_SECRET}`
- `UsageDailySummary` model: tenantId, date, searchCount, chatCount, errorCount, noResultCount, activeUsers
- Vercel cron schedule: daily at 2 AM UTC, weekly Sunday at 3 AM UTC

**Key files:**

- `prisma/schema.prisma` — `UsageDailySummary` model
- `src/app/api/cron/daily-aggregate/route.ts` — Daily aggregation
- `src/app/api/cron/weekly-cleanup/route.ts` — Weekly cleanup
- `vercel.json` — Cron schedule configuration
- `.env.example` — CRON_SECRET documentation

---

## Chat & AI Experience Upgrades

### 11) Multi-Turn Context Awareness — DONE

Conversational refinement with history carry-over.

**What was implemented:**

- `buildConversationHistory()` in `context-builder.ts` — Filters out welcome/loading/empty messages
- Maintains up to 6 turns (12 messages max) in context window
- Full message history passed to Claude API for streaming responses
- Users can refine queries naturally ("Show only policies from HR", "What about the latest version?")

**Key files:**

- `src/lib/context-builder.ts` — Conversation history builder
- `src/app/api/chat/route.ts` — Uses `messages` array in Claude API request

---

### 12) Feedback Loop — DONE

User feedback collection on AI responses with admin analytics.

**What was implemented:**

- `Feedback` model: tenantId, messageId, userHash, feedbackType (thumbs_up/thumbs_down/report), comment
- `POST /api/feedback` — creates feedback row (regular chat users, not admin-only)
- Thumbs up/down buttons on assistant messages in chat UI
- `FeedbackButtons` component with visual state feedback (green/red icons)
- Feedback counts included in admin analytics response
- Dashboard shows feedback summary card (thumbs up/down/reports)

**Key files:**

- `prisma/schema.prisma` — `Feedback` model
- `src/lib/validations.ts` — `feedbackSchema`
- `src/app/api/feedback/route.ts` — Feedback submission API
- `src/components/chat/message-bubble.tsx` — `FeedbackButtons` component
- `src/components/chat/message-list.tsx` — Passes `onFeedback` prop
- `src/components/chat/chat-page.tsx` — `handleFeedback` callback
- `src/app/api/admin/analytics/route.ts` — Feedback count queries
- `src/app/admin/page.tsx` — Feedback summary card

---

## Enterprise-Grade Features

### 13) Bulk Administration — DONE

Import/export tenant configuration for backup and migration.

**What was implemented:**

- `GET /api/admin/config/export` — downloads full config JSON with Content-Disposition header
- `POST /api/admin/config/import` — validates imported config via `configImportSchema`, saves as draft
- Export requires `auditor` role or higher; import requires `config_admin` or higher
- Import/Export page at `/admin/bulk` with file upload and download buttons
- Imported config saved as draft for review before publishing

**Key files:**

- `src/lib/validations.ts` — `configImportSchema`
- `src/app/api/admin/config/export/route.ts` — Config export
- `src/app/api/admin/config/import/route.ts` — Config import
- `src/app/admin/bulk/page.tsx` — Import/Export UI

---

### 14) Tenant Onboarding Automation — DONE

Readiness checks with auto-status updates.

**What was implemented:**

- `GET /api/admin/onboarding` — runs 4 readiness checks in parallel:
  - Graph API access (verify token works with `/me`)
  - SharePoint search access (test search query)
  - AI service (ANTHROPIC_API_KEY presence)
  - Config exists (TenantConfig row)
- Auto-updates `Tenant.onboardingStatus` to `setup_complete` when all checks pass
- Onboarding page at `/admin/onboarding` with checklist and pass/fail indicators
- Links to relevant settings for failed checks

**Key files:**

- `prisma/schema.prisma` — `Tenant.onboardingStatus` field
- `src/app/api/admin/onboarding/route.ts` — Readiness checks
- `src/app/admin/onboarding/page.tsx` — Onboarding UI

---

### 15) System Health Dashboard — DONE

Operational status monitoring integrated into admin dashboard.

**What was implemented:**

- Health indicator component with healthy/warning/degraded states
- System checks: database connectivity, search API, Graph API, AI service
- Error rate monitoring: graphErrors, authErrors, no-result rates
- Property mapping status validation
- Actionable alerts (critical/warning/info) with contextual recommendations
- Tenant info endpoint at `/api/admin/tenant-info` with system status
- Public health check at `/api/health`

**Key files:**

- `src/components/admin/health-indicator.tsx` — Health status UI
- `src/app/admin/page.tsx` — Dashboard with health section
- `src/app/api/admin/tenant-info/route.ts` — System status checks
- `src/app/api/admin/analytics/route.ts` — Health metrics aggregation
- `src/app/api/health/route.ts` — Public health endpoint

---

## Developer & Operational Improvements

### 16) Feature Flags — DONE

Database-backed feature flags with admin toggle UI.

**What was implemented:**

- `FeatureFlag` model: tenantId, name, enabled, description
- Default flags: `feedbackLoop`, `bulkAdmin`, `advancedAnalytics` (all disabled by default)
- `isFeatureEnabled(tenantId, name)` — server-side check with default fallback
- `getAllFeatureFlags(tenantId)` — merges DB values with defaults
- `GET/PATCH /api/admin/feature-flags` — list and toggle flags
- Feature Flags page at `/admin/feature-flags` with toggle switches per flag
- `useFeatureFlags()` client hook

**Key files:**

- `prisma/schema.prisma` — `FeatureFlag` model
- `src/lib/feature-flags.ts` — Server-side flag logic
- `src/lib/validations.ts` — `featureFlagToggleSchema`
- `src/app/api/admin/feature-flags/route.ts` — Feature flag API
- `src/hooks/use-feature-flags.ts` — Client hook
- `src/app/admin/feature-flags/page.tsx` — Feature flags UI

---

### 17) CI/CD Hardening — DONE

GitHub Actions workflow for automated quality checks.

**What was implemented:**

- `.github/workflows/ci.yml` with:
  - Triggers: push to main, PRs to main
  - Steps: checkout, setup-node 20, npm ci, prisma generate, build, lint, security audit
  - Dummy env vars for build (TURSO_DATABASE_URL, NEXT_PUBLIC_AZURE_CLIENT_ID, ANTHROPIC_API_KEY)
  - `npm audit --audit-level=high --omit=dev` for dependency vulnerability scanning

**Key files:**

- `.github/workflows/ci.yml` — CI pipeline

---

### 18) Documentation Portal — DONE

Complete documentation covering API reference, admin guide, and troubleshooting.

**What was implemented:**

- `docs/API-REFERENCE.md` — All 25+ endpoints with method, URL, auth, request/response
- `docs/ADMIN-USER-GUIDE.md` — Step-by-step guide for each admin page and workflow
- `docs/TROUBLESHOOTING.md` — Common issues, secret rotation, cron debugging

**Key files:**

- `docs/API-REFERENCE.md` — API endpoint reference
- `docs/ADMIN-USER-GUIDE.md` — Admin user guide
- `docs/TROUBLESHOOTING.md` — Troubleshooting runbook

---

## Existing Strengths (Already Implemented)

Your system already incorporates advanced best practices:

- Session-based storage (sessionStorage)
- Strict Content Security Policy
- No inline scripts
- Subresource Integrity
- Dependency scanning
- Strong component separation
- Auth-protected admin portal
- Tenant-aware configuration
- Production deployment pipeline
- Full config versioning with rollback
- Comprehensive Zod validation with KQL injection prevention
- Audit logging with anonymised user tracking
- Analytics dashboard with health monitoring
- Multi-turn AI chat with context awareness
- Content security (XSS prevention, sensitivity classification, staleness detection)
- In-memory TTL caching for tenant config
- Fine-grained role hierarchy (4 tiers)
- Database-backed feature flags
- User feedback loop with analytics integration
- Bulk import/export for config management
- Automated onboarding readiness checks
- Background jobs for data aggregation and cleanup
- CI/CD pipeline with build, lint, and security audit
- Complete API and admin documentation

This places the platform well above typical internal enterprise tools.

---

## Summary

The platform has completed **all 18 of 18** roadmap items.
All features — from critical infrastructure (versioning, validation, audit logging) through
enterprise-grade capabilities (roles, caching, feature flags, CI/CD) to user experience
(feedback loop, onboarding, bulk admin) — are fully operational.
