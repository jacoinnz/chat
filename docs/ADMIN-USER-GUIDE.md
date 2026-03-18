# Admin User Guide

## Overview

This guide provides step-by-step instructions for administrators of the SharePoint Search Chat application. The admin portal allows you to configure search behavior, manage taxonomy, control access, and monitor system health.

**Admin Portal URL:** `/admin`

**Access Requirements:** Azure AD Global Administrator or SharePoint Administrator role

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Tenant Settings](#tenant-settings)
4. [Version History & Rollback](#version-history--rollback)
5. [Metadata Configuration](#metadata-configuration)
6. [Content Types](#content-types)
7. [Keywords & Synonyms](#keywords--synonyms)
8. [Review Policies](#review-policies)
9. [Search Behaviour](#search-behaviour)
10. [KQL Configuration](#kql-configuration)
11. [Onboarding](#onboarding)
12. [Role Management](#role-management)
13. [Feature Flags](#feature-flags)
14. [Import/Export](#importexport)
15. [Draft Workflow](#draft-workflow)
16. [Common Tasks](#common-tasks)

---

## Getting Started

### Accessing the Admin Portal

1. Navigate to `/admin` in your browser
2. Sign in with your Azure AD credentials
3. Ensure your account has Global Administrator or SharePoint Administrator permissions
4. You will land on the Dashboard page

### Navigation

The admin portal is organized into four sections:

- **Overview:** Dashboard, Settings, Version History
- **Taxonomy:** Metadata, Content Types, Keywords
- **Governance:** Review Policies, Search Behaviour, KQL Config
- **Administration:** Onboarding, Role Management, Feature Flags, Import/Export

---

## Dashboard

**Route:** `/admin`

The Dashboard provides an at-a-glance view of system health and usage.

### Sections

**Analytics**
- Total queries processed
- Active users count
- Average response time
- Query trends over time

**Health Status**
- Graph API connectivity
- SharePoint access status
- AI service availability
- Configuration validation status

**Alerts**
- Critical system alerts
- Configuration warnings
- Service disruptions

**Usage Summary**
- Top search queries
- Peak usage times
- User engagement metrics

**Error Monitoring**
- Recent error count
- Error types and frequency
- Failed query patterns

**Recent Changes**
- Latest configuration updates
- Version history summary
- Draft status indicator

**Feedback Summary**
- User feedback ratings
- Common feedback themes
- Improvement suggestions

---

## Tenant Settings

**Route:** `/admin/settings`

Manage tenant-level configuration and system settings.

### Tenant Information

View and update basic tenant details:
- Tenant ID (read-only)
- Tenant name
- Organization details
- Contact information

### Access Control

Configure authentication and authorization:
- Allowed domains
- Sign-in restrictions
- Session timeout settings

### System Status

Monitor core system components:
- Database connection status
- API service health
- Configuration validity

### Reset to Defaults

**Warning:** This action cannot be undone without a version rollback.

1. Click "Reset to Defaults" button
2. Review the confirmation dialog
3. Type the confirmation text to proceed
4. Click "Confirm Reset"
5. All configuration will revert to system defaults
6. A new version is automatically created before reset

---

## Version History & Rollback

**Route:** `/admin/version-history`

View all configuration versions and restore previous versions.

### Viewing Version History

The version history page displays:
- Version number
- Timestamp
- Author (user who made the change)
- Status (Published/Draft/Archived)
- Section modified
- Snapshot preview

### Filtering Versions

- **Status Filter:** Published, Draft, Archived
- **Section Filter:** All sections, specific configuration areas
- **Date Range:** Filter by creation date

### Rolling Back to a Previous Version

1. Navigate to `/admin/version-history`
2. Locate the version you want to restore
3. Click the "Rollback" button on that version
4. Review the confirmation dialog showing version details
5. Click "Confirm Rollback"
6. The selected version's configuration will be copied to the active config
7. A new version is automatically created to record the rollback

**Important Notes:**
- Only published versions can be rolled back
- Rollback creates a new version (does not delete history)
- Current draft (if exists) is not affected by rollback
- All users will immediately see the rolled-back configuration

---

## Metadata Configuration

**Route:** `/admin/metadata`

Configure metadata arrays used for document classification and filtering.

### Departments

Manage the list of organizational departments:

1. View existing departments in the table
2. Click "Add Department" to create new entry
3. Enter department name and code
4. Click "Save" to commit changes
5. Use "Remove" button to delete departments
6. Click "Save as Draft" for review, or "Publish" to apply immediately

**Example Departments:**
- Human Resources (HR)
- Information Technology (IT)
- Finance (FIN)
- Operations (OPS)

### Sensitivity Levels

Define document sensitivity classifications:

1. Add sensitivity levels in order of increasing restriction
2. Include label and description
3. Map to Microsoft Information Protection labels if used

**Example Sensitivity Levels:**
- Public
- Internal
- Confidential
- Restricted

### Status Values

Configure document lifecycle statuses:

1. Add status values representing document states
2. Use consistent naming conventions
3. Map to SharePoint metadata columns

**Example Status Values:**
- Draft
- In Review
- Approved
- Published
- Archived

### Saving Changes

- **Save as Draft:** Changes are saved but not active
- **Publish:** Changes go live immediately
- **Draft Banner:** If a draft exists, an amber banner appears with Publish/Discard options

---

## Content Types

**Route:** `/admin/content-types`

Manage SharePoint content types recognized by the search system.

### Adding Content Types

1. Click "Add Content Type"
2. Enter the following details:
   - **Name:** Display name (e.g., "Policy Document")
   - **ID:** SharePoint content type ID (e.g., "0x0101009...")
   - **Description:** Brief explanation of content type purpose
3. Click "Add"

### Editing Content Types

1. Locate the content type in the table
2. Click the "Edit" icon
3. Update fields as needed
4. Click "Save"

### Removing Content Types

1. Click the "Remove" icon next to the content type
2. Confirm deletion
3. Save changes

### Publishing Changes

- Click "Save as Draft" to save without activating
- Click "Publish" to apply changes immediately
- Review draft banner before publishing

**Important:** Content types must match SharePoint site content type IDs exactly.

---

## Keywords & Synonyms

**Route:** `/admin/keywords`

Configure synonym groups for search query expansion.

### Understanding Synonym Groups

Synonym groups improve search by expanding queries with related terms. When a user searches for one term in a group, results for all terms are included.

### Adding Synonym Groups

1. Click "Add Keyword Group"
2. Enter a group name (e.g., "Contract Terms")
3. Add synonyms separated by commas:
   - Example: "contract, agreement, MOU, memorandum"
4. Click "Save"

### Editing Synonym Groups

1. Click the "Edit" icon on a keyword group
2. Modify the group name or synonym list
3. Click "Save"

### Removing Synonym Groups

1. Click the "Remove" icon
2. Confirm deletion
3. Save changes

### Best Practices

- Group related terms that users might search interchangeably
- Include acronyms and full names (e.g., "HR, Human Resources")
- Include common misspellings if applicable
- Avoid overly broad groupings that reduce precision

### Example Synonym Groups

```
Financial Terms: invoice, bill, receipt, payment, remittance
Policies: policy, procedure, guideline, protocol, standard
Contracts: contract, agreement, MOU, memorandum, accord
```

---

## Review Policies

**Route:** `/admin/review-policies`

Define staleness rules that flag documents needing review based on age.

### Understanding Review Policies

Review policies automatically identify documents that may be outdated based on:
- Content type
- Days since last modified
- Notification thresholds

### Creating Review Policies

1. Click "Add Review Policy"
2. Select a **Content Type** from the dropdown
3. Enter **Review Threshold** (days since last modified)
4. Enter **Warning Threshold** (days before review threshold for early warning)
5. Click "Save"

### Example Configuration

| Content Type | Review Threshold | Warning Threshold |
|--------------|------------------|-------------------|
| Policy Document | 365 days | 330 days |
| Procedure | 180 days | 150 days |
| Form Template | 90 days | 75 days |

### Editing Review Policies

1. Locate the policy in the table
2. Click "Edit"
3. Update thresholds
4. Click "Save"

### Removing Review Policies

1. Click "Remove" next to the policy
2. Confirm deletion
3. Save changes

### Publishing Changes

- Use "Save as Draft" for review
- Use "Publish" to activate immediately

---

## Search Behaviour

**Route:** `/admin/search-behaviour`

Configure search result filtering, limits, and ranking weights.

### Safety Filters

Control which documents appear in search results:

1. **Exclude Archived Documents**
   - Toggle to hide documents with "Archived" status
   - Recommended: Enabled

2. **Exclude Expired Documents**
   - Toggle to hide documents past expiration date
   - Recommended: Enabled

3. **Respect Sensitivity Levels**
   - Toggle to filter results based on user permissions
   - Recommended: Enabled

### Result Limits

Configure maximum results returned:

1. **Max Results Per Query**
   - Default: 50
   - Range: 10-200
   - Higher values increase response time

2. **Results Per Page**
   - Default: 10
   - Range: 5-50
   - Affects pagination in UI

### Ranking Weights

Adjust how results are ranked (values 0.0 to 1.0):

1. **Relevance Weight**
   - Default: 0.5
   - How much to prioritize keyword match

2. **Recency Weight**
   - Default: 0.3
   - How much to prioritize recent documents

3. **Authority Weight**
   - Default: 0.2
   - How much to prioritize authoritative sources

**Note:** Weights should sum to 1.0 for optimal results.

### Saving Changes

- Click "Save as Draft" for testing
- Click "Publish" to apply immediately
- Monitor dashboard for impact on query performance

---

## KQL Configuration

**Route:** `/admin/kql-config`

Configure Keyword Query Language (KQL) settings for SharePoint search.

### Property Mappings

Map internal property names to SharePoint managed properties:

1. Click "Add Property Mapping"
2. Enter **Internal Name** (used in application code)
3. Enter **SharePoint Managed Property** (exact SharePoint property name)
4. Select **Data Type** (Text, DateTime, Number, etc.)
5. Click "Save"

### Example Property Mappings

| Internal Name | SharePoint Property | Data Type |
|---------------|---------------------|-----------|
| department | RefinableString01 | Text |
| sensitivity | RefinableString02 | Text |
| documentStatus | RefinableString03 | Text |
| lastModified | LastModifiedTime | DateTime |
| author | Author | Text |

### Search Fields

Configure which SharePoint properties are included in full-text search:

1. View existing search fields
2. Click "Add Search Field"
3. Enter SharePoint managed property name
4. Assign weight (higher = more important)
5. Click "Save"

### Example Search Fields

```
Title: weight 3.0
Body: weight 1.0
Author: weight 2.0
FileName: weight 1.5
```

### Publishing Changes

- KQL changes save to two endpoints automatically
- Changes require testing in search results
- Use "Save as Draft" to test without affecting users

### Testing KQL Changes

1. Save as draft
2. Use developer tools to enable draft mode in UI
3. Test search queries
4. Verify property filters work correctly
5. Publish when validated

---

## Onboarding

**Route:** `/admin/onboarding`

Run readiness checks before deploying the application to users.

### Readiness Checks

The onboarding page performs automated checks:

1. **Graph API Connectivity**
   - Verifies Azure AD authentication
   - Tests Microsoft Graph API access
   - Validates permissions

2. **SharePoint Access**
   - Confirms SharePoint site connectivity
   - Tests search API availability
   - Validates content type access

3. **AI Service**
   - Checks Claude API connectivity
   - Validates API key
   - Tests model availability

4. **Configuration Validity**
   - Validates all config sections
   - Checks for required fields
   - Identifies configuration errors

### Running Checks

1. Navigate to `/admin/onboarding`
2. Click "Run All Checks"
3. Review results for each section
4. Address any failures or warnings

### Resolving Issues

**Graph API Failures:**
- Verify Azure AD app registration
- Check API permissions (Sites.Read.All, User.Read)
- Ensure admin consent granted

**SharePoint Failures:**
- Verify SharePoint site URL in configuration
- Check service account permissions
- Validate search service is enabled

**AI Service Failures:**
- Verify Claude API key in environment variables
- Check API quota and limits
- Test API endpoint connectivity

**Configuration Failures:**
- Review error messages for specific issues
- Validate required fields are populated
- Check for malformed JSON or data types

### Completing Onboarding

1. Ensure all checks show green status
2. Review tenant settings
3. Configure initial metadata and content types
4. Set up at least one admin user role
5. Enable required feature flags
6. Test with a non-admin user account

---

## Role Management

**Route:** `/admin/roles`

Assign granular admin roles to users for access control.

### Available Roles

1. **platform_admin**
   - Full system access
   - Can modify all settings
   - Can assign roles to others
   - Can import/export configuration

2. **config_admin**
   - Can modify taxonomy and governance settings
   - Cannot manage roles or feature flags
   - Cannot export configuration

3. **auditor**
   - Read-only access to all settings
   - Can view version history
   - Can view analytics and logs
   - Cannot modify any settings

4. **viewer**
   - Limited read-only access
   - Can view dashboard and basic settings
   - Cannot view sensitive data or logs

### Adding User Roles

1. Obtain the user's Azure AD Object ID (OID)
   - Found in Azure AD portal under user profile
   - Example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

2. Generate SHA-256 hash of the OID:
   ```bash
   echo -n "a1b2c3d4-e5f6-7890-abcd-ef1234567890" | shasum -a 256
   ```

3. In the Role Management page:
   - Click "Add User Role"
   - Enter the **SHA-256 hash** (not the OID itself)
   - Select the **Role** from dropdown
   - Click "Save"

### Why SHA-256 Hashing?

User identifiers are hashed for privacy and security:
- Prevents exposure of Azure AD Object IDs
- Complies with data protection requirements
- Enables role-based access without storing PII

### Editing User Roles

1. Locate the user in the table (identified by hash prefix)
2. Click "Edit"
3. Select new role
4. Click "Save"

### Removing User Roles

1. Click "Remove" next to the user
2. Confirm deletion
3. User will lose admin portal access on next login

### Best Practices

- Grant minimum required role for each user
- Regularly audit role assignments
- Remove roles for users who change positions
- Use platform_admin sparingly (maximum 2-3 users)
- Assign auditor role for compliance teams

---

## Feature Flags

**Route:** `/admin/feature-flags`

Enable or disable optional platform features.

### Available Feature Flags

1. **feedbackLoop**
   - Enables user feedback collection on search results
   - Adds feedback buttons to UI
   - Stores feedback in usage logs
   - **Recommended:** Enabled for continuous improvement

2. **bulkAdmin**
   - Enables bulk import/export functionality
   - Allows configuration backup and restore
   - Required for multi-tenant migrations
   - **Recommended:** Enabled for admins

3. **advancedAnalytics**
   - Enables detailed analytics and reporting
   - Adds query performance metrics
   - Includes user behavior tracking
   - **Recommended:** Enabled for large deployments

### Toggling Feature Flags

1. Navigate to `/admin/feature-flags`
2. Locate the feature flag
3. Click the toggle switch
4. Changes take effect immediately (no save required)

### Impact of Feature Flags

| Feature Flag | When Enabled | When Disabled |
|--------------|--------------|---------------|
| feedbackLoop | Feedback buttons visible, data collected | No feedback UI, no data collected |
| bulkAdmin | Import/Export page accessible | Import/Export page hidden |
| advancedAnalytics | Full analytics dashboard | Basic metrics only |

### Testing Feature Flags

1. Enable flag in admin portal
2. Open application in incognito/private window
3. Verify feature is visible
4. Test feature functionality
5. Disable flag to hide feature

---

## Import/Export

**Route:** `/admin/bulk`

Export configuration for backup or import configuration from another tenant.

**Requirement:** `bulkAdmin` feature flag must be enabled.

### Exporting Configuration

1. Navigate to `/admin/bulk`
2. Click "Export Configuration"
3. Select sections to export:
   - All sections (full backup)
   - Specific sections (partial backup)
4. Click "Download JSON"
5. Save the JSON file securely

**Export Format:**
```json
{
  "version": "1.0",
  "timestamp": "2026-03-18T12:00:00Z",
  "tenant": "tenant-id",
  "config": {
    "metadata": { ... },
    "contentTypes": [ ... ],
    "keywords": [ ... ],
    "reviewPolicies": [ ... ],
    "searchBehaviour": { ... },
    "kqlConfig": { ... }
  }
}
```

### Importing Configuration

**Warning:** Import overwrites existing configuration. Always export current config first.

1. Navigate to `/admin/bulk`
2. Click "Import Configuration"
3. Select JSON file exported from another tenant
4. Review the preview of changes
5. Select import mode:
   - **Import as Draft:** Changes saved as draft for review
   - **Import and Publish:** Changes go live immediately
6. Click "Import"
7. Verify success message

### Import as Draft Workflow

1. Import configuration file as draft
2. Review changes in each config section
3. Test draft configuration (if test mode available)
4. Navigate to each section to review draft changes
5. Publish draft when ready, or discard if issues found

### Use Cases

**Backup and Restore:**
- Export weekly backups
- Store in secure location
- Restore if configuration corrupted

**Multi-Tenant Migration:**
- Export from source tenant
- Import to destination tenant as draft
- Customize for destination tenant
- Publish when ready

**Configuration Templates:**
- Export standard configuration
- Use as template for new tenants
- Customize per tenant needs

### Best Practices

- Export before major changes
- Label exports with date and purpose
- Store exports in version control
- Test imports in non-production tenant first
- Document configuration changes in exports

---

## Draft Workflow

The draft workflow allows you to prepare and review configuration changes before publishing to users.

### Understanding Drafts

- Each tenant can have one active draft at a time
- Drafts are created by clicking "Save as Draft" on any config page
- Drafts do not affect active configuration until published
- Drafts can be discarded without affecting active configuration

### Creating a Draft

1. Navigate to any configuration page (Metadata, Content Types, Keywords, etc.)
2. Make your desired changes
3. Click "Save as Draft" instead of "Publish"
4. An amber draft banner appears at the top of the page

### Draft Banner

When a draft exists, you'll see an amber banner:
- Shows draft creation date and author
- Provides "Publish" button to activate draft
- Provides "Discard" button to delete draft
- Appears on all admin pages

### Publishing a Draft

**Method 1: From Draft Banner**
1. Click "Publish" on the amber draft banner
2. Confirm publication
3. Draft becomes active configuration
4. New version is created in version history
5. Draft is deleted

**Method 2: From API**
1. Navigate to `/api/admin/config/draft/publish`
2. Send POST request
3. Draft is published and deleted

### Discarding a Draft

**Warning:** Discarding a draft deletes all draft changes permanently.

1. Click "Discard" on the amber draft banner
2. Confirm discard action
3. Draft is deleted
4. Active configuration remains unchanged
5. No version is created

### Draft Workflow Best Practices

1. **Batch Related Changes**
   - Make all related changes in one draft
   - Example: Update metadata, content types, and keywords together

2. **Review Before Publishing**
   - Review draft changes on each affected page
   - Verify consistency across sections
   - Check for validation errors

3. **Test When Possible**
   - Use test queries to validate search behavior
   - Check filters and ranking weights
   - Verify synonym expansion

4. **Coordinate with Team**
   - Communicate draft creation to other admins
   - Only one draft allowed per tenant
   - Publish or discard before others can create drafts

5. **Document Changes**
   - Keep notes on why changes were made
   - Include notes when publishing (if available)
   - Reference version history for audit trail

### Draft Limitations

- Only one draft per tenant at a time
- Drafts are not automatically published
- Drafts do not expire (manual action required)
- Draft changes are not visible to end users
- Cannot create draft if one already exists

---

## Common Tasks

### Task 1: Initial System Setup

1. Navigate to `/admin/onboarding`
2. Run all readiness checks
3. Resolve any failures
4. Go to `/admin/settings` and configure tenant information
5. Go to `/admin/metadata` and set up departments, sensitivity levels, status values
6. Go to `/admin/content-types` and add SharePoint content types
7. Go to `/admin/kql-config` and map SharePoint properties
8. Go to `/admin/roles` and assign admin roles to key users
9. Go to `/admin/feature-flags` and enable desired features
10. Test with end user account

### Task 2: Add New Department

1. Navigate to `/admin/metadata`
2. Scroll to "Departments" section
3. Click "Add Department"
4. Enter name and code
5. Click "Save as Draft"
6. Review changes
7. Click "Publish" on draft banner

### Task 3: Update Search Result Limits

1. Navigate to `/admin/search-behaviour`
2. Locate "Result Limits" section
3. Update "Max Results Per Query" value
4. Click "Publish" to apply immediately
5. Monitor dashboard for performance impact

### Task 4: Restore Previous Configuration

1. Navigate to `/admin/version-history`
2. Find the version you want to restore
3. Click "Rollback" button
4. Review confirmation details
5. Click "Confirm Rollback"
6. Verify changes on affected config pages

### Task 5: Create Configuration Backup

1. Navigate to `/admin/feature-flags`
2. Enable "bulkAdmin" if not already enabled
3. Navigate to `/admin/bulk`
4. Click "Export Configuration"
5. Select "All Sections"
6. Click "Download JSON"
7. Save file with descriptive name: `config-backup-2026-03-18.json`

### Task 6: Migrate Configuration to New Tenant

1. In source tenant: Export full configuration
2. In destination tenant: Enable "bulkAdmin" feature flag
3. Navigate to `/admin/bulk`
4. Click "Import Configuration"
5. Select exported JSON file
6. Choose "Import as Draft"
7. Review draft changes on each config page
8. Customize for destination tenant as needed
9. Publish draft when ready

### Task 7: Grant Admin Access to New User

1. Obtain user's Azure AD Object ID
2. Generate SHA-256 hash: `echo -n "OID" | shasum -a 256`
3. Navigate to `/admin/roles`
4. Click "Add User Role"
5. Paste SHA-256 hash
6. Select appropriate role
7. Click "Save"
8. Notify user of admin access

### Task 8: Configure Synonym Group

1. Navigate to `/admin/keywords`
2. Click "Add Keyword Group"
3. Enter group name: "Financial Terms"
4. Enter synonyms: "invoice, bill, receipt, payment"
5. Click "Save as Draft"
6. Test search queries with each term
7. Publish when validated

### Task 9: Set Document Review Policy

1. Navigate to `/admin/review-policies`
2. Click "Add Review Policy"
3. Select content type: "Policy Document"
4. Enter review threshold: 365 days
5. Enter warning threshold: 330 days
6. Click "Publish"
7. Monitor dashboard for flagged documents

### Task 10: Reset Configuration to Defaults

**Warning:** Only use when absolutely necessary.

1. Navigate to `/admin/version-history`
2. Export current configuration as backup
3. Navigate to `/admin/settings`
4. Scroll to "Reset to Defaults" section
5. Click "Reset to Defaults"
6. Type confirmation text
7. Click "Confirm Reset"
8. Reconfigure essential settings
9. Test thoroughly before user access

---

## Troubleshooting

### Draft Won't Publish

**Symptoms:** "Publish" button fails or shows error

**Solutions:**
- Check for validation errors in draft changes
- Verify all required fields are populated
- Ensure no conflicting values (e.g., duplicate content type IDs)
- Discard draft and recreate if corrupted

### Changes Not Appearing for Users

**Symptoms:** Users don't see updated configuration

**Solutions:**
- Verify draft was published (check for amber banner)
- Clear browser cache
- Wait 1-2 minutes for cache expiration
- Check version history to confirm publish created new version

### Cannot Create Draft

**Symptoms:** "Save as Draft" button disabled or fails

**Solutions:**
- Check if draft already exists (amber banner visible)
- Publish or discard existing draft first
- Verify admin permissions (platform_admin or config_admin role)

### Rollback Failed

**Symptoms:** Rollback button fails or shows error

**Solutions:**
- Verify version is "Published" status (drafts cannot be rolled back)
- Check admin permissions
- Refresh page and try again
- Contact support if issue persists

### Import Failed

**Symptoms:** Configuration import shows error

**Solutions:**
- Verify JSON file format matches export format
- Check for syntax errors in JSON
- Ensure bulkAdmin feature flag is enabled
- Verify tenant ID matches (if restricted)
- Try importing as draft instead of direct publish

### Onboarding Checks Failing

**Symptoms:** Red status on readiness checks

**Solutions:**
- **Graph API:** Check Azure AD app registration, permissions, admin consent
- **SharePoint:** Verify site URL, search service enabled, permissions
- **AI Service:** Validate Claude API key, check quota, test endpoint
- **Configuration:** Review error details, fix validation issues

---

## Security Best Practices

1. **Role Management**
   - Assign minimum required roles
   - Regularly audit role assignments
   - Remove roles for former employees immediately
   - Limit platform_admin to 2-3 trusted users

2. **Configuration Changes**
   - Use draft workflow for major changes
   - Test changes before publishing
   - Document rationale for changes
   - Export backups before risky changes

3. **Version Control**
   - Review version history monthly
   - Understand who made each change
   - Rollback suspicious changes immediately
   - Keep export backups in secure storage

4. **Access Monitoring**
   - Monitor dashboard for unusual activity
   - Review error logs regularly
   - Investigate spikes in failed queries
   - Alert security team for anomalies

5. **Data Privacy**
   - User IDs are hashed (SHA-256) in usage logs
   - Do not share export files (may contain sensitive config)
   - Restrict admin portal access to necessary users
   - Follow data retention policies

---

## Support & Resources

### Getting Help

- **Technical Issues:** Contact IT support team
- **Configuration Questions:** Consult this guide or reach out to platform administrators
- **Access Issues:** Contact Global Administrator or SharePoint Administrator

### Additional Documentation

- Azure AD Admin: [Microsoft Entra admin center](https://entra.microsoft.com)
- SharePoint Admin: [SharePoint admin center](https://admin.microsoft.com/sharepoint)
- Microsoft Graph API: [Graph Explorer](https://developer.microsoft.com/graph/graph-explorer)

### Version Information

- **Guide Version:** 1.0
- **Last Updated:** 2026-03-18
- **Application Stack:** Next.js 16.1.6, React 19, Prisma 7, Turso (LibSQL)

---

## Appendix

### Color Scheme Reference

- **Primary:** #0d3b66 (Deep Blue)
- **Accent:** #1976d2 (Bright Blue)
- **Background:** #e8eef4 (Light Blue-Gray)
- **Text:** #1a2a3a (Dark Blue-Gray)
- **Border:** #d0d8e0 (Light Gray)
- **Muted:** #667781 (Medium Gray)

### API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/config/metadata` | GET/POST | Metadata config |
| `/api/admin/config/content-types` | GET/POST | Content types config |
| `/api/admin/config/keywords` | GET/POST | Keywords config |
| `/api/admin/config/review-policies` | GET/POST | Review policies config |
| `/api/admin/config/search-behaviour` | GET/POST | Search behaviour config |
| `/api/admin/config/kql-config` | GET/POST | KQL config |
| `/api/admin/config/draft` | GET | Get current draft |
| `/api/admin/config/draft/publish` | POST | Publish draft |
| `/api/admin/config/draft/discard` | POST | Discard draft |
| `/api/admin/config/versions` | GET | List versions |
| `/api/admin/config/versions/[id]/rollback` | POST | Rollback version |
| `/api/admin/settings` | GET/POST | Tenant settings |
| `/api/admin/roles` | GET/POST | Role management |
| `/api/admin/feature-flags` | GET/POST | Feature flags |
| `/api/admin/bulk/export` | GET | Export config |
| `/api/admin/bulk/import` | POST | Import config |

### Configuration Schema Reference

**TenantConfig Model Fields:**
- `id` (string)
- `tenantId` (string)
- `metadata` (JSON)
- `contentTypes` (JSON)
- `keywords` (JSON)
- `reviewPolicies` (JSON)
- `searchBehaviour` (JSON)
- `kqlConfig` (JSON)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**ConfigVersion Model Fields:**
- `id` (string)
- `tenantId` (string)
- `version` (number)
- `status` (enum: Published, Draft, Archived)
- `snapshot` (JSON)
- `section` (string, nullable)
- `author` (string)
- `createdAt` (DateTime)

---

**End of Admin User Guide**
