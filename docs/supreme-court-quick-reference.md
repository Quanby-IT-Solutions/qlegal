# Supreme Court API Integration - Quick Reference

## 🚀 Quick Start

### 1. Add Credentials to `.env`

```bash
SUPREME_COURT_USERNAME="<from SC email>"
SUPREME_COURT_PASSWORD="<from SC email>"
```

### 2. Test Authentication

```bash
pnpm test:supreme-court
```

### 3. Test Full Sync

```bash
pnpm test:supreme-court-sync <notarial-act-id>
```

---

## 📍 Key Endpoints

| Endpoint                         | Purpose                                  | File                       |
| -------------------------------- | ---------------------------------------- | -------------------------- |
| `POST /public-use/consolidated`  | Create metadata + principals + witnesses | `api/metadata.ts`          |
| `POST /public-use/presigned-url` | Get S3 upload URL                        | `api/file-upload.ts`       |
| `POST /public-use/file`          | Register file metadata                   | `api/file-upload.ts`       |
| `POST /public-use/cs`            | Check commission status                  | `api/commission-status.ts` |

---

## 🔄 Sync Flow

```
1. Act Created → 2. Check Config → 3. Download Doc → 4. Create Metadata → 5. Upload File → 6. Update DB
```

---

## 🐛 Common Issues

| Issue                | Solution                          |
| -------------------- | --------------------------------- |
| "Not configured"     | Check `.env` has all vars         |
| "401 Unauthorized"   | Verify credentials from SC email  |
| "Missing NPN/NFN/RN" | Update ENP profile settings       |
| "File upload fails"  | Check document exists in Supabase |

---

## 📝 TODOs

- [ ] Calculate `notarialPageNumber` (count acts in book)
- [ ] Get `notarialBookNumber` (from notarialBooks table)
- [ ] (Optional) Store NRID/NRN in database
- [ ] (Optional) Add manual sync endpoint

---

## 📚 Full Guide

See `docs/supreme-court-integration-guide.md` for complete details.
