# SharePoint Search Chat — Next.js Component Roadmap

## 1. Current Component Architecture

### Chat SPA

layout.tsx (root)
└── MsalProviderWrapper
└── page.tsx
└── AuthGuard
├── Login screen
└── TenantConfigProvider
└── ChatPage
├── ChatHeader
├── FilterBar
├── MessageList
│   └── MessageBubble
│       ├── CitedText
│       ├── IntentIndicator
│       └── FileResultCard
└── ChatInput


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
└── /admin/kql-config → KqlMapEditor + EditableList


### Shared Providers & Hooks

| Provider / Hook | Purpose |
|-----------------|---------|
| `TenantConfigProvider` | Exposes tenant config for chat pages |
| `MsalProviderWrapper` | Handles MSAL init + redirect |
| `useAdminToken` | Acquire admin-scoped access token |
| `useAdminFetch` | GET API calls with loading/error state |
| `useAdminSave` | PATCH calls with save feedback |
| `useAdminConfig` | Combined load-edit-save lifecycle per config section |

---

## 2. Current Status

✅ **Implemented / Working:**

- MSAL auth + popup login  
- Graph API search with tenant-aware KQL  
- AI synthesis integration (Claude)  
- Chat UI (header, filters, messages, file cards)  
- Admin portal layout, auth guard, sidebar, header  
- Admin pages for Overview, Settings, Metadata, Content Types, Keywords, Review Policies, Search Behaviour, KQL Config  
- Prisma/Turso DB connection + migrations  
- Usage logging and audit logging  
- TenantConfigProvider dynamic config for chat  
- Error handling, fallback, and security (CSP, SRI, sessionStorage, sanitization)

---

## 3. Next Stage Roadmap

### 3.1 Chat Enhancements

- [ ] Pagination / infinite scroll for file cards  
- [ ] Advanced AI summarization options (multi-document, multi-turn)  
- [ ] User feedback for AI responses (thumbs up/down, report inaccuracies)  
- [ ] Search suggestions / auto-complete using tenant keywords  

### 3.2 Admin Portal

- [ ] Analytics dashboards (trend charts, peak search hours, query volume)  
- [ ] Audit log filters (date range, event type, anonymized user)  
- [ ] Bulk update metadata / content types / keywords  
- [ ] Role management UI (Global Admin vs SharePoint Admin)  
- [ ] System status page (Vercel uptime, Turso connection, Claude API health)  
- [ ] Notifications / toast system for admin saves / errors  

### 3.3 Data & API Improvements

- [ ] Automated seeding for new tenants  
- [ ] Versioned TenantConfig for rollback / staging  
- [ ] API rate limiting for high-traffic tenants  
- [ ] Enhanced usage analytics (event enrichment)

### 3.4 Security & Compliance

- [ ] Admin activity audit (who changed what, when)  
- [ ] Data retention policies for usage logs / audit logs  
- [ ] MSAL security improvements (token refresh handling)  
- [ ] Server-side validation for KQL / metadata changes  

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
    ChatHeader["ChatHeader"]
    FilterBar["FilterBar"]
    MessageList["MessageList"]
    MessageBubble["MessageBubble"]
    CitedText["CitedText"]
    IntentIndicator["IntentIndicator"]
    FileResultCard["FileResultCard"]
    ChatInput["ChatInput"]

    %% Admin Portal
    AdminLayout["admin/layout.tsx"]
    AdminAuthGuard["AdminAuthGuard"]
    AdminSidebar["AdminSidebar"]
    AdminHeader["AdminHeader"]
    AdminPages["Admin Page Content"]
    Overview["Overview"]
    Settings["Settings"]
    Metadata["Metadata"]
    ContentTypes["Content Types"]
    Keywords["Keywords"]
    ReviewPolicies["Review Policies"]
    SearchBehaviour["Search Behaviour"]
    KQLConfig["KQL Config"]

    %% Hooks / Providers
    TenantConfigProvider -->|Provides| ChatPage
    MsalWrapper -->|Wraps| ChatRoot
    ChatRoot --> AuthGuard
    AuthGuard --> TenantConfig
    TenantConfig --> ChatPage
    ChatPage --> ChatHeader
    ChatPage --> FilterBar
    ChatPage --> MessageList
    MessageList --> MessageBubble
    MessageBubble --> CitedText
    MessageBubble --> IntentIndicator
    MessageBubble --> FileResultCard
    ChatPage --> ChatInput

    %% Admin Flow
    AdminLayout --> AdminAuthGuard
    AdminAuthGuard --> AdminSidebar
    AdminAuthGuard --> AdminHeader
    AdminAuthGuard --> AdminPages
    AdminPages --> Overview
    AdminPages --> Settings
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


    5. Summary
	•	Chat SPA and Admin Portal are fully scaffolded with providers, hooks, and components.
	•	The current stage implements all authentication, tenant configuration, search, and AI streaming features.
	•	Next stage focuses on analytics, bulk editing, admin monitoring, enhanced AI features, and developer tooling.

This roadmap, along with the Mermaid diagram, provides a single source of truth for planning development across Chat SPA and the Tenant Control Plane.


---




