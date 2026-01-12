# Liveness Validation Feature

A standalone liveness verification system using HyperVerge's AI-powered face detection technology.

## Overview

This feature provides real-time selfie capture and liveness validation to verify that users are real people, not photos or videos. It's completely separate from the KYC feature and can be used independently for any verification use case.

## Features

- **Live Selfie Capture**: In-app camera access with real-time preview
- **Liveness Detection**: AI-powered detection to prevent spoofing
- **Quality Checks**: Automatic validation for:
  - Eyes open/closed
  - Face occlusion
  - Multiple faces
- **Unified Decision Logic**: Uses `liveFace.value` and `summary.action` from HyperVerge API
- **Real-time Results**: Instant verification feedback with detailed quality reports

## Setup

### 1. Environment Configuration

Add the following to your `.env` file:

```bash
# HyperVerge API Configuration (required)
HYPERVERGE_APP_ID=your_app_id
HYPERVERGE_APP_KEY=your_app_key
HYPERVERGE_API_URL=https://ind.idv.hyperverge.co  # Optional, uses default if not set

# Enable Direct Liveness Mode (required for this feature)
HYPERVERGE_DIRECT_LIVENESS_ENABLED=true
```

### 2. Get HyperVerge Credentials

1. Sign up at [HyperVerge](https://hyperverge.co/)
2. Create an application in the dashboard
3. Copy your App ID and App Key

## Usage

### Access the Page

Navigate to: **`/liveness`** (e.g., `http://localhost:3000/liveness`)

- Requires user authentication (redirects to `/auth/login` if not authenticated)
- Shows feature disabled message if `HYPERVERGE_DIRECT_LIVENESS_ENABLED` is not set to `"true"`

### User Flow

1. **Start Verification** - User clicks button to begin
2. **Camera Access** - Browser requests camera permission
3. **Capture Selfie** - User positions face and captures photo
4. **Live Validation** - Photo is sent to HyperVerge API for analysis
5. **Results** - User sees immediate feedback with quality details

## File Structure

```
features/liveness-validation/
├── api/
│   └── liveness.actions.ts          # Server actions for API calls
├── components/
│   ├── selfie-capture.tsx           # Camera capture component
│   └── liveness-validation-card.tsx # Main UI card component
└── README.md                         # This file

services/hyperverge/
└── liveness.ts                       # HyperVerge API integration

app/(site)/liveness/
└── page.tsx                          # Liveness validation page
```

## API Integration

### HyperVerge `/checkLiveness` Endpoint

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

Complete verification card UI.

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
- [ ] Custom quality thresholds
