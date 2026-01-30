# Migration Checklist for KYC/Liveness Refactoring

## Pre-Migration Steps

- [ ] **Backup your database** before running migrations
- [ ] Review all changes in `REFACTORING_SUMMARY.md`
- [ ] Ensure you have the latest code from version control

## Migration Steps

### 1. Generate Migration Files

```bash
pnpm db:generate
```

Expected output: New migration files generated in `services/drizzle/migrations/`

### 2. Review Generated Migration

Check the generated migration file matches `0008_refactor_kyc_liveness_to_separate_tables.sql`

### 3. Apply Migration

```bash
pnpm db:push
# OR
pnpm db:migrate
```

Expected: Tables created, data migrated, old columns dropped

## Post-Migration Testing

### Authentication & Session

- [ ] Login with existing account
- [ ] Logout and login again
- [ ] Check that session includes `kycStatus` but NOT `kycTransactionId`
- [ ] OAuth login (Google) still works

### KYC Features

- [ ] Existing pending KYC verifications can be resumed
- [ ] Create new hosted KYC link (mobile)
- [ ] Complete hosted KYC verification
- [ ] Create direct KYC (desktop camera)
- [ ] Complete direct KYC verification
- [ ] Check KYC status polling
- [ ] Verify HyperVerge webhook updates work
- [ ] Reset KYC status works

### Liveness Validation

- [ ] Direct liveness validation (with selfie capture)
- [ ] Hosted liveness workflow
- [ ] Face matching uses ID card details correctly
- [ ] Liveness validation stores to `liveness_validations` table

### Notarial Book

- [ ] Create notarial act entry
- [ ] Principal ID image displays correctly
- [ ] Principal ID type shows correctly
- [ ] Passport document details are complete

### Data Integrity

- [ ] All existing users have correct `kycStatus`
- [ ] Verified users have entries in `kyc_sessions`
- [ ] ID card details are linked to sessions
- [ ] No data loss from old columns

## Database Verification Queries

### Check kyc_sessions table exists and has data

```sql
SELECT COUNT(*) FROM kyc_session;
SELECT * FROM kyc_session LIMIT 5;
```

### Check old columns are removed from users table

```sql
-- This should fail (column doesn't exist)
SELECT "kycTransactionId" FROM "user" LIMIT 1;
```

### Check data migration succeeded

```sql
-- Count users with KYC sessions
SELECT
  (SELECT COUNT(*) FROM "user" WHERE "kycStatus" IN ('PENDING', 'VERIFIED', 'REJECTED')) as users_with_kyc,
  (SELECT COUNT(DISTINCT "userId") FROM kyc_session) as users_with_sessions;
```

### Check id_card_details are linked

```sql
SELECT
  ks.id,
  ks."userId",
  ks.status,
  ks."idCardDetailId",
  icd."documentType"
FROM kyc_session ks
LEFT JOIN id_card_detail icd ON ks."idCardDetailId" = icd.id
WHERE ks.status = 'VERIFIED'
LIMIT 5;
```

## Rollback Plan

If issues occur, you can rollback by:

1. **Stop the application**
2. **Restore database from backup**
3. **Revert code changes**:
   ```bash
   git revert <commit-hash>
   ```

## Common Issues & Solutions

### Issue: TypeScript errors about missing columns

**Solution**: Run `pnpm db:generate` to regenerate types

### Issue: NextAuth session missing kycStatus

**Solution**: Clear browser cookies and login again

### Issue: HyperVerge webhook failing

**Solution**: Check that webhook handler queries `kyc_sessions` table correctly

### Issue: Notarial book missing principal ID images

**Solution**: Verify `id_card_details` table has `faceImageUrl` populated

## Files Changed (for reference)

### Schema

- `services/drizzle/schema/kyc-sessions.ts` - NEW
- `services/drizzle/schema/auth.ts` - MODIFIED
- `services/drizzle/schema/_relations.ts` - MODIFIED
- `services/drizzle/schema/index.ts` - MODIFIED

### KYC Feature

- `features/kyc/api/kyc.actions.ts` - MODIFIED (all functions)

### Liveness Feature

- `features/liveness-validation/api/liveness.actions.ts` - MODIFIED

### Auth

- `services/next-auth/config.ts` - MODIFIED
- `services/next-auth/adapter.ts` - MODIFIED

### Other

- `features/notarial-book/lib/auto-create-notarial-act.ts` - MODIFIED
- `features/notarial-book/api/notarial-book.router.ts` - MODIFIED
- `app/api/webhooks/hyperverge/route.ts` - MODIFIED

## Support

If you encounter any issues:

1. Check the console logs for errors
2. Verify database schema matches expected structure
3. Check that all files are updated correctly
4. Review `REFACTORING_SUMMARY.md` for detailed changes

---

**Remember**: Always test in a development/staging environment first!
