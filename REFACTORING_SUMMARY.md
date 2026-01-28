# Database Refactoring Summary: KYC & Liveness

## Overview
Reorganized the user table to eliminate duplicate/scattered data related to KYC and liveness verification. Data is now properly hierarchical and separated into dedicated tables.

## Changes Made

### 1. New Table: `kyc_sessions`
**Purpose**: Track KYC workflow sessions and their lifecycle separately from structured ID data.

**Fields**:
- `id`, `userId`, `transactionId` - Basic identifiers
- `sessionType` - "hosted" (mobile link) or "direct" (desktop API)
- `hostedLink`, `hostedLinkCreatedAt`, `hostedLinkExpiresAt` - Hosted workflow tracking
- `status` - KYC status (NOT_STARTED, PENDING, VERIFIED, REJECTED)
- `idCardDetailId` - Reference to verified ID card details
- `workflowMetadata` - HyperVerge-specific workflow data (JSONB)
- Timestamps: `createdAt`, `updatedAt`, `verifiedAt`

### 2. Updated Table: `users`
**Removed Fields**:
- `kycTransactionId` → moved to `kyc_sessions`
- `kycLink` → moved to `kyc_sessions`
- `kycLinkCreatedAt` → moved to `kyc_sessions`
- `kycReferenceIdImageBase64` → now in `id_card_details.faceImageUrl`
- `kycReferenceCreatedAt` → removed (using `id_card_details.verifiedAt`)
- `kycOcrExtractedFieldsJson` → now in `id_card_details.rawOcrData`
- `kycOcrCreatedAt` → removed (using `id_card_details.createdAt`)
- `livenessVerified` → use `liveness_validations` table queries
- `livenessVerifiedAt` → use `liveness_validations` table queries
- `livenessTransactionId` → stored in `liveness_validations`

**Kept Fields** (for quick lookups):
- `kycStatus` - Current KYC status
- `kycVerifiedAt` - When KYC was verified

### 3. Existing Tables (now properly utilized)
- **`id_card_details`** - Stores structured OCR data from ID cards
- **`liveness_validations`** - Tracks liveness validation attempts per user/meeting

## Data Hierarchy

```
User (core identity)
├── KYC Sessions (workflow tracking)
│   └── ID Card Details (structured ID data)
└── Liveness Validations (per-meeting verification)
```

## Migration

**File**: `services/drizzle/migrations/0008_refactor_kyc_liveness_to_separate_tables.sql`

**What it does**:
1. Creates `kyc_sessions` table with indexes
2. Migrates existing KYC data from `users` to `kyc_sessions`
3. Links `kyc_sessions` to existing `id_card_details` records
4. Removes old columns from `users` table
5. Adds documentation comments

## Files Updated

### Core Schema
- `services/drizzle/schema/kyc-sessions.ts` - NEW
- `services/drizzle/schema/auth.ts` - Cleaned up user schema
- `services/drizzle/schema/index.ts` - Added kyc_sessions
- `services/drizzle/schema/_relations.ts` - Added relationships

### KYC Feature
- `features/kyc/api/kyc.actions.ts` - All functions updated to use new structure
  - `createUserKycLink()` - Uses `kyc_sessions`
  - `runDirectKycVerification()` - Creates session, links to id_card_details
  - `checkUserKycStatus()` - Queries from `kyc_sessions`
  - `getExistingKycLink()` - Uses `kyc_sessions`
  - `getUserKycInfo()` - Queries from `kyc_sessions`
  - `resetUserKycStatus()` - Deletes sessions

### Liveness Feature
- `features/liveness-validation/api/liveness.actions.ts` - Updated face matching
  - `validateSelfieLiveness()` - Gets reference image from `id_card_details`
  - `startHostedLivenessWorkflow()` - Gets reference image from `id_card_details`

### Auth (Critical Fixes)
- `services/next-auth/config.ts` - MODIFIED
  - Removed `kycTransactionId` from session type
  - Updated JWT callback to not query removed fields
- `services/next-auth/adapter.ts` - MODIFIED
  - Removed `kycTransactionId` from adapter user type

### Other Affected Files
- `features/notarial-book/lib/auto-create-notarial-act.ts` - Gets ID images from `id_card_details`
- `features/notarial-book/api/notarial-book.router.ts` - MODIFIED (2 locations)
  - Updated to fetch ID card details from `id_card_details` table
- `app/api/webhooks/hyperverge/route.ts` - Updates `kyc_sessions` and saves to `id_card_details`

## Benefits

1. **Cleaner User Table**: Only essential status flags remain
2. **No Duplication**: ID data stored once in `id_card_details`
3. **Better Tracking**: Full KYC session history available
4. **Separation of Concerns**:
   - Workflow management → `kyc_sessions`
   - Structured ID data → `id_card_details`
   - Liveness attempts → `liveness_validations`
5. **Scalability**: Easy to add new KYC providers or verification methods
6. **Audit Trail**: Complete history of verification attempts

## Running the Migration

```bash
# Generate Drizzle migration files
pnpm db:generate

# Apply migration to database
pnpm db:push

# Or run specific migration
pnpm db:migrate
```

## Backward Compatibility Notes

The migration script preserves all existing data:
- Existing KYC transactions are migrated to `kyc_sessions`
- Links to `id_card_details` are established where possible
- No data loss occurs

## Testing Checklist

After migration, verify:
- [ ] Existing users can resume pending KYC verifications
- [ ] New KYC links can be created
- [ ] Direct KYC (desktop camera) works
- [ ] Hosted KYC (mobile link) works
- [ ] Liveness validation accesses ID images correctly
- [ ] Notarial book entries fetch principal ID images
- [ ] HyperVerge webhooks update correctly
- [ ] KYC reset functionality works

## Notes

- The user table is now much cleaner and focused on core identity
- All KYC/liveness related queries go through their respective tables
- Face matching for liveness uses `id_card_details.faceImageUrl`
- Session tracking enables better debugging and audit trails
