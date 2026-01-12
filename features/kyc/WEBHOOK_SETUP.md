# HyperVerge KYC Integration - Webhook Setup Guide

## 🎯 Overview

This implementation follows **HyperVerge Best Practices** by using webhooks instead of polling.

## ✅ What We Implemented

### 1. Webhook Endpoint

**Location:** `/app/api/webhooks/hyperverge/route.ts`

- Receives real-time notifications when KYC completes
- Updates database automatically
- No polling required

### 2. Single Status Check

**Location:** `/features/kyc/components/kyc-verification-card.tsx`

- After HyperVerge redirect → Check status ONCE
- If verified → Auto-redirect to dashboard
- If pending → User can check manually (fallback only)

## 🔧 Setup Instructions

### Step 1: Configure Webhook in HyperVerge Dashboard

1. Log into HyperVerge Dashboard: https://dashboard.hyperverge.co
2. Navigate to **Settings** → **Webhooks**
3. Click **Add Webhook**
4. Configure:
   ```
   Webhook URL: https://your-domain.com/api/webhooks/hyperverge
   Events: ✓ Results (KYC completion)
   Method: POST
   ```
5. Save and copy the webhook secret (if provided)

### Step 2: Add Environment Variable (Optional)

If HyperVerge provides a webhook secret:

```env
# .env.local
HYPERVERGE_WEBHOOK_SECRET=your-webhook-secret-here
```

### Step 3: Test Webhook

**Local Development (using ngrok):**

```bash
# Terminal 1: Start your app
npm run dev

# Terminal 2: Expose with ngrok
ngrok http 3000

# Use ngrok URL in HyperVerge dashboard:
# https://your-subdomain.ngrok.io/api/webhooks/hyperverge
```

**Test Webhook Endpoint:**

```bash
curl http://localhost:3000/api/webhooks/hyperverge
# Should return: {"status":"ok","message":"HyperVerge webhook endpoint is ready"}
```

### Step 4: Verify in Production

After deployment, test webhook:

```bash
curl https://your-domain.com/api/webhooks/hyperverge
```

## 📊 How It Works

### User Flow

```
1. User clicks "Start Verification"
   ↓
2. Redirected to HyperVerge KYC page
   ↓
3. User completes KYC documents
   ↓
4. HyperVerge sends webhook → Updates DB → Status: VERIFIED
   ↓
5. User redirected back to /auth/kyc
   ↓
6. Single status check → Sees VERIFIED
   ↓
7. Auto-redirect to /dashboard
```

### Fallback (If Webhook Fails)

```
1. User returns to /auth/kyc
   ↓
2. Status shows PENDING
   ↓
3. User clicks "Check Status Manually"
   ↓
4. Fetches status from HyperVerge API
   ↓
5. Updates DB and redirects if verified
```

## 🔍 Monitoring

### Check Webhook Logs

Monitor your application logs for:

- `📨 Webhook received from HyperVerge`
- `✅ Updated user [email] KYC status to VERIFIED`
- `❌ Error processing HyperVerge webhook`

### Verify Database Updates

Check that `users` table is being updated:

```sql
SELECT
  email,
  kycStatus,
  kycVerifiedAt,
  kycTransactionId
FROM users
WHERE kycStatus = 'VERIFIED';
```

## 🚨 Troubleshooting

### Webhook Not Received

1. ✓ Verify webhook URL is publicly accessible
2. ✓ Check HyperVerge dashboard webhook status
3. ✓ Ensure no firewall blocking HyperVerge IPs
4. ✓ Check application logs for incoming POST requests

### Status Still Shows PENDING

1. ✓ Check webhook was received (logs)
2. ✓ Verify transactionId matches in database
3. ✓ Use "Check Status Manually" button as fallback
4. ✓ Check HyperVerge API directly via /v1/output

### User Not Redirected

1. ✓ Verify status is actually "VERIFIED" in database
2. ✓ Check browser console for JavaScript errors
3. ✓ Ensure redirect URL is correct (/dashboard)

## 📝 API Reference

### Webhook Payload

```json
{
	"status": "auto_approved",
	"transactionId": "KYC_...",
	"timestamp": "2024-01-10T12:00:00Z",
	"result": {
		"status": "auto_approved",
		"transactionId": "KYC_...",
		"workflowDetails": {}
	}
}
```

### Status Mapping

- `auto_approved` → `VERIFIED`
- `auto_declined` → `REJECTED`
- `needs_review` → `PENDING`

## 🎉 Benefits

### ✅ Follows HyperVerge Best Practices

- No polling/repeated API calls
- Real-time updates via webhook
- Single status check as fallback

### ✅ Better User Experience

- Instant status updates
- Auto-redirect when verified
- No waiting or manual refreshing

### ✅ Reduced API Costs

- Webhooks are free
- Minimal API calls to /v1/output
- No unnecessary polling

## 🔗 Resources

- [HyperVerge Webhook Documentation](https://documentation.hyperverge.co/results-webhook)
- [HyperVerge Output API](https://documentation.hyperverge.co/output-api)
- [HyperVerge Dashboard](https://dashboard.hyperverge.co)
