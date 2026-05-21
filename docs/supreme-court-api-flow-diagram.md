# Supreme Court API Integration - Flow Diagram

## 🔐 Authentication Flow

```
┌─────────────────────────────────────┐
│  1. Get Credentials from .env       │
│     - USERNAME                      │
│     - PASSWORD                      │
│     - COGNITO_URL                   │
│     - CLIENT_ID                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. POST to Cognito                 │
│     Headers:                        │
│     - Content-Type:                 │
│       application/x-amz-json-1.1    │
│     - X-Amz-Target:                 │
│       InitiateAuth                  │
│     Body:                           │
│     - AuthFlow: USER_PASSWORD_AUTH  │
│     - AuthParameters:               │
│       USERNAME, PASSWORD            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. Receive AccessToken             │
│     - ExpiresIn: 3600 seconds       │
│     - Cache token                   │
│     - Refresh 5 min before expiry   │
└─────────────────────────────────────┘
```

---

## 📋 Complete Sync Flow

```
┌─────────────────────────────────────────────┐
│  Notarial Act Created                       │
│  (from meeting/signing session)            │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Check Configuration                        │
│  - API configured?                          │
│  - ENP has NPN/NFN/RN?                     │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Validate Commission Status                │
│  POST /public-use/cs                        │
│  { npn, rn }                                │
│  → { commissionStatus: "Active" }          │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Create Metadata (Consolidated)            │
│  POST /public-use/consolidated              │
│  {                                          │
│    notaryFacilityNumber,                    │
│    notaryPublicNumber,                      │
│    rollNumber,                              │
│    metaData: { ... },                       │
│    listOfPrincipals: [ ... ],              │
│    listOfWitness: [ ... ]                   │
│  }                                          │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Receive NRID & NRN                         │
│  {                                          │
│    notarialRegistryID: "NRID-...",         │
│    notarialRegistryNumber: "NRN-..."        │
│  }                                          │
└──────────────┬──────────────────────────────┘
               │
               ▼
        ┌──────┴──────┐
        │            │
        ▼            ▼
   Has File?    No File?
        │            │
        │            └──────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌──────────────────┐
│ File Upload   │      │ Skip File Upload │
│ Flow          │      │                  │
└───────┬───────┘      └────────┬─────────┘
        │                       │
        │                       │
        ▼                       │
┌───────────────────────────────┴───────────┐
│  Step 1: Get Presigned URL                │
│  POST /public-use/presigned-url            │
│  { notarialRegistryNumber, uploadedFiles }│
│  → { preSignedUrls: [{ url, fileName }] }│
└──────────────┬────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Step 2: Upload to S3                       │
│  PUT <presigned-url>                       │
│  Headers: Content-Type: application/pdf     │
│  Body: Binary file data                    │
│  (No Authorization header needed!)         │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Step 3: Register File Metadata             │
│  POST /public-use/file                      │
│  {                                          │
│    notarialRegistryNumber,                 │
│    notarialDocumentType,                   │
│    files: [fileName from step 1]           │
│  }                                          │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Update Database                            │
│  - syncedToSupremeCourt = true              │
│  - syncedAt = NOW()                         │
│  - (Optional) Store NRID, NRN              │
└─────────────────────────────────────────────┘
```

---

## 🔄 Alternative Flow (If Not Using Consolidated)

```
┌─────────────────────────────────────────────┐
│  Create Metadata Only                       │
│  POST /public-use/metadata                  │
│  → { notarialRegistryID,                    │
│       notarialRegistryNumber }              │
└──────────────┬──────────────────────────────┘
               │
        ┌──────┴──────┐
        │            │
        ▼            ▼
┌──────────────┐  ┌──────────────┐
│ Add          │  │ Add         │
│ Principals   │  │ Witnesses    │
│ POST          │  │ POST         │
│ /principal    │  │ /witness     │
└──────────────┘  └──────────────┘
```

**Note:** This is NOT recommended. Use consolidated endpoint instead!

---

## 🎯 API Endpoints Summary

```
┌─────────────────────────────────────────────────────────┐
│                    Supreme Court API                     │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Auth         │   │ Metadata     │   │ File Upload  │
│              │   │              │   │              │
│ Cognito      │   │ Consolidated │   │ Presigned    │
│ InitiateAuth │   │ /consolidated│   │ /presigned-  │
│              │   │              │   │   url        │
│              │   │              │   │              │
│              │   │              │   │ S3 Upload    │
│              │   │              │   │ PUT <url>    │
│              │   │              │   │              │
│              │   │              │   │ Register     │
│              │   │              │   │ /file        │
└──────────────┘   └──────────────┘   └──────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Commission   │   │ Principals   │   │ Witnesses    │
│ Status       │   │              │   │              │
│              │   │ POST         │   │ POST         │
│ POST         │   │ /principal   │   │ /witness     │
│ /cs          │   │              │   │              │
│              │   │ (Backup only)│   │ (Backup only)│
└──────────────┘   └──────────────┘   └──────────────┘
```

---

## 📝 Request/Response Examples

### Authentication Request

```http
POST https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_P86ZTewxH
Content-Type: application/x-amz-json-1.1
X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth

{
  "AuthFlow": "USER_PASSWORD_AUTH",
  "AuthParameters": {
    "PASSWORD": "***",
    "USERNAME": "***"
  },
  "ClientId": "22bvgqigoaq76s6aac5faugi90"
}
```

### API Request (All Endpoints)

```http
POST https://scenotarization-api.com/public-use/consolidated
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "notaryFacilityNumber": "NFN-101",
  "notaryPublicNumber": "NPN-101",
  ...
}
```

---

## ⚠️ Important Notes

1. **Token Management:**
   - Tokens expire in 3600 seconds (1 hour)
   - Refresh 5 minutes before expiry
   - Auto-refresh on 401 errors

2. **Commission Status:**
   - Check before creating metadata
   - System rejects if status is "Inactive"
   - Only "Active" commissions can sync

3. **File Upload:**
   - Must use fileName from presigned URL response
   - FileName includes NRN prefix
   - No Authorization header for S3 upload

4. **Consolidated vs Separate:**
   - ✅ Use consolidated endpoint (fewer API calls)
   - ⚠️ Separate endpoints available as backup

5. **Error Handling:**
   - 400: Bad Request (invalid data)
   - 401: Unauthorized (invalid/expired token)
   - 404: Not Found
   - 500: Internal Server Error

---

**For detailed implementation, see:** `docs/supreme-court-api-step-by-step-guide.md`
