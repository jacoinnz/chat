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
| 6 | Fine-Grained Role Model | High | PARTIAL |
| 7 | Secret Management | High | PARTIAL |
| 8 | Content Security Monitoring | Medium | DONE |
| 9 | Caching Layer | High | TODO |
| 10 | Background Jobs | Medium | TODO |
| 11 | Multi-Turn Context | High | DONE |
| 12 | Feedback Loop | Medium | TODO |
| 13 | Bulk Administration | High | TODO |
| 14 | Tenant Onboarding Automation | High | PARTIAL |
| 15 | System Health Dashboard | High | DONE |
| 16 | Feature Flags | Medium | TODO |
| 17 | CI/CD Hardening | Medium | TODO |
| 18 | Documentation Portal | Medium | PARTIAL |

**Completed: 8 | Partial: 4 | Remaining: 6**

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

**Limitations / future work:**

- Not distributed — resets on server restart, not shared across instances
- Only applied to usage endpoint; admin and chat endpoints not rate-limited
- For multi-instance deployment, migrate to Redis-backed or edge-based rate limiting
- Consider per-endpoint limits for AI synthesis and Graph search

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

**Key files:**

- `src/app/api/admin/analytics/route.ts` — Analytics data aggregation
- `src/app/admin/page.tsx` — Dashboard UI
- `src/components/admin/health-indicator.tsx` — Health status component

---

## Security & Compliance Improvements

### 6) Fine-Grained Role Model — PARTIAL

Currently relies solely on Azure AD directory roles.

**What exists:**

- `verifyAdminRole()` in `admin-auth.ts` checks for Global Admin or SharePoint Admin via Graph API
- `ADMIN_ROLE_TEMPLATES` constant with two Azure AD role template IDs
- `AdminAuthGuard` gates all `/admin` routes

**Still needed:**

- Internal role hierarchy (Platform Admin, Content Admin, Auditor, Read-only Viewer)
- Role-based UI rendering (hide sections based on role)
- Per-section edit permissions (e.g., Content Admin can edit taxonomy but not KQL)
- Role assignment UI in admin settings
- Database model for custom role assignments

---

### 7) Secret Management Improvements — PARTIAL

Basic environment variable configuration exists.

**What exists:**

- `.env.example` documenting all required variables
- Environment variables for Azure, Anthropic, and Turso credentials
- CSP and security headers in `next.config.ts`

**Still needed:**

- Key rotation capability and scheduling
- Runtime environment validation (fail-fast on missing/malformed secrets)
- Graceful degradation when a key expires (show maintenance mode instead of crash)
- Secret audit trail (who rotated, when)

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

**Limitations / future work:**

- No alerting system for suspicious patterns (repeated failed logins, scraping attempts)
- No token anomaly detection
- Consider adding anomaly detection to analytics pipeline

---

## Performance & Reliability

### 9) Caching Layer — TODO

No caching layer is currently implemented.

**Recommended implementation:**

- Tenant configuration: Cache in-memory with 5-minute TTL (most impactful, read on every request)
- Metadata schema: Cache alongside config
- Popular search results: Short TTL (30-60 seconds) to reduce Graph API calls
- AI summaries: Optional longer TTL for identical queries

**Possible approaches:**

- Edge cache via Vercel (simplest for current deployment)
- Redis-compatible store (Upstash for serverless)
- In-memory `Map` with TTL as lightweight fallback

---

### 10) Background Jobs — TODO

All processing is currently synchronous / fire-and-forget.

**Recommended implementation:**

- Usage aggregation (daily/weekly rollups from raw UsageLog entries)
- Analytics pre-computation (avoid expensive queries on dashboard load)
- Data cleanup and retention enforcement
- Stale document notifications based on review policies

**Possible approaches:**

- Vercel Cron Jobs (simplest for current deployment)
- Inngest or Trigger.dev for more complex workflows
- Database-backed job queue for resilience

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

### 12) Feedback Loop — TODO

No user feedback collection on AI responses.

**Recommended implementation:**

- Thumbs up / thumbs down buttons on each AI response
- Optional "Report issue" with free-text
- Store feedback linked to query + response for analysis
- Use data to improve system prompts, ranking weights, and search behaviour defaults
- Display feedback trends in analytics dashboard

---

## Enterprise-Grade Features

### 13) Bulk Administration — TODO

Admin UI supports only individual section editing.

**Recommended implementation:**

- Import/export full tenant config as JSON (backup/restore)
- CSV upload for taxonomy values and keyword groups
- Bulk edit content types (add/remove multiple at once)
- Clone configuration from one tenant to another

---

### 14) Tenant Onboarding Automation — PARTIAL

Basic auto-provisioning exists but no guided setup.

**What exists:**

- `TenantConfig` auto-created with defaults on first admin access (GET `/api/admin/config`)
- Default values defined in `taxonomy-defaults.ts` for all sections
- Reset to defaults via POST `/api/admin/reset`

**Still needed:**

- Onboarding wizard UI (step-by-step setup)
- Permission validation checks (verify Graph API access, SharePoint connectivity)
- Readiness checks before going live
- Baseline taxonomy generation based on tenant's SharePoint structure

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

**Key files:**

- `src/components/admin/health-indicator.tsx` — Health status UI
- `src/app/admin/page.tsx` — Dashboard with health section
- `src/app/api/admin/tenant-info/route.ts` — System status checks
- `src/app/api/admin/analytics/route.ts` — Health metrics aggregation

---

## Developer & Operational Improvements

### 16) Feature Flags — TODO

No feature flag system exists.

**Recommended implementation:**

- Database-backed flags per tenant (simple `FeatureFlag` model)
- Admin UI toggle in settings page
- `useFeatureFlag(name)` hook for client-side gating
- `checkFeatureFlag(tenantId, name)` for server-side gating
- Useful for: beta features, A/B testing, gradual rollouts, tenant-specific capabilities

---

### 17) CI/CD Hardening — TODO

Currently deployed via Vercel with no automated pipeline safeguards.

**Recommended implementation:**

- GitHub Actions workflow for:
  - TypeScript type checking (`npm run build`)
  - Linting (ESLint)
  - Prisma schema validation
  - Dependency vulnerability scanning (`npm audit`)
  - Security scanning (e.g., Snyk or GitHub Dependabot)
- Branch protection rules: require passing checks before merge
- Migration safety: validate schema changes don't break existing data

---

### 18) Documentation Portal — PARTIAL

Good markdown documentation exists in `/docs`.

**What exists:**

- `ARCHITECTURE.md` — System architecture overview
- `AUTHENTICATION.md` — Auth flow documentation
- `DEPLOYMENT.md` — Deployment guide
- `ENTERPRISE-DESIGN-PACK.md` — UI/UX design specifications
- `ENTERPRISE-NEXT-STEPS.md` — This roadmap
- `PROJECT-STRUCTURE.md` — Component and file structure
- `SHAREPOINT-AI-UI-UX-SPEC.md` — Full UI/UX specification
- `roadmap.md` — Component roadmap with Mermaid diagrams

**Still needed:**

- API documentation (endpoint reference with request/response examples)
- Admin user guide (how-to for each config section)
- Troubleshooting runbook (common issues and resolutions)
- Operational runbook (monitoring, incident response, scaling)

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

This places the platform above typical internal enterprise tools.

---

## Recommended Next Action Plan

### Completed (highest ROI items):

1. ~~Configuration versioning + rollback~~
2. ~~Admin audit logging~~
3. ~~Server-side validation~~
4. ~~Analytics dashboard~~
5. ~~System health monitoring~~

### Next priorities:

1. **Caching layer** — Reduces latency and Graph API cost at scale
2. **Fine-grained roles** — Limits blast radius of admin accounts
3. **CI/CD hardening** — Prevents regressions and security issues
4. **Feedback loop** — Improves AI quality over time
5. **Bulk administration** — Enables large-scale management

---

## Summary

The platform has completed **8 of 18** roadmap items, with **4 partially implemented** and **6 remaining**.
All critical-priority items (versioning, validation, audit logging) are fully operational.
The remaining items focus on scaling, operational maturity, and user experience refinement.
