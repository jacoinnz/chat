# SharePoint Search Chat — Next.js Component Roadmap

## 1. Current Component Architecture

### Chat SPA

layout.tsx (root)
└── MsalProviderWrapper
└── page.tsx
└── AuthGuard
├── Login screen
└── TenantConfigProvider
└── AppShell
├── GlobalHeader
├── AppSidebar
└── ChatPage
├── FilterBar (+ mobile bottom sheet)
├── EmptyState (welcome + example queries)
├── MessageList
│   └── MessageBubble
│       ├── AI Generated label
│       ├── CitedText (+ expand/collapse)
│       ├── NoResultsState / ErrorState
│       ├── IntentIndicator
│       └── FileResultCard (+ copy/favorite/preview)
├── ChatInput (+ clear button + rotating placeholder)
└── DocumentPreviewPanel


### Admin Portal

layout.tsx (root)
└── admin/layout.tsx
└── AuthGuard
└── AdminAuthGuard
├── AdminSidebar
├── AdminHeader
└── Page Content
├── /admin → Overview
├── /admin/settings → Tenant info & system status
├── /admin/metadata → Department / Sensitivity / Status editor
├── /admin/content-types → Content types editor
├── /admin/keywords → KeywordEditor
├── /admin/review-policies → ReviewPolicyEditor
├── /admin/search-behaviour → Sliders/toggles
├── /admin/kql-config → KqlMapEditor + EditableList
└── /admin/system-health → DB, Azure AD, AI, Graph API health checks


### Shared Providers & Hooks

| Provider / Hook | Purpose |
|-----------------|---------|
| `TenantConfigProvider` | Exposes tenant config for chat pages |
| `MsalProviderWrapper` | Handles MSAL init + redirect |
| `useAdminToken` | Acquire admin-scoped access token |
| `useAdminFetch` | GET API calls with loading/error state |
| `useAdminSave` | PATCH calls with save feedback |
| `useAdminConfig` | Combined load-edit-save lifecycle per config section |
| `useSavedQueries` | CRUD saved queries with API persistence |
| `useFavorites` | Toggle document favorites with API persistence |
| `useRecentSearches` | Track recent searches with auto-dedup |
| `useMediaQuery` | Responsive breakpoint detection |
| `SidebarContext` | Cross-component communication (sidebar → chat) |

---

## 2. Current Status

✅ **Implemented / Working:**

- MSAL auth + popup login
- Graph API search with tenant-aware KQL
- AI synthesis integration (Claude)
- Application shell (GlobalHeader + AppSidebar + collapsible sidebar)
- Chat UI (filters with mobile bottom sheet, messages, file cards with copy/favorite/preview)
- Empty state with example queries + tips, no-results state, error state
- AI Generated label + expand/collapse for long responses
- Document preview panel (320px slide-in with full metadata)
- Saved queries, favorites, recent searches (API + DB + hooks)
- Admin portal layout, auth guard, sidebar, header
- Admin pages for Overview, Settings, Metadata, Content Types, Keywords, Review Policies, Search Behaviour, KQL Config, System Health
- System health dashboard (DB, Azure AD, AI Provider, Graph API checks with latency)
- Prisma/Turso DB connection + migrations
- Usage logging and audit logging
- TenantConfigProvider dynamic config for chat
- Accessibility: ARIA labels, focus-visible styles, SR announcements, keyboard navigation
- Error handling, fallback, and security (CSP, SRI, sessionStorage, sanitization)

---

## 3. Next Stage Roadmap

### 3.1 Chat Enhancements

- [ ] Pagination / infinite scroll for file cards
- [ ] Advanced AI summarization options (multi-document, multi-turn)
- [x] User feedback for AI responses (thumbs up/down)
- [x] Search suggestions / example queries in empty state
- [x] Saved queries + favorites + recent searches

### 3.2 Admin Portal

- [x] Analytics dashboards (trend charts, peak search hours, query volume)
- [ ] Audit log filters (date range, event type, anonymized user)
- [x] Bulk update metadata / content types / keywords (import/export)
- [x] Role management UI
- [x] System health page (DB, Azure AD, AI Provider, Graph API)
- [ ] Notifications / toast system for admin saves / errors

### 3.3 Data & API Improvements

- [x] Automated seeding for new tenants
- [x] Versioned TenantConfig for rollback / staging
- [ ] API rate limiting for high-traffic tenants
- [ ] Enhanced usage analytics (event enrichment)

### 3.4 Security & Compliance

- [x] Admin activity audit (who changed what, when)
- [x] Data retention policies for usage logs / audit logs (weekly cleanup cron)
- [ ] MSAL security improvements (token refresh handling)
- [x] Server-side validation for KQL / metadata changes  

### 3.5 Developer Experience

- [ ] Storybook / component library for Admin UI  
- [ ] CI/CD pipeline enhancements (Vercel + Prisma migrations + Turso seeding)  
- [ ] Unit + integration tests for critical modules (`graph-search`, `taxonomy`, `ranking`, admin hooks)  

---

## 4. Visual Roadmap — Component Dependencies

```mermaid
flowchart TB
    %% Chat SPA
    ChatRoot["layout.tsx"]
    MsalWrapper["MsalProviderWrapper"]
    ChatPage["ChatPage"]
    AuthGuard["AuthGuard"]
    TenantConfig["TenantConfigProvider"]
    AppShell["AppShell"]
    GlobalHeader["GlobalHeader"]
    AppSidebar["AppSidebar"]
    FilterBar["FilterBar"]
    EmptyState["EmptyState"]
    MessageList["MessageList"]
    MessageBubble["MessageBubble"]
    CitedText["CitedText"]
    IntentIndicator["IntentIndicator"]
    FileResultCard["FileResultCard"]
    ChatInput["ChatInput"]
    DocPreview["DocumentPreviewPanel"]

    %% Admin Portal
    AdminLayout["admin/layout.tsx"]
    AdminAuthGuard["AdminAuthGuard"]
    AdminSidebar["AdminSidebar"]
    AdminHeader["AdminHeader"]
    AdminPages["Admin Page Content"]
    Overview["Overview"]
    Settings["Settings"]
    SystemHealth["System Health"]
    Metadata["Metadata"]
    ContentTypes["Content Types"]
    Keywords["Keywords"]
    ReviewPolicies["Review Policies"]
    SearchBehaviour["Search Behaviour"]
    KQLConfig["KQL Config"]

    %% Chat Flow
    MsalWrapper -->|Wraps| ChatRoot
    ChatRoot --> AuthGuard
    AuthGuard --> TenantConfig
    TenantConfig --> AppShell
    AppShell --> GlobalHeader
    AppShell --> AppSidebar
    AppShell --> ChatPage
    ChatPage --> FilterBar
    ChatPage --> EmptyState
    ChatPage --> MessageList
    MessageList --> MessageBubble
    MessageBubble --> CitedText
    MessageBubble --> IntentIndicator
    MessageBubble --> FileResultCard
    ChatPage --> ChatInput
    ChatPage --> DocPreview

    %% Admin Flow
    AdminLayout --> AdminAuthGuard
    AdminAuthGuard --> AdminSidebar
    AdminAuthGuard --> AdminHeader
    AdminAuthGuard --> AdminPages
    AdminPages --> Overview
    AdminPages --> Settings
    AdminPages --> SystemHealth
    AdminPages --> Metadata
    AdminPages --> ContentTypes
    AdminPages --> Keywords
    AdminPages --> ReviewPolicies
    AdminPages --> SearchBehaviour
    AdminPages --> KQLConfig

    %% Shared hooks
    useAdminToken["useAdminToken"] --> AdminPages
    useAdminFetch["useAdminFetch"] --> AdminPages
    useAdminSave["useAdminSave"] --> AdminPages
    useAdminConfig["useAdminConfig"] --> AdminPages
    useSavedQueries["useSavedQueries"] --> AppSidebar
    useFavorites["useFavorites"] --> AppSidebar
    useRecentSearches["useRecentSearches"] --> AppSidebar


    5. Summary
	•	Chat SPA and Admin Portal are fully scaffolded with providers, hooks, and components.
	•	The current stage implements all authentication, tenant configuration, search, and AI streaming features.
	•	Next stage focuses on analytics, bulk editing, admin monitoring, enhanced AI features, and developer tooling.

This roadmap, along with the Mermaid diagram, provides a single source of truth for planning development across Chat SPA and the Tenant Control Plane.


---




