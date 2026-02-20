# Supreme Court eNotarization Cloud API – Integration Plan

**Document Version:** 1.0  
**Last Updated:** February 5, 2025  
**Status:** Planning Phase

---

## 1. Executive Summary

The Supreme Court has provided API integration documentation for the eNotarization Cloud API. This document outlines how Quanby Sign will integrate with the API to fulfill the requirement for **automatic transmission of electronically notarized documents** and **automatic submission/syncing of the Electronic Notarial Book** to the Supreme Court Central Notarial Database.

**Current State:** The schema already includes `syncedToSupremeCourt` and `syncedAt` on both `notarialBooks` and `notarialActs`, indicating the system was designed with this integration in mind.

---

## 2. API Overview (From Documentation)

| Item            | Value                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| **Base URL**    | `https://f2x313020c.execute-api.ap-southeast-1.amazonaws.com/dev` or `https://scenotarization-api.com` |
| **Data Format** | JSON & Form-Data                                                                                       |
| **Auth URL**    | `https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_P86ZTewxH`                            |
| **ClientId**    | `22bvgqigoaq76s6aac5faugi90`                                                                           |
| **Credentials** | Username and password (to be emailed separately)                                                       |

---

## 3. Authentication Flow

### 3.1 Obtain Access Token

**Request:**

- **Method:** `POST`
- **URL:** `https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_P86ZTewxH`
- **Headers:**
  - `Content-Type`: `application/x-amz-json-1.1`
  - `X-Amz-Target`: `AWSCognitoIdentityProviderService.InitiateAuth`
- **Body (JSON):**
  ```json
  {
  	"AuthFlow": "USER_PASSWORD_AUTH",
  	"AuthParameters": {
  		"PASSWORD": "<password>",
  		"USERNAME": "<username>"
  	},
  	"ClientId": "22bvgqigoaq76s6aac5faugi90",
  	"ClientMetadata": {}
  }
  ```

**Response:**

- `AuthenticationResult.AccessToken` – JWT for subsequent API calls
- `AuthenticationResult.ExpiresIn` – 3600 seconds (1 hour)
- `AuthenticationResult.IdToken` – Identity token (if needed)

### 3.2 Use Token for API Requests

- Add `Authorization: Bearer <AccessToken>` to every API request to the eNotarization endpoints.

---

## 4. Proposed Architecture

### 4.1 New Service: `services/supreme-court/`

Follow the existing pattern used by our other external-service clients (token cache + authenticated HTTP client):

```
services/supreme-court/
├── lib/
│   ├── config.ts          # Token expiry, refresh buffer
│   ├── token-cache.ts     # Cognito token cache + refresh
│   └── http-client.ts     # Authenticated fetch wrapper
├── api/
│   ├── auth.ts            # Cognito InitiateAuth
│   └── notarial-act.ts    # Submit notarial act (once spec is known)
└── index.ts               # Re-exports (if needed for init)
```

### 4.2 Token Management Strategy

- **Cache:** In-memory cache (single service account, no per-user tokens).
- **Expiry:** Tokens expire in 3600 seconds; refresh 5 minutes before expiry.
- **Retry:** On 401, invalidate cache and re-authenticate, then retry.
- **No verification endpoint:** Cognito does not expose a token-verify API; we rely on expiry + 401 handling.

### 4.3 Environment Variables

Add to `env.js` and `.env.example`:

| Variable                  | Description                          | Example                                                                     |
| ------------------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| `SUPREME_COURT_API_URL`   | Base URL for eNotarization API       | `https://scenotarization-api.com`                                           |
| `SUPREME_COURT_AUTH_URL`  | Cognito Auth URL                     | `https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_P86ZTewxH` |
| `SUPREME_COURT_CLIENT_ID` | Cognito Client ID                    | `22bvgqigoaq76s6aac5faugi90`                                                |
| `SUPREME_COURT_USERNAME`  | API account username (from SC email) | _(sensitive)_                                                               |
| `SUPREME_COURT_PASSWORD`  | API account password (from SC email) | _(sensitive)_                                                               |

---

## 5. Integration Points in Quanby Sign

### 5.1 When to Sync to Supreme Court

| Trigger            | Location                                                                                | Action                                               |
| ------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Meeting ends**   | `features/meetings/api/meetings.router.ts` → `autoCreateNotarialAct`                    | After creating notarial act, optionally call SC sync |
| **Manual sync**    | `features/notarial-book/api/notarial-book.router.ts` → `syncDocumentToNotarialBook`     | After creating/updating act, sync to SC              |
| **Bulk sync**      | `features/notarial-book/api/notarial-book.router.ts` → `syncAllDocumentsToNotarialBook` | Sync all unsynced acts                               |
| **Background job** | _(Future)_ Cron or queue                                                                | Periodic sync of `syncedToSupremeCourt = false` acts |

### 5.2 Sync Flow (Proposed)

```
1. Notarial act created/updated in DB (syncedToSupremeCourt = false)
2. Call Supreme Court API to submit act
3. On success: UPDATE notarialActs SET syncedToSupremeCourt = true, syncedAt = NOW()
4. On failure: Log error, keep syncedToSupremeCourt = false, allow retry
```

### 5.3 Data Mapping (Preliminary)

Our `notarialActs` schema aligns with Supreme Court requirements. Likely mapping:

| Our Field                             | SC API Field (TBD)                                       |
| ------------------------------------- | -------------------------------------------------------- |
| `actType`                             | ACKNOWLEDGMENT, AFFIRMATION, JURAT, SIGNATURE_WITNESSING |
| `principalName`                       | Principal name                                           |
| `principalIdNumber`                   | Principal ID                                             |
| `principalIdType`                     | ID type                                                  |
| `enpName`, `enpRollNumber`            | ENP info                                                 |
| `executedAt`                          | Execution timestamp                                      |
| `workflow`                            | REN / IEN                                                |
| `locationStatement`                   | Location certification                                   |
| `documentName`, `documentDescription` | Document info                                            |
| `certificateNumber`                   | Our reference number                                     |
| `docoChainProjectUuid`                | Link to signing project (legacy)                         |

**Note:** Exact field names and payload structure depend on the full API spec (Pages 5–22 of the documentation).

---

## 6. Implementation Phases

### Phase 1: Auth & Service Skeleton (Ready Now)

- [ ] Create `services/supreme-court/` directory structure
- [ ] Implement Cognito auth (`auth.ts`, `token-cache.ts`)
- [ ] Implement `http-client.ts` with Bearer token + retry
- [ ] Add env vars to `env.js` and `.env.example`
- [ ] Unit/integration test: obtain token and make a simple GET (e.g. health/status if available)

### Phase 2: Sync Logic (After Full API Spec)

- [ ] Obtain full API documentation (endpoints, payloads, responses)
- [ ] Implement `api/notarial-act.ts` – submit notarial act
- [ ] Add `syncToSupremeCourt()` in `auto-create-notarial-act.ts` or as a separate lib
- [ ] Update `notarial-book.router.ts` to call sync after create/update
- [ ] Add manual "Sync to Supreme Court" action in Notarial Book UI
- [ ] Add retry mechanism for failed syncs

### Phase 3: Observability & Resilience

- [ ] Logging for sync success/failure
- [ ] Optional: Admin view of sync status
- [ ] Optional: Background job for retrying failed syncs
- [ ] Optional: Webhook handling if SC sends callbacks

---

## 7. Open Questions / Blockers

| #   | Question                                                                                    | Owner                  |
| --- | ------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | **Full API spec** – Endpoints for submitting notarial acts, payload format, response format | Await SC documentation |
| 2   | **Credentials** – Username and password to be emailed separately                            | Await SC email         |
| 3   | **Environment** – Use `dev` base URL or `scenotarization-api.com` for production?           | Confirm with SC        |
| 4   | **Certificate URL** – Does SC return a certificate URL we should store in `certificateUrl`? | From full spec         |
| 5   | **Idempotency** – How to avoid duplicate submissions if we retry?                           | From full spec         |
| 6   | **Rate limits** – Any throttling we need to respect?                                        | From full spec         |

---

## 8. Security Considerations

- Store `SUPREME_COURT_USERNAME` and `SUPREME_COURT_PASSWORD` only in server env; never expose to client.
- Use `env.js` validation so the app fails fast if vars are missing in production.
- Log redacted info only (e.g. `SC sync failed for actId=xxx`, not full payloads with PII).
- Consider encrypting credentials at rest if required by compliance.

---

## 9. References

- API System Integration Document, Version 1.4 (July 14, 2025), Supreme Court of the Philippines
- Postman screenshots: Auth request/response, Headers, Authorization usage
- Existing code: `services/hyperverge/` (http client patterns)
- Schema: `services/drizzle/schema/notarial-book.ts` (`syncedToSupremeCourt`, `syncedAt`)
- Feature: `features/notarial-book/` (router, auto-create, UI)
