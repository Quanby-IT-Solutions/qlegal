# Supreme Court API Integration - Implementation Guide

**Date:** February 10, 2026  
**Status:** Ready for Testing & Completion

---

## 📋 Overview

The Supreme Court eNotarization API integration is **mostly complete**. This guide will help you finish the remaining work and test the integration.

---

## ✅ What's Already Implemented

### 1. **Core Infrastructure** ✅
- ✅ Authentication service (`services/supreme-court/lib/token-cache.ts`)
  - AWS Cognito token management
  - Token caching with automatic refresh
  - 401 retry logic
  
- ✅ HTTP Client (`services/supreme-court/lib/http-client.ts`)
  - Authenticated requests with Bearer tokens
  - Automatic token refresh on 401
  - Network error retry logic (3 attempts with exponential backoff)

### 2. **API Endpoints** ✅
- ✅ **Metadata Creation** (`services/supreme-court/api/metadata.ts`)
  - Consolidated endpoint for creating notarial act metadata
  - Includes principals and witnesses in one call
  
- ✅ **File Upload** (`services/supreme-court/api/file-upload.ts`)
  - Get presigned URL for S3 upload
  - Upload file to S3
  - Register file metadata
  
- ✅ **Principals** (`services/supreme-court/api/principal.ts`)
  - Separate endpoint if needed (backup to consolidated)
  
- ✅ **Witnesses** (`services/supreme-court/api/witness.ts`)
  - Separate endpoint if needed (backup to consolidated)
  
- ✅ **Commission Status** (`services/supreme-court/api/commission-status.ts`)
  - Check ENP commission status

### 3. **Sync Logic** ✅
- ✅ Main sync function (`services/supreme-court/lib/sync-notarial-act.ts`)
  - Maps our schema to SC API format
  - Handles metadata creation
  - Handles file upload (if document provided)
  - Returns NRID and NRN

### 4. **Integration Points** ✅
- ✅ Auto-sync on notarial act creation (`features/notarial-book/lib/auto-create-notarial-act.ts`)
  - Automatically syncs when act is created after meeting ends
  - Checks for ENP credentials (NPN/NFN/RN) before syncing
  - Downloads document file if available
  - Updates `syncedToSupremeCourt` and `syncedAt` on success

### 5. **Testing Tools** ✅
- ✅ Test script: `scripts/test-supreme-court-sync.ts`
- ✅ Commission status test: `scripts/test-supreme-court-commission.ts`

---

## 🔧 What Needs to Be Done

### 1. **Environment Configuration** 🔴 CRITICAL

**Add credentials to `.env`:**

```bash
# Supreme Court eNotarization API
SUPREME_COURT_API_URL="https://scenotarization-api.com"
SUPREME_COURT_COGNITO_URL="https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_P86ZTewxH"
SUPREME_COURT_CLIENT_ID="22bvgqigoaq76s6aac5faugi90"
SUPREME_COURT_USERNAME="<YOUR_USERNAME>"  # ⚠️ Get from SC email
SUPREME_COURT_PASSWORD="<YOUR_PASSWORD>"  # ⚠️ Get from SC email
```

**Action Items:**
- [ ] Check email from Supreme Court for credentials
- [ ] Add `SUPREME_COURT_USERNAME` to `.env`
- [ ] Add `SUPREME_COURT_PASSWORD` to `.env`
- [ ] Verify all other env vars are set correctly

### 2. **Database Schema Enhancements** 🟡 OPTIONAL BUT RECOMMENDED

**Current Issue:** The sync returns `notarialRegistryID` (NRID) and `notarialRegistryNumber` (NRN), but these aren't stored in the database.

**Recommendation:** Add fields to store SC identifiers:

```typescript
// In services/drizzle/schema/notarial-book.ts
// Add to notarialActs table:
supremeCourtRegistryId: t.varchar({ length: 255 }), // NRID
supremeCourtRegistryNumber: t.varchar({ length: 255 }), // NRN
```

**Action Items:**
- [ ] Decide if you want to store NRID/NRN (recommended for audit trail)
- [ ] If yes, create migration to add these fields
- [ ] Update sync function to save these values

### 3. **TODOs in Code** 🟡 MEDIUM PRIORITY

**Location:** `services/supreme-court/lib/sync-notarial-act.ts:148-149`

```typescript
notarialPageNumber: 1, // TODO: Calculate actual page number from notarial book
notarialBookNumber: 1, // TODO: Get actual book number
```

**Action Items:**
- [ ] Implement logic to calculate actual page number (count of acts in book + 1)
- [ ] Implement logic to get actual book number (from notarialBooks table)
- [ ] Update sync function to use calculated values

**Example Implementation:**

```typescript
// Get book number from notarialBooks table
const book = await db.query.notarialBooks.findFirst({
  where: eq(notarialBooks.id, act.notarialBookId),
})

// Count acts in this book to get page number
const actCount = await db
  .select({ count: count() })
  .from(notarialActs)
  .where(eq(notarialActs.notarialBookId, act.notarialBookId))

const notarialPageNumber = actCount[0]?.count ?? 1
const notarialBookNumber = book?.bookNumber ?? 1 // If you add bookNumber field
```

### 4. **Manual Sync Endpoint** 🟡 OPTIONAL

**Current State:** Sync happens automatically on act creation, but there's no manual sync endpoint.

**Recommendation:** Add tRPC endpoint for manual sync:

```typescript
// In features/notarial-book/api/notarial-book.router.ts
syncToSupremeCourt: protectedProcedure
  .input(z.object({ actId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // Get act, ENP profile, document
    // Call syncNotarialActToSupremeCourt
    // Update syncedToSupremeCourt = true
  })
```

**Action Items:**
- [ ] Decide if manual sync is needed
- [ ] If yes, implement tRPC endpoint
- [ ] Add UI button to trigger manual sync

### 5. **Error Handling & Logging** 🟢 LOW PRIORITY

**Current State:** Errors are logged but not stored in database.

**Recommendation:** Consider adding error tracking:

```typescript
// Add to notarialActs schema:
syncError: t.text(), // Store last sync error message
syncAttempts: t.integer().default(0), // Count sync attempts
```

---

## 🧪 Testing Guide

### Step 1: Verify Configuration

```bash
# Check if credentials are set
pnpm exec tsx -e "import { isConfigured } from './services/supreme-court/lib/token-cache'; console.log('Configured:', isConfigured())"
```

### Step 2: Test Authentication

```bash
# Test commission status endpoint (simple auth test)
pnpm test:supreme-court
```

**Expected:** Should authenticate and return commission status or error message.

### Step 3: Test Full Sync

**Prerequisites:**
- A notarial act in your database
- ENP profile with NPN, NFN, and RN set
- Document file available (optional)

```bash
# Test sync with a specific act ID
pnpm test:supreme-court-sync <notarial-act-id>
```

**What to Check:**
- ✅ Authentication succeeds
- ✅ Metadata is created successfully
- ✅ NRID and NRN are returned
- ✅ File upload works (if document provided)
- ✅ Database is updated (`syncedToSupremeCourt = true`)

### Step 4: Test End-to-End Flow

1. **Create a test notarial act:**
   - Complete a meeting/signing session
   - Ensure ENP profile has NPN/NFN/RN
   - Let `autoCreateNotarialAct` run

2. **Verify sync happened:**
   ```sql
   SELECT id, syncedToSupremeCourt, syncedAt 
   FROM notarial_act 
   WHERE syncedToSupremeCourt = true;
   ```

3. **Check logs:**
   - Look for "✅ Synced to Supreme Court" messages
   - Check for any error messages

---

## 🐛 Troubleshooting

### Issue: "Supreme Court API is not configured"

**Solution:**
- Check `.env` file has all required variables
- Restart dev server after adding env vars
- Verify `env.js` includes the variables

### Issue: "401 Unauthorized"

**Possible Causes:**
- Wrong username/password
- Token expired (should auto-refresh)
- Credentials revoked by SC

**Solution:**
- Verify credentials from SC email
- Check if credentials are still valid
- Try regenerating token manually

### Issue: "ENP profile missing NPN/NFN/RN"

**Solution:**
- Update ENP profile with correct values
- Values should match SC records exactly
- Check format (e.g., "NPN-123" vs "123")

### Issue: "File upload fails"

**Possible Causes:**
- Document not found in Supabase storage
- File too large
- Invalid file format

**Solution:**
- Verify document exists in Supabase
- Check file size limits
- Ensure PDF format

### Issue: "Network timeout"

**Solution:**
- Check internet connection
- Verify API URL is correct
- Retry logic should handle this automatically (3 attempts)

---

## 📝 API Flow Reference

### Complete Sync Flow:

```
1. Notarial Act Created
   ↓
2. Check if SC API configured & ENP has credentials
   ↓
3. Download document file (if available)
   ↓
4. Create Metadata (POST /public-use/consolidated)
   - Includes principals, witnesses, metadata
   - Returns: NRID, NRN
   ↓
5. If document file exists:
   a. Get presigned URL (POST /public-use/presigned-url)
   b. Upload to S3 (PUT to presigned URL)
   c. Register file metadata (POST /public-use/file)
   ↓
6. Update database:
   - syncedToSupremeCourt = true
   - syncedAt = NOW()
   - (Optional) Store NRID, NRN
```

---

## 🎯 Tomorrow's Action Plan

### Morning (Setup & Verification)
1. ✅ Get credentials from SC email
2. ✅ Add credentials to `.env`
3. ✅ Restart dev server
4. ✅ Test authentication: `pnpm test:supreme-court`
5. ✅ Verify ENP profiles have NPN/NFN/RN

### Afternoon (Testing)
1. ✅ Test sync with existing act: `pnpm test:supreme-court-sync <act-id>`
2. ✅ Test end-to-end flow (create new act)
3. ✅ Verify data in SC system (if SC provides dashboard)
4. ✅ Check error handling (test with invalid data)

### Evening (Completion)
1. ✅ Fix any TODOs (page number, book number)
2. ✅ Add manual sync endpoint (if needed)
3. ✅ Add NRID/NRN storage (if needed)
4. ✅ Document any issues or edge cases

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `services/supreme-court/lib/token-cache.ts` | Authentication & token management |
| `services/supreme-court/lib/http-client.ts` | HTTP client with retry logic |
| `services/supreme-court/lib/sync-notarial-act.ts` | Main sync orchestration |
| `services/supreme-court/api/metadata.ts` | Metadata creation endpoint |
| `services/supreme-court/api/file-upload.ts` | File upload endpoints |
| `features/notarial-book/lib/auto-create-notarial-act.ts` | Integration point |
| `scripts/test-supreme-court-sync.ts` | Test script |
| `docs/supreme-court-enotarization-api-plan.md` | Original plan |

---

## 🔐 Security Reminders

- ✅ Never commit `.env` file
- ✅ Credentials are server-side only (never exposed to client)
- ✅ Logs should not include full payloads with PII
- ✅ Use environment variables, not hardcoded values

---

## 📞 Support Resources

- **API Documentation:** Supreme Court API System Integration Document v1.4
- **Test Scripts:** `scripts/test-supreme-court-*.ts`
- **Original Plan:** `docs/supreme-court-enotarization-api-plan.md`

---

## ✅ Checklist for Tomorrow

- [ ] Get SC credentials from email
- [ ] Add credentials to `.env`
- [ ] Test authentication
- [ ] Test sync with existing act
- [ ] Test end-to-end flow
- [ ] Fix TODOs (page/book number)
- [ ] Verify data in SC system
- [ ] Document any issues
- [ ] (Optional) Add NRID/NRN storage
- [ ] (Optional) Add manual sync endpoint

---

**Good luck! 🚀 The hard work is done - you're just testing and polishing now!**
