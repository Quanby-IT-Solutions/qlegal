<!-- # Liveness Validation Feature

A standalone liveness verification system using HyperVerge's AI-powered face detection technology with two verification modes:

1. **Direct In-App Capture** - Capture selfie in your app and validate via API
2. **Hosted Workflow** - Redirect users to HyperVerge's hosted verification page

## Overview

This feature provides real-time selfie capture and liveness validation to verify that users are real people, not photos or videos. It's completely separate from the KYC feature and can be used independently for any verification use case.

## Features

- **Two Verification Modes**:
  - **In-App Capture**: Direct camera access with real-time preview (feature flag)
  - **Hosted Workflow**: HyperVerge-hosted page with QR code support (always available)
- **Liveness Detection**: AI-powered detection to prevent spoofing
- **Quality Checks**: Automatic validation for:
  - Eyes open/closed
  - Face occlusion
  - Multiple faces
- **Unified Decision Logic**: Uses `liveFace.value` and `summary.action` from HyperVerge API
- **Real-time Results**: Instant verification feedback with detailed quality reports
- **Webhook Support**: Receive results via webhook instead of polling

## Setup

### 1. Environment Configuration

Add the following to your `.env` file:

```bash
# HyperVerge API Configuration (required)
HYPERVERGE_APP_ID=your_app_id
HYPERVERGE_APP_KEY=your_app_key
HYPERVERGE_API_URL=https://ind.idv.hyperverge.co  # Optional, uses default if not set

# Enable Direct Liveness Mode (optional - hosted workflow always works)
HYPERVERGE_DIRECT_LIVENESS_ENABLED=true
```

### 2. Get HyperVerge Credentials

1. Sign up at [HyperVerge](https://hyperverge.co/)
2. Create an application in the dashboard
3. Copy your App ID and App Key
4. Create `workflow_liveness` workflow in dashboard

### 3. Configure Webhook (Recommended)

To receive verification results via webhook instead of polling:

1. Go to HyperVerge dashboard
2. Navigate to Workflow Settings
3. Set webhook URL: `https://yourdomain.com/api/webhooks/hyperverge/liveness`
4. Save configuration

## Usage

### Access the Page

Navigate to: **`/liveness`** (e.g., `http://localhost:3000/liveness`)

- Requires user authentication (redirects to `/auth/login` if not authenticated)
- Shows both verification methods if direct mode is enabled
- Hosted workflow is always available

### User Flow - Hosted Workflow (Recommended)

1. **Start Verification** - User clicks "Start Hosted Verification" button
2. **Redirect to HyperVerge** - Browser redirects to HyperVerge hosted page
3. **QR Code Option** - User can scan QR code to verify on mobile device
4. **Capture Selfie** - User positions face and captures photo on HyperVerge page
5. **Live Validation** - Photo is validated in real-time by HyperVerge
6. **Redirect Back** - User is automatically redirected to `/liveness/callback`
7. **Results Display** - Verification results are fetched and displayed

**Webhook Flow (Alternative)**:
- After user completes verification, HyperVerge sends webhook to your server
- Server fetches results using `/v1/output` API (called ONCE)
- Results stored in database for later retrieval

### User Flow - Direct Capture Mode

1. **Start Verification** - User clicks "Start In-App Capture" button
2. **Camera Access** - Browser requests camera permission
3. **Capture Selfie** - User positions face and captures photo
4. **Live Validation** - Photo is sent to HyperVerge `/checkLiveness` API
5. **Results** - User sees immediate feedback with quality details

## File Structure

```
features/liveness-validation/
├── api/
│   └── liveness.actions.ts              # Server actions for both modes
├── components/
│   ├── selfie-capture.tsx               # Direct capture component
│   └── liveness-validation-card.tsx     # Main UI with both options
└── README.md                             # This file

services/hyperverge/
└── liveness.ts                           # HyperVerge API integration
                                          # - startHostedWorkflow()
                                          # - checkLiveness()
                                          # - getWorkflowOutput()

app/(site)/liveness/
├── page.tsx                              # Liveness validation page
└── callback/
    └── page.tsx                          # Hosted workflow callback page

app/api/webhooks/hyperverge/liveness/
└── route.ts                              # Webhook endpoint for results
```

## API Integration

### Hosted Workflow APIs

#### 1. Start Hosted Workflow

**POST** `https://ind.idv.hyperverge.co/v1/link-kyc/start`

**Headers:**
```
Content-Type: application/json
appId: YOUR_APP_ID
appKey: YOUR_APP_KEY
```

**Body:**
```json
{
  "workflowId": "workflow_liveness",
  "transactionId": "LIVENESS_xxx",
  "redirectUrl": "https://your-app.com/liveness/callback"
}
```

**Response:**
```json
{
  "status": "success",
  "result": {
    "startKycUrl": "https://hv.link/xxxxx"
  }
}
```

#### 2. Get Workflow Results

**POST** `https://ind.idv.hyperverge.co/v1/output`

**Headers:**
```
Content-Type: application/json
appId: YOUR_APP_ID
appKey: YOUR_APP_KEY
```

**Body:**
```json
{
  "transactionId": "LIVENESS_xxx"
}
```

⚠️ **IMPORTANT**: Call this endpoint ONLY ONCE after:
- User is redirected back to your callback URL, OR
- Webhook notification is received

**DO NOT** poll this endpoint repeatedly!

### Direct Capture API

#### Check Liveness

**POST** `https://ind.idv.hyperverge.co/v1/checkLiveness`

**Headers:**

```
appId: YOUR_APP_ID
appKey: YOUR_APP_KEY
```

**Body (FormData):**

- `image`: Image file (JPEG blob)
- `transactionId`: Unique transaction identifier

**Response:**

```json
{
  "status": "success",
  "statusCode": 200,
  "metadata": {
    "requestId": "...",
    "transactionId": "..."
  },
  "result": {
    "details": [{
      "liveFace": {
        "value": "yes" | "no"
      },
      "qualityChecks": {
        "eyesClosed": { "value": "yes" | "no", "confidence": "high" | "medium" | "low" },
        "occlusion": { "value": "yes" | "no", "confidence": "high" | "medium" | "low" },
        "multipleFaces": { "value": "yes" | "no", "confidence": "high" | "medium" | "low" }
      }
    }],
    "summary": {
      "action": "pass" | "fail",
      "details": []
    }
  }
}
```

## Decision Logic

The unified decision logic evaluates two key factors:

1. **`liveFace.value`**: Whether a live face was detected
   - `"yes"` = Live person detected
   - `"no"` = Photo, video, or no face detected

2. **`summary.action`**: Overall quality assessment
   - `"pass"` = All quality checks passed
   - `"fail"` = One or more quality issues detected

**Approval Criteria:**

```typescript
isApproved = liveFace.value === "yes" && summary.action === "pass"
```

## Components

### `<SelfieCapture />`

Main camera capture component with controls.

**Props:**

- `onSuccess?: (result) => void` - Called when verification succeeds
- `onError?: (error: string) => void` - Called when verification fails
- `onCancel?: () => void` - Called when user cancels

**Features:**

- Camera flip (front/back)
- Face guide overlay
- Capture/retake controls
- Real-time validation results

### `<LivenessValidationCard />`

Complete verification card UI with dual-mode support.

**Features:**
- Automatic mode detection (hosted vs. direct)
- Two verification options when direct mode enabled
- Hosted workflow always available
- Loading states and error handling
- Results display with quality details
- Detailed technical information

## Best Practices

### 🚫 Avoid Polling

**BAD** - Don't do this:
```typescript
// ❌ BAD: Repeatedly calling /v1/output
const pollResults = async () => {
  for (let i = 0; i < 100; i++) {
    const result = await getWorkflowOutput(transactionId)
    if (result.status === "success") break
    await sleep(1000)
  }
}
```

**GOOD** - Do this instead:
```typescript
// ✅ GOOD: Wait for webhook, then fetch once
// In webhook endpoint
export async function POST(request: NextRequest) {
  const payload = await request.json()
  const result = await getWorkflowOutput(payload.transactionId)
  // Store result in database
  await db.liveness.create({ data: result })
}

// In callback page
export default function CallbackPage() {
  useEffect(() => {
    const transactionId = searchParams.get("transactionId")
    // Fetch ONCE after redirect
    getHostedLivenessResult(transactionId)
  }, [])
}
```

### ⚠️ Sanitary Check Compliance

Based on HyperVerge's sanitary check requirements:

1. **No Repeated API Calls**
   - Call `/v1/output` only ONCE per transaction
   - Use webhooks to get notified when results are ready
   - Avoid loops or polling mechanisms

2. **Proper Redirect Flow**
   - User must complete verification on HyperVerge page
   - Wait for redirect to callback URL before fetching results
   - Webhook is sent after user completes verification

3. **Transaction ID Management**
   - Generate unique transaction ID per verification
   - Format: `LIVENESS_{userId}_{timestamp}_{random}`
   - Track transaction IDs to prevent duplicate calls

## Webhook Configuration

Configure webhook in HyperVerge dashboard to receive results automatically:

**Webhook URL:** `https://yourdomain.com/api/webhooks/hyperverge/liveness`

**Payload Example:**
```json
{
  "transactionId": "LIVENESS_USER123_ABC",
  "workflowId": "workflow_liveness",
  "status": "auto_approved" | "auto_declined",
  "result": {
    "action": "pass" | "fail"
  }
}
```

**Handler Implementation:**
```typescript
// app/api/webhooks/hyperverge/liveness/route.ts
export async function POST(request: NextRequest) {
  const payload = await request.json()

  // Fetch full results ONCE
  const output = await getWorkflowOutput(payload.transactionId)

  // Store in database for later retrieval
  await db.livenessVerification.create({
    data: {
      transactionId: payload.transactionId,
      status: output.decision?.isApproved ? "VERIFIED" : "REJECTED",
      decision: output.decision,
      completedAt: new Date(),
    },
  })

  return NextResponse.json({ success: true })
}
```

## Troubleshooting

### Issue: "Direct liveness mode is not enabled"

**Solution:** Set environment variable:
```bash
HYPERVERGE_DIRECT_LIVENESS_ENABLED=true
```

### Issue: Webhook not receiving notifications

**Checks:**
1. Verify webhook URL is publicly accessible
2. Check HyperVerge dashboard webhook configuration
3. Ensure URL uses HTTPS in production
4. Check server logs for incoming requests

### Issue: "No decision returned from workflow output"

**Causes:**
- User didn't complete verification on HyperVerge page
- Calling `/v1/output` too early (before completion)
- Invalid transaction ID

**Solution:**
- Wait for redirect or webhook notification
- Verify transaction ID matches workflow session
- Check HyperVerge dashboard for workflow status

## Security Considerations

1. **Webhook Verification**
   - Implement IP allowlist for HyperVerge IPs
   - Verify webhook signatures if provided
   - Log all webhook requests for audit

2. **Transaction ID Validation**
   - Validate transaction ID format before API calls
   - Check user ownership of transaction
   - Prevent unauthorized result access

3. **Environment Variables**
   - Never expose API keys in client-side code
   - Use server actions for all API calls
   - Rotate credentials periodically

## Components

### `<SelfieCapture />`

Direct capture component with camera controls.

**Props:**
- `onSuccess?: (result) => void` - Called when verification succeeds
- `onError?: (error: string) => void` - Called when verification fails
- `onCancel?: () => void` - Called when user cancels

**Features:**
- Camera flip (front/back)
- Face guide overlay
- Capture/retake controls
- Real-time validation results

### `<LivenessValidationCard />`

Complete verification card UI with dual-mode support.

**Features:**

- Feature flag detection
- Start/restart flow
- Results display with technical details
- Quality issue reporting

## Server Actions

### `validateSelfieLiveness(imageBase64: string)`

Validates a selfie image using HyperVerge API.

**Returns:**

```typescript
{
  success: boolean
  data?: {
    transactionId: string
    status: "VERIFIED" | "REJECTED"
    decision: LivenessDecisionResult
    metadata: { requestId, transactionId }
  }
  error?: string
}
```

### `getLivenessMode()`

Returns current feature flag configuration.

**Returns:**

```typescript
{
	success: boolean
	data: {
		isDirectMode: boolean
		mode: "direct" | "hosted"
		description: string
	}
}
```

## TypeScript Types

### `LivenessDecisionResult`

```typescript
interface LivenessDecisionResult {
	isLive: boolean // Live face detected
	actionPassed: boolean // Quality checks passed
	isApproved: boolean // Both conditions met
	message: string // Human-readable result
	qualityIssues: string[] // List of detected issues
	liveFaceValue: "yes" | "no" | "unknown"
	summaryAction: "pass" | "fail" | "unknown"
}
```

## Security Considerations

- ✅ Requires user authentication
- ✅ Images processed server-side only
- ✅ No client-side storage of images
- ✅ Secure API credentials via environment variables
- ✅ Transaction IDs for audit trail
- ✅ HTTPS-only API communication

## Troubleshooting

### Camera not working

- Check browser permissions
- Ensure HTTPS or localhost (required for camera access)
- Try different browser

### Feature shows as disabled

- Verify `HYPERVERGE_DIRECT_LIVENESS_ENABLED=true` in `.env`
- Restart development server after changing env vars

### API errors

- Check HyperVerge credentials are correct
- Verify API URL is accessible
- Check network connectivity
- Review server logs for detailed error messages

## Related Features

- **KYC Verification**: Full identity verification with documents
- **Profile Settings**: User account management
- **Authentication**: Login/registration system

## Future Enhancements

- [ ] Add hosted workflow mode as alternative
- [ ] Support for QR code workflow
- [ ] Multiple attempt tracking
- [ ] Admin dashboard for review
- [ ] Webhook notifications
- [ ] Custom quality thresholds -->
