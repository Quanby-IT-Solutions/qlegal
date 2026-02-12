# DocoChain API – Code Mapping

**Last Updated:** February 11, 2026

This document maps each DocoChain API feature to the exact code location in the codebase, in the same style as the Supreme Court API mapping.

---

## Table of Contents

| # | Area | Purpose | What It Does in Our System | What It Does with DocoChain |
|---|------|---------|----------------------------|-----------------------------|
| 1 | [Authentication](#1-authentication) | Get API token | Authenticates our system to call DocoChain. Supports per-email tokens, meeting-scoped and project-scoped tokens. Caches and verifies tokens. | Validates client credentials and returns a JWT used for all subsequent API requests. |
| 2 | [Create Project](#2-create-project) | Create signing project | Creates a DocoChain project from a PDF when ENP adds a document to a meeting. Stores project UUID and token for later link generation. | Creates a new e-signing project with the uploaded document and optional notary stamp; returns project UUID. |
| 3 | [Get Project Details](#3-get-project-details) | Project + signers status | Fetches project status, signers, and signed/completed state. Used for signing status, download flow, and UI. | Returns project metadata, signers, completion status, and document URLs. |
| 4 | [Get My Project Details](#4-get-my-project-details) | User-scoped project | Used when the current user is a participant (e.g. signed document download). Falls back to Get Project Details if not part of project. | Returns project details for the authenticated user (files, signers, signed document with seal). |
| 5 | [Add Signer](#5-add-signer) | Add signer to project | Adds a meeting participant as a signer to the DocoChain project before sending. Also used when ENP self-signs. | Registers a signer (email, name, role) on the project. |
| 6 | [Generate Sign Link](#6-generate-sign-link) | Signing URL for signer | Generates a one-time signing URL for a specific signer when the project is **sent**. Used for “Sign” flow (not plotting). | Returns a personalized link for the signer to complete signing. |
| 7 | [Generate Edit Draft Link](#7-generate-edit-draft-link) | Edit/plot/sign in draft | **Main link type** for our flow. Used for plotting signature positions and signing while project is still in draft. Uses meeting- or project-scoped token. | Returns a link to edit the draft (place signatures, sign) without sending the project. |
| 8 | [Send Project](#8-send-project) | Deploy for signing | Sends the project so signers can sign. Called after adding signers when ENP triggers “send” (e.g. self-sign flow). | Moves project from draft to sent; enables signing links. |
| 9 | [Check Signing Status](#9-check-signing-status) | Is document fully signed? | Wraps Get Project Details and derives isFullySigned, signedCount, signer list. Used before download and for UI. | Uses project details to determine if all signers have signed and project is completed. |
| 10 | [Download Signed Document](#10-download-signed-document) | Get sealed PDF | Downloads the signed (and sealed) PDF. Prefers download API, then files array, with retries for async seal. | Returns the completed document with notarial seal; may use `/download` or vault/files. |
| 11 | [Download Certificate](#11-download-certificate) | Get certificate PDF | Fetches the signing certificate for a project. Used for notarial book and audit. | Returns the certificate document linked to the project. |
| 12 | [Vault](#12-vault) | Stored documents | Lists vault items or gets one item by project UUID. Used as fallback for signed document download. | Provides access to stored/completed documents by project. |
| 13 | [Passport](#13-passport) | Blockchain/history/cert URL | Gets project passport views (blockchain, history, certificate_url, etc.). Used for notarial book and verification. | Returns verification/audit data for the project. |
| 14 | [Organization](#14-organization) | Auto-join / provision | Adds users to DocoChain org and optionally generates their token. Used on registration and when adding signers to meetings. | Registers/invites users to the organization for API-based access. |
| 15 | [Processing Completed](#15-processing-completed) | List completed projects | Lists completed projects for a user/org. Used in notarial book and envelopes-lite. | Returns paginated list of completed projects. |

---

## Status Indicators

| Status | Meaning | Example |
|--------|---------|---------|
| **MAIN** | Actively used in the primary flow | `createProject`, `generateEditDraftLink`, `checkSigningStatus`, `downloadSignedDocument` |
| **Used** | Used in specific flows (e.g. self-sign, auth, notarial book) | `sendProject`, `generateSignLink`, `getPassportDocument`, `provisionUser` |
| **NOT USED** | Implemented and exported but never called | `addSignatureMark` |

---

## When Do DocoChain Calls Happen?

### Token and project creation

1. **ENP joins meeting** → We ensure a **meeting-scoped token** (`ensureMeetingToken`).
2. **ENP adds document to meeting** → We create a **DocoChain project** (`createProject`) with that token and store **project-scoped token** (`setProjectToken`).
3. **Plotting / Edit Draft** → We use meeting or project token to generate **Edit Draft Link** (`generateEditDraftLink`).
4. **Project sent, need sign link** → We use **Generate Sign Link** (`generateSignLink`).

### Signing and download

- **Add signers** → When setting document signers or when ENP self-signs: `addSignerToProject`, then optionally `sendProject`, then `generateSignLink`.
- **Check if ready to download** → `checkSigningStatus` (uses Get Project Details).
- **Download signed PDF** → `downloadSignedDocument` (uses Download API, Get My Project Details, vault, etc.).
- **Download certificate** → `downloadCertificate`; **Passport** used for history/certificate_url in notarial book.

### Auth and org

- **User registration** → `provisionUser` (auto-join org + token) in auth router and NextAuth.
- **Adding signers / ENP to meeting** → `autoJoinOrganization` so signers exist in DocoChain org.

---

## Configuration

### Environment variables (see `env.js`)

| Variable | Purpose |
|----------|---------|
| `DOCONCHAIN_API_URL` | Base URL for DocoChain API (e.g. `https://api.doconchain.com`). |
| `DOCONCHAIN_APP_URL` | App URL for redirects/links. |
| `DOCONCHAIN_CLIENT_KEY` | API client key. |
| `DOCONCHAIN_CLIENT_SECRET` | API client secret. |
| `DOCONCHAIN_EMAIL` | Default identity used for token generation. |
| `DOCONCHAIN_ORG_INVITE_CODE` | Used when verifying token. |
| `DOCONCHAIN_ORGANIZATION_ID` | Used for auto-join and org operations. |

Token is generated with: `client_key`, `client_secret`, and `email` (or per-user email). All API calls use `user_type=ENTERPRISE_API` and `Authorization: Bearer <token>`.

---

## 1. Authentication

### API reference

- **Generate token:** `POST ${DOCONCHAIN_API_URL}/api/v2/generate/token`
- **Verify token:** `POST ${DOCONCHAIN_API_URL}/api/v2/auth/verify?user_type=ENTERPRISE_API`
- Body for generate: FormData with `client_key`, `client_secret`, `email`.

### Code location

**File:** `services/doconchain/lib/token-cache.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `generateToken()` | **43–86** | Calls DocoChain generate-token API; caches by email. |
| `getToken()` | **88–156** | Returns cached token or generates; optionally verifies before use. |
| `verifyAuthToken()` | **319–358** | Calls auth/verify with token and org_invite_code. |
| `invalidateToken()` | **163–167** | Clears cached token for an email. |
| `setProjectToken()` | **173–180** | Stores token used to create a project (for consistent link generation). |
| `getProjectToken()` | **186–189** | Retrieves stored project token. |
| `getOrRefreshProjectToken()` | **195–215** | Returns project token or refreshes if older than 2 minutes. |
| `setMeetingToken()` | **236–244** | Stores token for a meeting (ENP join). |
| `getMeetingToken()` | **249–252** | Gets meeting token and email. |
| `ensureMeetingToken()` | **278–297** | Ensures meeting has a valid token for the given ENP email. |
| `generateAndSetMeetingToken()` | **304–310** | Forces new token generation and stores as meeting token. |

**Supporting:**

- `services/doconchain/lib/config.ts` – `TOKEN_EXPIRATION_MS`, `TOKEN_REFRESH_BUFFER_MS`
- `services/doconchain/lib/http-client.ts` – `apiCall()`, `apiCallWithToken()` (token injection, 401 retry, network retries)

**Usage:**

- `ensureMeetingToken` – `features/meetings/api/meetings.router.ts` (e.g. getById, getToken, getMeetingDocuments, createDocoChainProject).
- `createProject` uses `tokenOverride` (meeting token) – `meetings.router.ts` (~1241–1255).
- `setProjectToken` after create – `meetings.router.ts` (~1255).
- `generateEditDraftLink` uses meeting or project token – `signature-requests.router.ts` (~892–916).
- `generateSignLink` – `signature-requests.router.ts` (~854, ~1160).

---

## 2. Create Project

### API reference

- **Endpoint:** `POST ${DOCONCHAIN_API_URL}/api/v2/projects?user_type=ENTERPRISE_API`
- **Body:** FormData with `file` (PDF), `user_list_editable`, `creator_as_viewer`, optional `document_stamp` (JSON).

### Code location

**File:** `services/doconchain/api/project.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `createProject()` | **33–94** | Builds FormData, calls POST /api/v2/projects; supports `tokenOverride`; returns `uuid`, `id`, `redirectUrl`. |

**Usage:**

- `features/meetings/api/meetings.router.ts` (~1238–1266): on “create DocoChain project” (ENP adds document), calls `ensureMeetingToken` → `createProject` with `tokenOverride` → `setProjectToken` → updates document with `docoChainProjectId` and `docoChainRedirectUrl`.

---

## 3. Get Project Details

### API reference

- **Endpoint:** `GET ${DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}?user_type=ENTERPRISE_API`
- **Response:** Project data including `status`, `signers`, `completed_at`, `signed_url`, `certificate_url`, etc.

### Code location

**File:** `services/doconchain/api/project.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `getProjectDetails()` | **96–184** | GET project by UUID; supports `userEmail` and `tokenOverride`. |

**Usage:**

- `signature-requests.router.ts` – signing status, signer list, project status (~506, 664, 753, 1218).
- `document.ts` – `checkSigningStatus`, `downloadSignedDocument`, `downloadCertificate` (fallbacks).
- `notarial-book.router.ts` – project/signer data and fallback (~283, 1656–1657).
- `meetings.router.ts` – project status (~1393).
- `envelope-lite.router.ts` – project details (~221, 519, 563).

---

## 4. Get My Project Details

### API reference

- **Endpoint:** `GET ${DOCONCHAIN_API_URL}/my/projects/${projectUuid}?user_type=ENTERPRISE_API`
- **Response:** Project data for the authenticated user, including `files` (signed/completed document URLs).

### Code location

**File:** `services/doconchain/api/project.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `getMyProjectDetails()` | **226–318** | GET /my/projects/{uuid} for current user. |

**Usage:**

- `services/doconchain/api/document.ts` – inside `downloadSignedDocument` (~90, 344) to get signed/sealed file (and fallback after retries).
- `notarial-book.router.ts` – try first for project details (~276), and fallback in document route (~1652).
- `app/api/notarial-book-2/documents/[actId]/route.ts` – try getMyProjectDetails then getProjectDetails (~79–84).

---

## 5. Add Signer

### API reference

- **Endpoint:** `POST ${DOCONCHAIN_API_URL}/projects/${projectUuid}/signers?user_type=ENTERPRISE_API`
- **Body:** `{ email, first_name, last_name, type: "GUEST", signer_role }`.

### Code location

**File:** `services/doconchain/api/signer.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `addSignerToProject()` | **16–69** | Adds signer; on 400 “already added”, fetches project and returns verified. |
| `deleteSigner()` | **77–97** | DELETE signer by project UUID and signer ID. |
| `updateProjectSigner()` | **111–147** | PUT signer (name, sequence, signer_role). |

**Usage:**

- `signature-requests.router.ts` – when setting document signers (~600) and in ENP self-sign flow (~1143); then `sendProject` and `generateSignLink`.
- `addSignerToProject` is **main**; `deleteSigner` and `updateProjectSigner` are available but less frequently referenced in the mapped flows.

---

## 6. Generate Sign Link

### API reference

- **Endpoint:** `POST ${DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}/link/generate?email=${email}&user_type=ENTERPRISE_API`
- **Response:** Link object (e.g. `data.link`, `link`, `url`, or `message`); we normalize and append `api_token`.

### Code location

**File:** `services/doconchain/api/link.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `generateSignLink()` | **56–129** | POST link/generate for signer email; appends api_token via creator email. |

**Usage:**

- `signature-requests.router.ts` – when project is **sent** and we need a signing link (not plotting) (~844–859), and in ENP self-sign flow (~1160).

---

## 7. Generate Edit Draft Link

### API reference

- **Endpoint:** `POST ${DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}/link?user_type=ENTERPRISE_API`
- **Response:** Edit-draft link (various shapes); we normalize to `link.doconchain.com`, strip unwanted params, set `api=true`, append `api_token`.

### Code location

**File:** `services/doconchain/api/link.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `generateEditDraftLink()` | **152–328** | Gets link (with optional `tokenOverride`, project token, or email token); for plotting builds link with page, email, signer_role, api=true; appends api_token. |
| `normalizeLink()` | **333–393** | Normalizes domain to link.doconchain.com, removes status=Deleted, token/email/signer_role/page, sets api=true. |
| `appendApiToken()` | **395–458** | Appends api_token (meeting override, project token, or email token). |

**Usage:**

- `signature-requests.router.ts` – **main** flow for plotting and draft signing (~868–916): uses meeting token when plotting, retries on 401 with refreshed meeting token.

---

## 8. Send Project

### API reference

- **Endpoint:** `POST ${DOCONCHAIN_API_URL}/my/projects/${projectUuid}/send?user_type=ENTERPRISE_API`

### Code location

**File:** `services/doconchain/api/project.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `sendProject()` | **321–341** | POST send; moves project to sent state. |

**Usage:**

- `signature-requests.router.ts` – after adding ENP as signer in self-sign flow (~1154); errors are caught and flow continues.

---

## 9. Check Signing Status

### API reference

- Uses **Get Project Details**; no separate endpoint. We derive `isFullySigned`, `signedCount`, `signers` from response.

### Code location

**File:** `services/doconchain/api/document.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `checkSigningStatus()` | **27–71** | Calls getProjectDetails; normalizes signers; computes isFullySigned from status and signed_at. |

**Usage:**

- `signature-requests.router.ts` – before returning signing link and for download (~1240, 1364, 1377, 1479, 1512, 1580).
- `meetings.router.ts` – project status (~96).
- `documents.router.ts` – before download (~224).
- `notarial-book.router.ts` – sync and document listing (~1430, 1957–1961).
- `envelope-lite.router.ts` – download and status (~469, 510, 563).
- `auto-create-notarial-act.ts` – before creating notarial act (~381).
- `app/api/notarial-book/documents/[actId]/route.ts`, `app/api/notarial-book-2/documents/[actId]/route.ts`, `app/api/doconchain/projects/[projectUuid]/signed/route.ts` – before serving signed document.

---

## 10. Download Signed Document

### API reference

- **Primary:** `GET ${DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}/download?user_type=ENTERPRISE_API` (Accept: application/pdf).
- **Fallbacks:** Get My Project Details `files` (completed/signed), vault item files, Get Project Details `signed_url` / `signed_document_url` / `url`.

### Code location

**File:** `services/doconchain/api/document.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `downloadSignedDocument()` | **74–468** | Tries getMyProjectDetails → download API → files array (with retries for seal); fallback getProjectDetails → download API → vault → fallback URLs. Returns `{ buffer, fileName, url }`. |

**Usage:**

- `signature-requests.router.ts` – downloadSignedDocument procedure (~1479, 1522, 1580).
- `documents.router.ts` – download flow (~237).
- `notarial-book.router.ts` – document download (~1590, 1656).
- `envelope-lite.router.ts` – download (~478).
- `app/api/notarial-book/documents/[actId]/route.ts`, `app/api/notarial-book-2/documents/[actId]/route.ts`, `app/api/doconchain/projects/[projectUuid]/signed/route.ts` – programmatic signed PDF response.

---

## 11. Download Certificate

### API reference

- Certificate URL from Get Project Details (`certificate_url` / `certificateUrl` / `cert_url`) or Passport view `certificate_url`.
- Direct tries: `/api/v2/projects/{uuid}/certificate`, `/projects/{uuid}/certificate`, `/certificate/download`, `/my/projects/{uuid}/certificate`, and app URL variants.

### Code location

**File:** `services/doconchain/api/document.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `downloadCertificate()` | **471–548** | Resolves certificate URL (project details + passport), then GET with token; retries for URL resolution. Returns `{ buffer, fileName, url }`. |

**Usage:**

- Notarial book and audit flows that need the certificate file (referenced via notarial-book and document flows).

---

## 12. Vault

### API reference

- **List:** `GET ${DOCONCHAIN_API_URL}/vault/items?user_type=...&per_page&page&user_items_only&api_integrated_projects_only`
- **Item:** `GET ${DOCONCHAIN_API_URL}/vault/items/${projectUuid}?user_type=ENTERPRISE_API`

### Code location

**File:** `services/doconchain/api/vault.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `getVaultItems()` | **5–46** | List vault items with pagination and filters. |
| `getVaultItem()` | **48–81** | Get one vault item by project UUID (files, file_name, name). |

**Usage:**

- `document.ts` – `downloadSignedDocument` uses `getVaultItem` as fallback when download API and files array fail (~385–431).
- `getVaultItem` – `app/api/notarial-book/documents/[actId]/route.ts` (import and use for document retrieval fallback).

---

## 13. Passport

### API reference

- **Endpoint:** `GET ${DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}/passport?user_type=ENTERPRISE_API&view=${view}`
- **Views:** `blockchain`, `history`, `user_data`, `verifiable_presentation`, `certificate_url`.

### Code location

**File:** `services/doconchain/api/passport.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `getPassportDocument()` | **12–42** | GET passport with given view; returns JSON or string. |

**Usage:**

- `document.ts` – `downloadCertificate` uses passport for certificate_url (~473–478).
- `notarial-book.router.ts` – passport data for notarial act (~464, 1114).
- `signature-requests.router.ts` – getPassportDocument procedure (~1620, 1670).
- `auto-create-notarial-act.ts` – passport for notarial act data (~470).

---

## 14. Organization

### API reference

- **Auto-join:** `POST ${DOCONCHAIN_API_URL}/api/v2/organization/members/auto-join?user_type=ENTERPRISE_API`
- **Body:** FormData `data[0][email]`, `data[0][first_name]`, `data[0][last_name]`, `data[0][role]`, `data[0][organization_id]`.

### Code location

**File:** `services/doconchain/api/organization.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `autoJoinOrganization()` | **16–57** | Adds member to org; ignores 409/400 “already exist” and 401/403. |
| `ensureJoinedToOrganization()` | **59–113** | Same but throws on failure (used by provisionUser). |
| `provisionUser()` | **123–154** | ensureJoinedToOrganization + generateToken for that email. |

**Usage:**

- `auth.router.ts` – `provisionUser` on registration (~59); `autoJoinOrganization` in lawyer/other flows (~149).
- `next-auth/config.ts` – `provisionUser` on sign-in (~216, 246).
- `signature-requests.router.ts` – `autoJoinOrganization` when adding signers (~176, 576, 1133).

---

## 15. Processing Completed

### API reference

- **Endpoint:** `GET ${DOCONCHAIN_API_URL}/api/v2/templates/processing-completed?user_type=ENTERPRISE_API&page&per_page&status&user_items_only&api_integrated_projects_only&get_projects_by_organization&email&sort&order`

### Code location

**File:** `services/doconchain/api/document.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `getProcessingCompletedProjects()` | **557–602** | GET processing-completed list with pagination and filters. |

**Usage:**

- `notarial-book.router.ts` – list completed projects (~253).
- `envelope-lite.router.ts` – list completed projects (~392).

---

## Add Signature Mark (implemented, not used)

### API reference

- **Endpoint:** `POST ${DOCONCHAIN_API_URL}/projects/${projectUuid}/signers/${signerId}/properties?user_type=ENTERPRISE_API`
- **Body:** `{ type, position_x, position_y, height, width, page_no }`.

### Code location

**File:** `services/doconchain/api/project.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `addSignatureMark()` | **196–226** | Adds a signature mark for a signer on the document. |

**Status:** Exported from `services/doconchain/index.ts` but **not called** anywhere in the codebase. Kept for future use (e.g. server-side placement of signature fields).

---

## Complete File Structure

```
services/doconchain/
├── lib/
│   ├── config.ts           # Token expiration constants
│   ├── http-client.ts      # apiCall, apiCallWithToken (token + retries)
│   ├── schemas.ts          # Zod schemas and types (Signer, Project, Vault, etc.)
│   ├── token-cache.ts      # Auth (Section 1): generateToken, getToken, project/meeting tokens
│   └── utils.ts            # splitName, normalizeUrl
├── api/
│   ├── document.ts         # checkSigningStatus, downloadSignedDocument, downloadCertificate, getProcessingCompletedProjects
│   ├── link.ts             # generateSignLink, generateEditDraftLink, getSigningUrl, normalizeLink, appendApiToken
│   ├── organization.ts     # autoJoinOrganization, ensureJoinedToOrganization, provisionUser
│   ├── passport.ts         # getPassportDocument
│   ├── project.ts          # createProject, getProjectDetails, getMyProjectDetails, addSignatureMark, sendProject
│   ├── signer.ts           # addSignerToProject, deleteSigner, updateProjectSigner
│   └── vault.ts            # getVaultItems, getVaultItem
└── index.ts                # Re-exports all public API and types
```

---

## Quick Reference Table

| Feature | Endpoint / behavior | Code file | Function | Lines |
|---------|---------------------|-----------|----------|-------|
| Authentication (generate) | POST /api/v2/generate/token | `lib/token-cache.ts` | `generateToken` | 43–86 |
| Authentication (verify) | POST /api/v2/auth/verify | `lib/token-cache.ts` | `verifyAuthToken` | 319–358 |
| Create project | POST /api/v2/projects | `api/project.ts` | `createProject` | 33–94 |
| Get project details | GET /api/v2/projects/:uuid | `api/project.ts` | `getProjectDetails` | 96–184 |
| Get my project details | GET /my/projects/:uuid | `api/project.ts` | `getMyProjectDetails` | 226–318 |
| Add signer | POST /projects/:uuid/signers | `api/signer.ts` | `addSignerToProject` | 16–69 |
| Generate sign link | POST /api/v2/projects/:uuid/link/generate | `api/link.ts` | `generateSignLink` | 56–129 |
| Generate edit draft link | POST /api/v2/projects/:uuid/link | `api/link.ts` | `generateEditDraftLink` | 152–328 |
| Send project | POST /my/projects/:uuid/send | `api/project.ts` | `sendProject` | 321–341 |
| Check signing status | Uses getProjectDetails | `api/document.ts` | `checkSigningStatus` | 27–71 |
| Download signed document | GET /api/v2/projects/:uuid/download + fallbacks | `api/document.ts` | `downloadSignedDocument` | 74–468 |
| Download certificate | Project + passport + GET cert URL | `api/document.ts` | `downloadCertificate` | 471–548 |
| Vault list | GET /vault/items | `api/vault.ts` | `getVaultItems` | 5–46 |
| Vault item | GET /vault/items/:uuid | `api/vault.ts` | `getVaultItem` | 48–81 |
| Passport | GET /api/v2/projects/:uuid/passport | `api/passport.ts` | `getPassportDocument` | 12–42 |
| Organization auto-join | POST /api/v2/organization/members/auto-join | `api/organization.ts` | `autoJoinOrganization` | 16–57 |
| Provision user | auto-join + generateToken | `api/organization.ts` | `provisionUser` | 123–154 |
| Processing completed | GET /api/v2/templates/processing-completed | `api/document.ts` | `getProcessingCompletedProjects` | 557–602 |
| Add signature mark | POST /projects/:uuid/signers/:id/properties | `api/project.ts` | `addSignatureMark` | 196–226 (not used) |

---

## Integration Points Summary

| Flow | Key DocoChain calls |
|------|---------------------|
| ENP joins meeting | `ensureMeetingToken` |
| Create document project | `ensureMeetingToken` → `createProject` (tokenOverride) → `setProjectToken` |
| Plotting / draft signing | `generateEditDraftLink` (meeting or project token) |
| Sent project signing | `generateSignLink` |
| Add signers | `autoJoinOrganization`, `addSignerToProject`; then optionally `sendProject`, `generateSignLink` |
| Download signed PDF | `checkSigningStatus` → `downloadSignedDocument` |
| Notarial act / audit | `getPassportDocument`, `downloadCertificate`, `checkSigningStatus`, `getProjectDetails` |
| User registration / sign-in | `provisionUser`, `autoJoinOrganization` |
| List completed projects | `getProcessingCompletedProjects` |
