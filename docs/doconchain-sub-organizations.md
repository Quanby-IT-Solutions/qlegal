# Doconchain Sub-Organizations for Notaries

This document describes how to use the Doconchain **Create Sub Organization** API to add or create sub-organizations for notaries in Quanby Sign.

## Overview

- **Use case:** Create sub-organizations under the main Doconchain organization (e.g. one sub-org per notary office or department).
- **Endpoint:** `POST https://stg-api2.doconchain.com/api/v2/organizations/sub`
- **Auth:** Bearer token (user-token). Use `DOCONCHAIN_USER_TOKEN` or the token from `getDoconchainApiToken()`; the token must have permission to create sub-organizations.

## Who creates sub-organizations?

In Quanby Sign, the highest application role is **ADMIN** (there is no separate “superadmin” in the schema; roles are `ENP`, `PRINCIPAL`, `ENA`, `ADMIN`). Restrict **creation of sub-organizations to ADMIN** users only.

- **Recommended:** Only users with `role === "ADMIN"` can call the create–sub-organization flow (e.g. the tRPC procedure or server action that calls the Doconchain API). This matches how other privileged actions are guarded (e.g. user management, legal registration) in `features/user-management/api/user-management.router.ts` and `features/legal-registration/api/legal-registration.router.ts`.
- **Optional:** If you later introduce a dedicated “superadmin” role, you can limit sub-org creation to that role instead of or in addition to ADMIN.

## API Reference

### Create Sub Organization

**HTTP:** `POST https://stg-api2.doconchain.com/api/v2/organizations/sub?user_type=ENTERPRISE_API`

**Headers:**

- `Authorization: Bearer <user-token>`
- `Content-Type: multipart/form-data` (set automatically when sending `FormData`)

**Query:**

| Parameter   | Type   | Required | Description              |
|------------|--------|----------|--------------------------|
| user_type  | string | Yes      | Must be `ENTERPRISE_API` |

**Body (multipart/form-data):**

| Field                      | Type   | Required | Description                                      |
|---------------------------|--------|----------|--------------------------------------------------|
| name                      | string | Yes      | Name of the sub-organization                     |
| address                   | string | Yes      | Address or contact details                       |
| sub_organization_type_name| string | Yes      | Type (e.g. `Department`)                         |
| organization_uuid         | string | Yes      | UUID or ID of the parent organization            |
| photo                     | file   | No       | Logo/branding image (emails, signing page)       |

**Example request (curl):**

```bash
curl -X POST "https://stg-api2.doconchain.com/api/v2/organizations/sub?user_type=ENTERPRISE_API" \
  -H "Authorization: Bearer <user-token>" \
  -F "name=Notary Office Alpha" \
  -F "address=123 Main St, City" \
  -F "sub_organization_type_name=Department" \
  -F "organization_uuid=1"
```

**Example successful response (200):**

```json
{
  "id": "12345",
  "name": "test",
  "address": "address",
  "photo_url": "https://example.com/uploads/logo.png",
  "sub_organization_type_name": "Department",
  "organization_uuid": "1",
  "created_at": "2024-06-01T12:00:00Z"
}
```

**Error responses:**

- **400 Bad Request** – Missing required parameter (e.g. `organization_uuid`).
- **401 Unauthorized** – Invalid or missing authentication token.

## Integration with Quanby Sign

### Current setup

- Main org is identified by `DOCONCHAIN_ORGANIZATION_ID` (see `env.js`, `.env.example`).
- Auth uses `getDoconchainApiToken()` or configured `DOCONCHAIN_API_TOKEN` / `DOCONCHAIN_USER_TOKEN`.
- Existing Doconchain usage: projects, vault, tokens, organization members (`services/doconchain/`). No sub-organization API is implemented yet.

### Suggested implementation

1. **Service module**  
   Add e.g. `services/doconchain/organizations/create-sub-organization.ts` that:
   - Calls `POST .../api/v2/organizations/sub?user_type=ENTERPRISE_API`
   - Uses existing Doconchain auth (e.g. `getDoconchainApiToken()` or configured user token)
   - Builds `FormData` with `name`, `address`, `sub_organization_type_name`, `organization_uuid`, and optional `photo`
   - Returns the API response (including sub-org `id` / identifiers)

2. **Call site**  
   Call this service when creating a “notary sub-org” (e.g. from a tRPC procedure or server action that creates a notary office/department). Restrict to users with sufficient permissions (e.g. admin).

3. **Storage**  
   Persist the sub-organization identifier returned by Doconchain in your database so you can associate notaries or projects with that sub-org later.

### Parent organization

- Use `DOCONCHAIN_ORGANIZATION_ID` as the parent for new sub-organizations.
- If the API expects a string, pass `String(env.DOCONCHAIN_ORGANIZATION_ID)`; if it accepts a number, pass the value as-is (confirm in Doconchain API docs).

## Points to confirm with Doconchain

- **Project creation:** Whether projects can be created under a specific sub-organization (e.g. by sub-org id or by using a token scoped to that sub-org). This determines whether each notary office’s projects can be isolated per sub-org.
- **organization_uuid format:** Whether the parent is a numeric ID (as in the example `organization_uuid=1`) or a string UUID, and how it maps to `DOCONCHAIN_ORGANIZATION_ID`.

## Related files

- `env.js` – `DOCONCHAIN_*` env vars
- `.env.example` – Doconchain env template
- `services/doconchain/organization/add-member.ts` – pattern for Doconchain API calls and org id usage
- `services/doconchain/auth/generate-token.ts` – token retrieval
