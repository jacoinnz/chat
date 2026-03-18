# API Reference

Complete reference for all API endpoints in the SharePoint Search Chat application.

## Table of Contents

- [Authentication](#authentication)
- [Public Endpoints](#public-endpoints)
- [Auth-Protected Endpoints](#auth-protected-endpoints)
- [User Data Endpoints](#user-data-endpoints)
- [Admin Endpoints](#admin-endpoints)
  - [Configuration Management](#configuration-management)
  - [Version Control](#version-control)
  - [Draft Workflow](#draft-workflow)
  - [Section Updates](#section-updates)
  - [Tenant Management](#tenant-management)
  - [Access Control](#access-control)
  - [Analytics](#analytics)
- [Cron Endpoints](#cron-endpoints)
- [Error Responses](#error-responses)

---

## Authentication

### Admin Endpoints
All `/api/admin/*` endpoints require:
- `Authorization: Bearer <access_token>` header
- Valid Azure AD token with admin role (Global Administrator or SharePoint Administrator)
- `x-tenant-id` header (automatically extracted from JWT)

### Role-Based Access
Some admin endpoints require specific roles:

| Role | Description | Endpoints |
|------|-------------|-----------|
| `viewer` | Read-only access to config and analytics | GET endpoints |
| `auditor` | View audit logs, export config | GET endpoints + /export |
| `config_admin` | Modify configuration | PATCH, PUT, POST config endpoints |
| `platform_admin` | Manage roles and feature flags | /roles, /feature-flags |

### Regular User Endpoints
`/api/tenant-config`, `/api/usage`, `/api/feedback`, `/api/saved-queries`, `/api/favorites`, `/api/recent-searches` require:
- `Authorization: Bearer <access_token>` header
- Valid JWT with tenant claims

### Cron Endpoints
`/api/cron/*` endpoints require:
- `Authorization: Bearer <CRON_SECRET>` header
- `CRON_SECRET` environment variable must match

---

## Public Endpoints

### Health Check

**GET** `/api/health`

Public health check endpoint. No authentication required.

**Response:**
```json
{
  "status": "healthy" | "degraded",
  "checks": {
    "database": "ok" | "missing" | "error",
    "azureClientId": "ok" | "missing",
    "anthropicKey": "ok" | "missing"
  }
}
```

**Status Codes:**
- `200`: Always returns 200, check `status` field for health state

---

## Auth-Protected Endpoints

### Get Tenant Configuration

**GET** `/api/tenant-config`

Returns tenant configuration or defaults. No auto-provisioning for non-admin users.

**Auth:** Bearer token with valid tenant JWT claims

**Response:**
```json
{
  "taxonomy": {
    "department": ["IT", "HR", "Finance"],
    "sensitivity": ["Public", "Internal", "Confidential"],
    "status": ["Draft", "Review", "Approved"]
  },
  "contentTypes": ["Document", "Policy", "Procedure"],
  "kqlPropertyMap": {
    "department": "DepartmentOWSCHCS",
    "sensitivity": "SensitivityOWSCHCS",
    "status": "StatusOWSCHCS"
  },
  "searchFields": ["Title", "Body", "Author"],
  "keywords": [
    { "term": "AI", "synonyms": ["Artificial Intelligence", "ML", "Machine Learning"] }
  ],
  "reviewPolicies": [
    { "contentType": "Policy", "maxAgeDays": 365, "warningDays": 30 }
  ],
  "searchBehaviour": {
    "approvedOnly": false,
    "hideRestricted": true,
    "maxResults": 50,
    "recencyBoostDays": 90,
    "recencyWeight": 0.3,
    "matchWeight": 0.5,
    "freshnessWeight": 0.2
  }
}
```

**Status Codes:**
- `200`: Success
- `400`: Missing tenant ID
- `401`: Unauthorized

---

### Log Usage Event

**POST** `/api/usage`

Log an anonymized usage event. Rate limited to 100 events per user per minute.

**Auth:** Bearer token with valid tenant JWT claims

**Request Body:**
```json
{
  "event": "search" | "chat" | "error" | "no_results" | "graph_error" | "auth_error",
  "errorCode": "string (optional)",
  "resultCount": 0,
  "filtersUsed": {
    "department": "IT",
    "sensitivity": "Internal"
  },
  "intentType": "string (optional)"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid event type
- `401`: Unauthorized
- `429`: Rate limit exceeded
- `500`: Failed to log usage

**Notes:**
- Only filter keys are stored, not values (privacy by design)
- User IDs are SHA-256 hashed
- Query text is never stored

---

### Submit Feedback

**POST** `/api/feedback`

Submit feedback on an AI response. Regular chat users, not admin-only.

**Auth:** Bearer token with valid tenant JWT claims

**Request Body:**
```json
{
  "messageId": "string",
  "feedbackType": "thumbs_up" | "thumbs_down" | "report",
  "comment": "string (optional)"
}
```

**Response:**
```json
{
  "success": true
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid request body
- `401`: Unauthorized
- `500`: Failed to save feedback

---

## User Data Endpoints

### Saved Queries

**GET** `/api/saved-queries`

List saved queries for current user. Returns up to 50 queries, ordered by creation date.

**Auth:** Bearer token with valid tenant JWT claims

**Response:**
```json
[
  {
    "id": "cuid",
    "title": "HR policies search",
    "query": "HR policies",
    "filters": { "department": "HR" },
    "createdAt": "2026-03-18T10:00:00.000Z"
  }
]
```

---

**POST** `/api/saved-queries`

Save a new query. Maximum 50 per user.

**Request Body:**
```json
{
  "title": "HR policies search",
  "query": "HR policies",
  "filters": { "department": "HR" }
}
```

**Status Codes:**
- `201`: Created
- `400`: Validation error or limit reached (50 max)
- `401`: Unauthorized

---

**DELETE** `/api/saved-queries`

Delete a saved query by ID.

**Request Body:**
```json
{
  "id": "cuid"
}
```

---

### Favorites

**GET** `/api/favorites`

List favorited documents for current user.

**Auth:** Bearer token with valid tenant JWT claims

**Response:**
```json
[
  {
    "id": "cuid",
    "documentUrl": "https://contoso.sharepoint.com/...",
    "title": "Q4 Report.docx",
    "siteName": "Finance",
    "createdAt": "2026-03-18T10:00:00.000Z"
  }
]
```

---

**POST** `/api/favorites`

Add or update a favorite. Upserts on unique (tenantId + userHash + documentUrl).

**Request Body:**
```json
{
  "documentUrl": "https://contoso.sharepoint.com/...",
  "title": "Q4 Report.docx",
  "siteName": "Finance"
}
```

---

**DELETE** `/api/favorites`

Remove a favorite by document URL.

**Request Body:**
```json
{
  "documentUrl": "https://contoso.sharepoint.com/..."
}
```

---

### Recent Searches

**GET** `/api/recent-searches`

List the 20 most recent searches for current user.

**Auth:** Bearer token with valid tenant JWT claims

**Response:**
```json
[
  {
    "id": "cuid",
    "query": "HR policies",
    "resultCount": 12,
    "createdAt": "2026-03-18T10:00:00.000Z"
  }
]
```

---

**POST** `/api/recent-searches`

Record a search. Deduplicates within 1 hour. Auto-prunes to 50 entries.

**Request Body:**
```json
{
  "query": "HR policies",
  "resultCount": 12
}
```

---

## Admin Endpoints

### System Health

#### Get System Health

**GET** `/api/admin/health`

Run health checks against all external services (Database, Azure AD, AI Provider, Graph API).

**Auth:** Admin role required

**Response:**
```json
{
  "overall": "healthy" | "degraded" | "critical",
  "services": [
    {
      "name": "Database",
      "status": "healthy",
      "latencyMs": 45,
      "message": "Connected"
    },
    {
      "name": "Azure AD",
      "status": "healthy",
      "latencyMs": 120,
      "message": "Authenticated"
    }
  ],
  "checkedAt": "2026-03-18T10:00:00.000Z"
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden

---

### Configuration Management

#### Get Full Configuration

**GET** `/api/admin/config`

Fetch full tenant configuration. Auto-provisions on first admin access.

**Auth:** Admin role required (Global Admin or SharePoint Admin)

**Response:**
```json
{
  "tenantName": "Contoso Ltd",
  "taxonomy": { "department": [], "sensitivity": [], "status": [] },
  "contentTypes": [],
  "kqlPropertyMap": {},
  "searchFields": [],
  "keywords": [],
  "reviewPolicies": [],
  "searchBehaviour": {},
  "updatedAt": "2026-03-18T10:00:00.000Z",
  "currentVersion": 5,
  "hasDraft": false,
  "draft": null
}
```

**Status Codes:**
- `200`: Success
- `400`: Missing tenant ID
- `401`: Unauthorized
- `403`: Forbidden (not an admin)
- `500`: Failed to fetch config

---

#### Update Full Configuration

**PUT** `/api/admin/config`

Replace entire tenant configuration.

**Auth:** Admin role + `config_admin` or higher

**Request Body:**
```json
{
  "taxonomy": {
    "department": ["IT", "HR"],
    "sensitivity": ["Public", "Internal"],
    "status": ["Draft", "Approved"]
  },
  "contentTypes": ["Document", "Policy"],
  "kqlPropertyMap": {
    "department": "DepartmentOWSCHCS"
  },
  "searchFields": ["Title", "Body"],
  "keywords": [
    { "term": "AI", "synonyms": ["Artificial Intelligence"] }
  ],
  "reviewPolicies": [
    { "contentType": "Policy", "maxAgeDays": 365, "warningDays": 30 }
  ],
  "searchBehaviour": {
    "approvedOnly": false,
    "hideRestricted": true,
    "maxResults": 50,
    "recencyBoostDays": 90,
    "recencyWeight": 0.3,
    "matchWeight": 0.5,
    "freshnessWeight": 0.2
  }
}
```

**Response:**
```json
{
  "taxonomy": {},
  "contentTypes": [],
  "kqlPropertyMap": {},
  "searchFields": [],
  "keywords": [],
  "reviewPolicies": [],
  "searchBehaviour": {},
  "updatedAt": "2026-03-18T10:05:00.000Z"
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid request body
- `401`: Unauthorized
- `403`: Forbidden (insufficient role)
- `500`: Failed to update config

**Notes:**
- Automatically creates a config version snapshot
- Invalidates config cache
- Logs audit entry

---

#### Reset Configuration

**POST** `/api/admin/reset`

Reset all configuration to defaults. Requires confirmation.

**Auth:** Admin role + `config_admin` or higher

**Request Body:**
```json
{
  "confirm": true
}
```

**Response:**
```json
{
  "taxonomy": {},
  "contentTypes": [],
  "kqlPropertyMap": {},
  "searchFields": [],
  "keywords": [],
  "reviewPolicies": [],
  "searchBehaviour": {},
  "updatedAt": "2026-03-18T10:10:00.000Z"
}
```

**Status Codes:**
- `200`: Success
- `400`: Missing or invalid confirmation
- `401`: Unauthorized
- `403`: Forbidden (insufficient role)
- `500`: Failed to reset config

**Notes:**
- Creates a config version snapshot
- Invalidates config cache
- Logs audit entry

---

### Version Control

#### List Version History

**GET** `/api/admin/config/versions?page=1`

Paginated version history with metadata.

**Auth:** Admin role required

**Query Parameters:**
- `page` (optional): Page number (default: 1)

**Response:**
```json
{
  "versions": [
    {
      "id": "uuid",
      "version": 5,
      "status": "published" | "draft" | "archived",
      "section": "config" | "taxonomy" | "content-types" | "keywords" | "review-policies" | "search-behaviour" | "kql-map" | "search-fields" | "reset" | "rollback" | "import" | "draft",
      "authorName": "admin@contoso.com",
      "comment": "Updated taxonomy",
      "createdAt": "2026-03-18T10:00:00.000Z",
      "publishedAt": "2026-03-18T10:05:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 47,
  "totalPages": 3
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden
- `500`: Failed to fetch version history

---

#### Rollback to Version

**POST** `/api/admin/config/versions/{id}/rollback`

Rollback configuration to a specific version. Creates a new published version.

**Auth:** Admin role + `config_admin` or higher

**Response:**
```json
{
  "success": true,
  "rolledBackTo": 3,
  "newVersion": 6
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden (insufficient role)
- `404`: Version not found
- `500`: Failed to rollback

**Notes:**
- Copies target snapshot to TenantConfig
- Creates new published version
- Invalidates config cache
- Logs audit entry

---

### Draft Workflow

#### Get Current Draft

**GET** `/api/admin/config/draft`

Return current draft snapshot or null. At most one draft per tenant.

**Auth:** Admin role required

**Response:**
```json
{
  "draft": {
    "id": "uuid",
    "version": 6,
    "snapshot": {
      "taxonomy": {},
      "contentTypes": [],
      "kqlPropertyMap": {},
      "searchFields": [],
      "keywords": [],
      "reviewPolicies": [],
      "searchBehaviour": {}
    },
    "authorName": "admin@contoso.com",
    "comment": "Draft changes",
    "createdAt": "2026-03-18T09:00:00.000Z"
  }
}
```

**Status Codes:**
- `200`: Success (returns `{ "draft": null }` if no draft exists)
- `401`: Unauthorized
- `403`: Forbidden
- `500`: Failed to fetch draft

---

#### Save Draft

**POST** `/api/admin/config/draft`

Save edited configuration as draft. Replaces any existing draft.

**Auth:** Admin role required

**Request Body:**
```json
{
  "snapshot": {
    "taxonomy": {},
    "contentTypes": [],
    "kqlPropertyMap": {},
    "searchFields": [],
    "keywords": [],
    "reviewPolicies": [],
    "searchBehaviour": {}
  },
  "comment": "Work in progress (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "version": 6
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid request body
- `401`: Unauthorized
- `403`: Forbidden
- `500`: Failed to save draft

**Notes:**
- Deletes any existing draft before creating new one
- Does not affect live configuration

---

#### Publish Draft

**POST** `/api/admin/config/publish`

Publish current draft to live configuration.

**Auth:** Admin role + `config_admin` or higher

**Response:**
```json
{
  "success": true,
  "publishedVersion": 6
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden (insufficient role)
- `404`: No draft to publish
- `500`: Failed to publish draft

**Notes:**
- Copies draft snapshot to TenantConfig
- Marks draft as published
- Invalidates config cache
- Logs audit entry

---

#### Discard Draft

**DELETE** `/api/admin/config/draft`

Discard current draft without publishing.

**Auth:** Admin role required

**Response:**
```json
{
  "success": true
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden
- `500`: Failed to discard draft

---

### Section Updates

All section update endpoints require Admin role + `config_admin` or higher. They create version snapshots and log audit entries.

#### Update Taxonomy

**PATCH** `/api/admin/taxonomy`

Update taxonomy arrays (department/sensitivity/status).

**Request Body:**
```json
{
  "taxonomy": {
    "department": ["IT", "HR", "Finance"],
    "sensitivity": ["Public", "Internal", "Confidential"],
    "status": ["Draft", "Review", "Approved"]
  }
}
```

**Response:**
```json
{
  "taxonomy": {
    "department": ["IT", "HR", "Finance"],
    "sensitivity": ["Public", "Internal", "Confidential"],
    "status": ["Draft", "Review", "Approved"]
  }
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid request body
- `401`: Unauthorized
- `403`: Forbidden (insufficient role)
- `500`: Failed to update taxonomy

---

#### Update Content Types

**PATCH** `/api/admin/content-types`

Update content types list.

**Request Body:**
```json
{
  "contentTypes": ["Document", "Policy", "Procedure", "Guideline"]
}
```

**Response:**
```json
{
  "contentTypes": ["Document", "Policy", "Procedure", "Guideline"]
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid request body
- `401`: Unauthorized
- `403`: Forbidden (insufficient role)
- `500`: Failed to update content types

---

#### Update Keywords

**PATCH** `/api/admin/keywords`

Update keyword synonyms for search enhancement.

**Request Body:**
```json
{
  "keywords": [
    {
      "term": "AI",
      "synonyms": ["Artificial Intelligence", "ML", "Machine Learning"]
    },
    {
      "term": "HR",
      "synonyms": ["Human Resources", "People"]
    }
  ]
}
```

**Response:**
```json
{
  "keywords": [...]
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid request body
- `401`: Unauthorized
- `403`: Forbidden (insufficient role)
- `500`: Failed to update keywords

---

#### Update Review Policies

**PATCH** `/api/admin/review-policies`

Update content review/expiry policies.

**Request Body:**
```json
{
  "reviewPolicies": [
    {
      "contentType": "Policy",
      "maxAgeDays": 365,
      "warningDays": 30
    },
    {
      "contentType": "Procedure",
      "maxAgeDays": 730,
      "warningDays": 60
    }
  ]
}
```

**Response:**
```json
{
  "reviewPolicies": [...]
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid request body
- `401`: Unauthorized
- `403`: Forbidden (insufficient role)
- `500`: Failed to update review policies

---

#### Update Search Behaviour

**PATCH** `/api/admin/search-behaviour`

Update search algorithm parameters.

**Request Body:**
```json
{
  "searchBehaviour": {
    "approvedOnly": false,
    "hideRestricted": true,
    "maxResults": 50,
    "recencyBoostDays": 90,
    "recencyWeight": 0.3,
    "matchWeight": 0.5,
    "freshnessWeight": 0.2
  }
}
```

**Response:**
```json
{
  "searchBehaviour": {...}
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid request body
- `401`: Unauthorized
- `403`: Forbidden (insufficient role)
- `500`: Failed to update search behaviour

**Field Descriptions:**
- `approvedOnly`: Only return documents with approved status
- `hideRestricted`: Hide documents marked as restricted
- `maxResults`: Maximum search results to return
- `recencyBoostDays`: Boost documents modified within N days
- `recencyWeight`: Weight for recency scoring (0-1)
- `matchWeight`: Weight for relevance scoring (0-1)
- `freshnessWeight`: Weight for freshness scoring (0-1)

---

#### Update KQL Property Map

**PATCH** `/api/admin/kql-map`

Update KQL managed property mappings for SharePoint search.

**Request Body:**
```json
{
  "kqlPropertyMap": {
    "department": "DepartmentOWSCHCS",
    "sensitivity": "SensitivityOWSCHCS",
    "status": "StatusOWSCHCS",
    "contentType": "ContentTypeOWSCHCS"
  }
}
```

**Response:**
```json
{
  "kqlPropertyMap": {...}
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid request body
- `401`: Unauthorized
- `403`: Forbidden (insufficient role)
- `500`: Failed to update KQL property map

**Notes:**
- Property names must match SharePoint managed property names
- Used to build KQL queries for filtering search results

---

#### Update Search Fields

**PATCH** `/api/admin/search-fields`

Update fields to search in SharePoint.

**Request Body:**
```json
{
  "searchFields": ["Title", "Body", "Author", "FileName"]
}
```

**Response:**
```json
{
  "searchFields": ["Title", "Body", "Author", "FileName"]
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid request body
- `401`: Unauthorized
- `403`: Forbidden (insufficient role)
- `500`: Failed to update search fields

---

### Tenant Management

#### Get Tenant Info

**GET** `/api/admin/tenant-info`

Tenant metadata, admin role counts, system status.

**Auth:** Admin role required

**Response:**
```json
{
  "tenantId": "uuid",
  "tenantName": "Contoso Ltd",
  "consentStatus": "granted" | "unknown",
  "configuredAt": "2026-01-15T08:00:00.000Z",
  "lastConfigUpdate": "2026-03-18T10:00:00.000Z",
  "adminRoles": {
    "Global Administrator": 3,
    "SharePoint Administrator": 5
  },
  "systemStatus": {
    "database": "operational",
    "searchApi": "operational" | "unknown" | "error",
    "graphApi": "operational" | "unknown" | "error",
    "aiService": "operational" | "not_configured"
  },
  "version": {
    "app": "1.0.0",
    "schema": "1.1.0"
  }
}
```

**Status Codes:**
- `200`: Success
- `400`: Missing tenant ID
- `401`: Unauthorized
- `403`: Forbidden
- `500`: Failed to fetch tenant info

---

#### Export Configuration

**GET** `/api/admin/config/export`

Download full tenant configuration as JSON file.

**Auth:** Admin role + `auditor` or higher

**Response:**
- Content-Type: `application/json`
- Content-Disposition: `attachment; filename="tenant-config-{tenantId}-{date}.json"`

```json
{
  "taxonomy": {...},
  "contentTypes": [...],
  "kqlPropertyMap": {...},
  "searchFields": [...],
  "keywords": [...],
  "reviewPolicies": [...],
  "searchBehaviour": {...}
}
```

**Status Codes:**
- `200`: Success (file download)
- `401`: Unauthorized
- `403`: Forbidden (insufficient role)
- `404`: No configuration found
- `500`: Failed to export config

---

#### Import Configuration

**POST** `/api/admin/config/import`

Import configuration as a draft. Does not affect live config until published.

**Auth:** Admin role + `config_admin` or higher

**Request Body:**
```json
{
  "config": {
    "taxonomy": {...},
    "contentTypes": [...],
    "kqlPropertyMap": {...},
    "searchFields": [...],
    "keywords": [...],
    "reviewPolicies": [...],
    "searchBehaviour": {...}
  },
  "comment": "Imported from production (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "version": 7,
  "message": "Configuration saved as draft. Review and publish when ready."
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid request body
- `401`: Unauthorized
- `403`: Forbidden (insufficient role)
- `500`: Failed to import config

**Notes:**
- Creates a draft version, does not affect live config
- Use `/api/admin/config/publish` to apply imported config

---

#### Onboarding Checks

**GET** `/api/admin/onboarding`

Run readiness checks for tenant setup. Auto-updates onboarding status on success.

**Auth:** Admin role required

**Response:**
```json
{
  "onboardingStatus": "setup_pending" | "setup_complete",
  "checks": {
    "graphApi": {
      "passed": true,
      "message": "Graph API access verified"
    },
    "sharePointSearch": {
      "passed": true,
      "message": "SharePoint search access verified"
    },
    "aiService": {
      "passed": true,
      "message": "AI service API key configured"
    },
    "configExists": {
      "passed": false,
      "message": "No configuration found — defaults will be used"
    }
  },
  "allPassed": false
}
```

**Status Codes:**
- `200`: Success
- `400`: Missing tenant ID
- `401`: Unauthorized
- `403`: Forbidden
- `500`: Failed to run onboarding checks

**Notes:**
- Verifies Graph API access with live call to `/me`
- Tests SharePoint search with sample query
- Checks ANTHROPIC_API_KEY presence
- Updates tenant onboarding status to `setup_complete` if all checks pass

---

### Access Control

#### List Role Assignments

**GET** `/api/admin/roles`

List all role assignments for tenant.

**Auth:** Admin role + `auditor` or higher

**Response:**
```json
{
  "roles": [
    {
      "id": "uuid",
      "userHash": "abc123...",
      "role": "platform_admin" | "config_admin" | "auditor" | "viewer",
      "assignedBy": "xyz789...",
      "createdAt": "2026-03-18T08:00:00.000Z"
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden (insufficient role)

---

#### Assign Role

**PATCH** `/api/admin/roles`

Assign or update a user role.

**Auth:** Admin role + `platform_admin`

**Request Body:**
```json
{
  "userHash": "abc123...",
  "role": "platform_admin" | "config_admin" | "auditor" | "viewer"
}
```

**Response:**
```json
{
  "success": true
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid request body
- `401`: Unauthorized
- `403`: Forbidden (requires platform_admin)
- `500`: Failed to assign role

**Notes:**
- User hash is SHA-256 hash of user ID
- Creates or updates existing role assignment
- Logs audit entry

---

#### Remove Role

**DELETE** `/api/admin/roles`

Remove a role assignment.

**Auth:** Admin role + `platform_admin`

**Request Body:**
```json
{
  "userHash": "abc123..."
}
```

**Response:**
```json
{
  "success": true
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid request body
- `401`: Unauthorized
- `403`: Forbidden (requires platform_admin)
- `500`: Failed to remove role

**Notes:**
- Logs audit entry

---

#### List Feature Flags

**GET** `/api/admin/feature-flags`

List all feature flags for tenant.

**Auth:** Admin role required

**Response:**
```json
{
  "flags": [
    {
      "name": "enable_advanced_search",
      "enabled": true,
      "description": "Enable advanced search filters"
    },
    {
      "name": "enable_analytics_export",
      "enabled": false,
      "description": ""
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden

---

#### Toggle Feature Flag

**PATCH** `/api/admin/feature-flags`

Enable or disable a feature flag.

**Auth:** Admin role required

**Request Body:**
```json
{
  "name": "enable_advanced_search",
  "enabled": true,
  "description": "Enable advanced search filters (optional)"
}
```

**Response:**
```json
{
  "flags": [...]
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid request body
- `401`: Unauthorized
- `403`: Forbidden
- `500`: Failed to update feature flag

**Notes:**
- Creates flag if it doesn't exist
- Logs audit entry

---

### Analytics

#### Get Analytics

**GET** `/api/admin/analytics?period=7d|30d|90d`

Tenant usage analytics, health monitoring, and alerts.

**Auth:** Admin role required

**Query Parameters:**
- `period` (optional): `7d`, `30d`, or `90d` (default: `7d`)

**Response:**
```json
{
  "period": "7d",
  "searchCount": 1250,
  "chatCount": 980,
  "errorCount": 15,
  "errorRate": "1.2",
  "activeUsers": 87,
  "noResultCount": 42,
  "avgResultsPerQuery": "8.3",
  "usageSummary": {
    "searches": { "today": 180, "7d": 1250, "30d": 5200 },
    "aiAnswers": { "today": 140, "7d": 980, "30d": 4100 },
    "activeUsers": { "today": 25, "7d": 87, "30d": 210 }
  },
  "daily": [
    {
      "date": "2026-03-18",
      "search": 180,
      "chat": 140,
      "error": 2,
      "noResults": 5
    }
  ],
  "peakHours": [
    { "hour": 14, "count": 320 },
    { "hour": 10, "count": 280 }
  ],
  "topFilters": [
    { "filter": "department", "count": 420 },
    { "filter": "sensitivity", "count": 310 }
  ],
  "topIntents": [
    { "intent": "document_search", "count": 580, "percentage": "58" },
    { "intent": "policy_lookup", "count": 320, "percentage": "32" }
  ],
  "health": {
    "graphErrors": 3,
    "authErrors": 1,
    "noResultRate": "3.4",
    "hasZeroResultSpike": false,
    "hasMissingPropertyMapping": false,
    "status": "healthy" | "warning" | "degraded"
  },
  "alerts": [
    {
      "severity": "critical" | "warning" | "info",
      "message": "High error rate in last 24 hours: 12.5% (15 errors out of 120 events)"
    }
  ],
  "errorMonitoring": {
    "graphApiFailures": { "period": 5, "last24h": 2 },
    "authErrors": { "period": 3, "last24h": 1 },
    "aiFailures": { "period": 7, "last24h": 3 },
    "totalErrors24h": 6,
    "errorRate24h": "5.0"
  },
  "recentChanges": [
    {
      "action": "update",
      "section": "taxonomy",
      "details": "Updated departments (3), sensitivities (3), statuses (3)",
      "userHash": "abc123...",
      "createdAt": "2026-03-18T09:30:00.000Z"
    }
  ],
  "feedbackSummary": {
    "thumbsUp": 120,
    "thumbsDown": 15,
    "reports": 2,
    "total": 137
  }
}
```

**Status Codes:**
- `200`: Success
- `400`: Missing tenant ID
- `401`: Unauthorized
- `403`: Forbidden
- `500`: Failed to fetch analytics

**Notes:**
- Error rate calculated as: `(errors / total events) * 100`
- No-result rate: `(no_results / searches) * 100`
- Alerts triggered when:
  - Error rate > 10% in last 24h
  - Graph API failures > 3 in last 24h
  - Auth errors > 3 in last 24h
  - No-result spike > 30% of searches
  - KQL property mappings still using defaults
  - AI failures > 2 in last 24h

---

## Cron Endpoints

### Daily Aggregation

**GET** `/api/cron/daily-aggregate`

Aggregate yesterday's usage logs per tenant into daily summary.

**Auth:** `Authorization: Bearer <CRON_SECRET>` header

**Response:**
```json
{
  "success": true,
  "date": "2026-03-17",
  "tenantsProcessed": 5,
  "results": [
    {
      "tenantId": "uuid",
      "searchCount": 250,
      "chatCount": 200,
      "errorCount": 3
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized (missing or invalid CRON_SECRET)
- `500`: Aggregation failed

**Notes:**
- Should be scheduled to run daily at 00:30 UTC
- Creates/updates `UsageDailySummary` records for reporting
- Processes all tenants with logs from yesterday

---

### Weekly Cleanup

**GET** `/api/cron/weekly-cleanup`

Delete usage logs older than 90 days.

**Auth:** `Authorization: Bearer <CRON_SECRET>` header

**Response:**
```json
{
  "success": true,
  "deletedCount": 12543,
  "cutoffDate": "2025-12-18"
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized (missing or invalid CRON_SECRET)
- `500`: Cleanup failed

**Notes:**
- Should be scheduled to run weekly
- Deletes `UsageLog` records older than 90 days
- Daily summaries are retained indefinitely

---

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common Error Codes

| Status Code | Description | Common Causes |
|-------------|-------------|---------------|
| `400` | Bad Request | Missing required fields, invalid request body, validation errors |
| `401` | Unauthorized | Missing or invalid Authorization header, expired token |
| `403` | Forbidden | Valid auth but insufficient permissions, role check failed |
| `404` | Not Found | Resource not found (version, draft, tenant config) |
| `429` | Too Many Requests | Rate limit exceeded (usage logging) |
| `500` | Internal Server Error | Database error, external service failure, unexpected error |

### Validation Errors

Request body validation failures return `400` with descriptive error messages:

```json
{
  "error": "Invalid request body: taxonomy.department must be an array"
}
```

### Authentication Errors

```json
{
  "error": "Unauthorized"
}
```

```json
{
  "error": "Forbidden"
}
```

### Rate Limiting

```json
{
  "error": "Rate limit exceeded"
}
```

Rate limits:
- `/api/usage`: 100 events per user per minute (in-memory rate limiter)

---

## Best Practices

### Authentication
- Always include `Authorization: Bearer <token>` header
- Tokens should be Azure AD access tokens for admin endpoints
- Refresh tokens before expiry to avoid 401 errors

### Error Handling
- Check HTTP status code first
- Parse error message from JSON response body
- Implement exponential backoff for 5xx errors
- Don't retry 4xx errors (except 429)

### Configuration Updates
- Use section-specific PATCH endpoints for targeted updates
- Use PUT /api/admin/config for bulk updates
- Always save drafts before publishing major changes
- Export config before making significant changes
- Test changes in a separate tenant first

### Version Control
- Use drafts for experimental changes
- Review version history before rollback
- Add meaningful comments to drafts and imports
- Monitor audit logs for change tracking

### Performance
- Cache tenant config responses (invalidated on updates)
- Use pagination for version history (20 items per page)
- Filter analytics by shorter periods for faster responses
- Batch-update configuration instead of multiple PATCH calls

### Security
- Never log sensitive data in usage events
- User IDs are automatically hashed (SHA-256)
- Query text is never stored
- Only filter keys are logged, not values
- Audit logs track all configuration changes

---

**Document Version:** 1.0.0
**Last Updated:** 2026-03-18
**API Version:** 1.1.0
