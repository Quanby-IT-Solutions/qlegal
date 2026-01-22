# Quanby Legal — System Flow (UI/UX Reference)

> **Document Purpose**: This document describes how users interact with the Quanby Legal platform.
> It is written for UI/UX designers, product managers, and non-developers.
> No code, APIs, or technical implementation details are included.

---

## Key Terms

| Term          | Meaning                                                             |
| ------------- | ------------------------------------------------------------------- |
| **ENP**       | Electronic Notary Public — the notary providing services            |
| **ENF**       | Electronic Notarial Facility — the platform (Quanby Legal)          |
| **Principal** | The client who needs documents notarized                            |
| **Witness**   | Person who observes and confirms signature (required for some docs) |
| **REN**       | Remote Electronic Notarization — all parties join via video         |
| **IEN**       | In-Person Electronic Notarization — all parties physically present  |
| **HYBRID**    | Mixed mode — some remote, some in-person                            |
| **KYC**       | Know Your Customer — identity verification process                  |
| **Liveness**  | Real-time face verification to prevent fraud                        |
| **SC**        | Supreme Court of the Philippines                                    |

---

## High-Level Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                         │
│                           QUANBY LEGAL — COMPLETE FLOW                                  │
│                                                                                         │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐ │
│  │         │    │         │    │         │    │         │    │         │    │         │ │
│  │ REGISTER│───►│   KYC   │───►│  FIND   │───►│  BOOK   │───►│ SESSION │───►│COMPLETE │ │
│  │         │    │         │    │   ENP   │    │         │    │         │    │         │ │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘ │
│       │              │              │              │              │              │      │
│       ▼              ▼              ▼              ▼              ▼              ▼      │
│   Email verify   ID + Face    Browse/Match    Scheduled/     Video call    Documents    │
│   Basic info                  Message first   Quick Match    Sign docs      stored      │
│                                                              Pay fees      Audit trail  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Registration & Verification

### 1.1 Account Creation

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   REGISTRATION FLOW                                             │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   1. Go to /register                                    │   │
│   │                                                         │   │
│   │   2. Enter basic info                                   │   │
│   │      • Full legal name                                  │   │
│   │      • Email address                                    │   │
│   │      • Password                                         │   │
│   │      • Phone number (optional)                          │   │
│   │                                                         │   │
│   │   3. Accept Terms of Service                            │   │
│   │                                                         │   │
│   │   4. Click [Create Account]                             │   │
│   │                                                         │   │
│   │   5. Check email for verification link                  │   │
│   │                                                         │   │
│   │   6. Click link → Account verified                      │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 KYC (Identity Verification)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   KYC FLOW (Required to access the system)                      │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   1. Go to /kyc (prompted after registration)           │   │
│   │                                                         │   │
│   │   2. Upload government-issued ID                        │   │
│   │      • Philippine ID, Passport, Driver's License, etc.  │   │
│   │      • Front and back (if applicable)                   │   │
│   │                                                         │   │
│   │   3. Face matching                                      │   │
│   │      • Take a selfie                                    │   │
│   │      • System verifies you match your ID photo          │   │
│   │                                                         │   │
│   │   4. Wait for verification (usually instant)            │   │
│   │                                                         │   │
│   │   5. Status: ✓ KYC Verified                             │   │
│   │      • Can now access all system features               │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ⚠️  KYC is required for ALL USERS to access the system:       │
│      • All Principals (clients)                                 │
│      • All Witnesses                                            │
│      • All ENPs (during their accreditation process)            │
│                                                                 │
│   📝 Note: KYC is different from Liveness Check.                │
│      KYC = one-time identity verification to access system      │
│      Liveness = real-time check before EVERY session            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Pre-Session Security (Liveness + Geolocation)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   LIVENESS + GEOLOCATION CHECK (Before every session)           │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Before joining ANY session, each participant must:    │   │
│   │                                                         │   │
│   │   1. Liveness Check                                     │   │
│   │      • Look at camera                                   │   │
│   │      • Follow prompts                                   │   │
│   │      • Proves you are a real human, present now         │   │
│   │      • Prevents pre-recorded video fraud                │   │
│   │                                                         │   │
│   │   2. Geolocation Check                                  │   │
│   │      • Must be in Philippines, OR                       │   │
│   │      • At Philippine embassy/consular office abroad     │   │
│   │      • VPN usage is detected and blocked                │   │
│   │                                                         │   │
│   │   3. Only after BOTH pass → [Join Session] enabled      │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ⚠️  This happens EVERY TIME before a session:                 │
│      • Principal must pass                                      │
│      • All Witnesses must pass                                  │
│      • ENP must pass                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 2: ENP Selection (SC Compliance)

Per SC Rules on eNotarization, users can choose ENPs in two ways.
All booking flows start at `/browse` — the unified entry point.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   OPTION 1: BROWSE & SELECT (Choose Specific ENP)               │
│   ═══════════════════════════════════════════════               │
│                                                                 │
│   Similar to online health consultation apps — pick your        │
│   preferred professional.                                       │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   1. Go to /browse                                      │   │
│   │                                                         │   │
│   │   2. Select [Browse ENPs] tab                           │   │
│   │                                                         │   │
│   │   3. Browse ENP Directory                               │   │
│   │      • Filter by: specialization, ratings, badges,      │   │
│   │        location, language, consultation rate            │   │
│   │                                                         │   │
│   │   4. View ENP profile                                   │   │
│   │      • See qualifications, reviews, rates, badges       │   │
│   │      • Check availability calendar                      │   │
│   │                                                         │   │
│   │   5. Select specific date & time slot                   │   │
│   │                                                         │   │
│   │   6. Choose session type (Consultation/Notarization)    │   │
│   │                                                         │   │
│   │   7. Choose mode (REN/IEN/Hybrid)                       │   │
│   │                                                         │   │
│   │   8. Submit booking request                             │   │
│   │                                                         │   │
│   │   9. Wait for ENP to accept/reject/reschedule           │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   OPTION 2: QUICK MATCH (Smart Pairing)                         │
│   ═════════════════════════════════════                         │
│                                                                 │
│   System finds the best available ENP using a fair algorithm.   │
│   (See "Quick Match Algorithm" section for details)             │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   1. Go to /browse                                      │   │
│   │                                                         │   │
│   │   2. Select [Quick Match] tab                           │   │
│   │                                                         │   │
│   │   3. Select service type (Consultation/Notarization)    │   │
│   │                                                         │   │
│   │   4. Select mode (REN/IEN/Hybrid)                       │   │
│   │                                                         │   │
│   │   5. (Optional) Select document type for better match   │   │
│   │                                                         │   │
│   │   6. Choose preferred time window                       │   │
│   │      (e.g., "Today 2-4 PM" or "ASAP")                   │   │
│   │                                                         │   │
│   │   7. Click [Find Best Match]                            │   │
│   │                                                         │   │
│   │   8. System shows matched ENP profile briefly           │   │
│   │      (name, photo, rating, badges, specializations)     │   │
│   │                                                         │   │
│   │   9. Client can [Confirm] or [Find Another]             │   │
│   │      (max 2 re-matches, then 10-min cooldown)           │   │
│   │                                                         │   │
│   │   10. ENP has 60 seconds to accept                      │   │
│   │                                                         │   │
│   │   Use case: Urgent requests, trust the system           │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ALTERNATIVE: MESSAGE FIRST                                    │
│   ══════════════════════════                                    │
│                                                                 │
│   User has questions or wants to discuss before booking.        │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   1. Go to /browse → [Browse ENPs] tab                  │   │
│   │                                                         │   │
│   │   2. Browse and select an ENP                           │   │
│   │                                                         │   │
│   │   3. Click [💬 Message] on their profile                │   │
│   │                                                         │   │
│   │   OR                                                    │   │
│   │                                                         │   │
│   │   1. Go to /messages                                    │   │
│   │                                                         │   │
│   │   2. Search for an ENP by name/email                    │   │
│   │                                                         │   │
│   │   3. Start a new conversation                           │   │
│   │                                                         │   │
│   │   THEN                                                  │   │
│   │                                                         │   │
│   │   4. Chat with ENP                                      │   │
│   │      • Ask questions                                    │   │
│   │      • Share files for preliminary review               │   │
│   │      • Discuss requirements                             │   │
│   │                                                         │   │
│   │   5. Either party can request session upgrade           │   │
│   │      (see "Messaging → Session Upgrade" section)        │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### When to Use Each Path

| Scenario                                    | Recommended Path |
| ------------------------------------------- | ---------------- |
| Know exactly what you need                  | Browse & Select  |
| Urgent, no ENP preference                   | Quick Match      |
| Have questions before committing            | Message First    |
| Need ENP to review documents before booking | Message First    |
| Regular client with established ENP         | Browse & Select  |

---

## Quick Match Algorithm

The Quick Match system uses a **bidirectional scoring algorithm** that's fair to both ENPs and Principals.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ENP SCORING (how system ranks available ENPs)                 │
│   ═════════════════════════════════════════════                 │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   BASE SCORE (0-100 points each):                       │   │
│   │                                                         │   │
│   │   📊 Rating Score (25%)                                 │   │
│   │      • Average client review rating                     │   │
│   │      • Weighted by recency (recent reviews matter more) │   │
│   │                                                         │   │
│   │   ⚡ Speed Score (20%)                                   │   │
│   │      • Average session duration vs expected             │   │
│   │      • Response time to booking requests                │   │
│   │                                                         │   │
│   │   🏆 Experience Score (20%)                             │   │
│   │      • Total completed notarizations                    │   │
│   │      • Years as ENP                                     │   │
│   │                                                         │   │
│   │   🎯 Specialization Match (15%)                         │   │
│   │      • If client specifies document type                │   │
│   │      • ENP's expertise in that area                     │   │
│   │                                                         │   │
│   │   ⚖️  Workload Balancer (20%)                           │   │
│   │      • Fewer recent sessions = higher score             │   │
│   │      • Ensures fair distribution across ENPs            │   │
│   │      • Prevents top ENPs from getting ALL requests      │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   ENP BOOSTS (temporary score multipliers):             │   │
│   │                                                         │   │
│   │   🌟 New ENP Boost (+15%)                               │   │
│   │      • First 30 days on platform                        │   │
│   │      • Helps new ENPs build initial client base         │   │
│   │                                                         │   │
│   │   🔄 Returning-from-Inactive Boost (+10%)               │   │
│   │      • ENP was inactive 30+ days, now back              │   │
│   │      • Lasts for 7 days after return                    │   │
│   │                                                         │   │
│   │   💎 Rare Specialization Boost (+10%)                   │   │
│   │      • ENP has expertise few others have                │   │
│   │      • e.g., foreign language, specific legal area      │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   PRINCIPAL SCORING (how system evaluates clients)              │
│   ════════════════════════════════════════════════              │
│                                                                 │
│   ENPs see client score when receiving Quick Match requests.    │
│   This helps ENPs make informed decisions.                      │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   ✓ Verification Status                                 │   │
│   │     • KYC completed and verified                        │   │
│   │     • ID documents validated                            │   │
│   │                                                         │   │
│   │   📅 Reliability Score                                  │   │
│   │     • Show-up rate (attended vs no-show)                │   │
│   │     • Payment success rate                              │   │
│   │     • Cancellation history                              │   │
│   │                                                         │   │
│   │   📜 Session History                                    │   │
│   │     • Total completed sessions                          │   │
│   │     • Previous ENP reviews of this client               │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   PENALTIES & COOLDOWNS                                         │
│   ═════════════════════                                         │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   FOR ENPs:                                             │   │
│   │                                                         │   │
│   │   ⚠️  Decline Penalty                                   │   │
│   │      • Declining Quick Match requests drops score       │   │
│   │      • 3+ declines in 24 hours: -5% to overall score    │   │
│   │      • 5+ declines in 24 hours: -10% to overall score   │   │
│   │      • Affects "Fast Responder" badge eligibility       │   │
│   │                                                         │   │
│   │   💡 Tip: ENPs can opt-out of Quick Match in settings   │   │
│   │      instead of repeatedly declining                    │   │
│   │                                                         │   │
│   │   ─────────────────────────────────────────────────     │   │
│   │                                                         │   │
│   │   FOR PRINCIPALS:                                       │   │
│   │                                                         │   │
│   │   ⏳ Re-match Cooldown                                  │   │
│   │      • Max 2 "Find Another" attempts per request        │   │
│   │      • After 2 re-matches: 10-minute cooldown           │   │
│   │      • Must browse manually or wait                     │   │
│   │                                                         │   │
│   │   This prevents clients from endlessly cycling          │   │
│   │   through ENPs and wasting their time.                  │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Match — Client Experience

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   CLIENT QUICK MATCH FLOW                                                    │
│                                                                              │
│   CLIENT                        SYSTEM                                       │
│      │                             │                                         │
│      │   Goes to /browse           │                                         │
│      │   Selects [Quick Match]     │                                         │
│      │   Fills in preferences      │                                         │
│      │   Clicks [Find Best Match]  │                                         │
│      │────────────────────────────►│                                         │
│      │                             │                                         │
│      │                             │   System calculates scores              │
│      │                             │   for all available ENPs                │
│      │                             │                                         │
│      │   ┌────────────────────────────────────────────┐                      │
│      │   │ 🎯 Best Match Found!                       │                      │
│      │   │                                            │                      │
│      │   │ ┌──────┐                                   │                      │
│      │   │ │ 👤   │  Atty. Maria Santos               │                      │
│      │   │ │      │  ⭐ 4.8 (127 reviews)             │                      │
│      │   │ └──────┘                                   │                      │
│      │   │                                            │                      │
│      │   │ 🏆 Top Rated  ⚡ Fast Responder            │                       │
│      │   │ 📜 500+ Sessions                           │                      │
│      │   │                                            │                      │
│      │   │ Specializations:                           │                      │
│      │   │ • Real Estate  • Business Contracts        │                      │
│      │   │                                            │                      │
│      │   │ Available: Today 3:00 PM                   │                      │
│      │   │                                            │                      │
│      │   │ [✓ Confirm]    [↻ Find Another (2 left)]   │                      │
│      │   └────────────────────────────────────────────┘                      │
│      │                             │                                         │
│      │   Clicks [Confirm]          │                                         │
│      │────────────────────────────►│                                         │
│      │                             │                                         │
│      │                             │   Request sent to ENP                   │
│      │                             │   (60-second timer starts)              │
│      │                             │                                         │
│      │   ┌────────────────────────────────────────────┐                      │
│      │   │ ⏳ Waiting for Atty. Santos to accept...   │                      │
│      │   │                                            │                      │
│      │   │ ████████████░░░░░░░░  45 seconds left      │                      │
│      │   └────────────────────────────────────────────┘                      │
│      │                             │                                         │
│      │                             │   ENP accepts!                          │
│      │                             │                                         │
│      │   ┌────────────────────────────────────────────┐                      │
│      │   │ ✓ Session Booked!                          │                      │
│      │   │                                            │                      │
│      │   │ Notarization (REN) with Atty. Maria Santos │                      │
│      │   │ Today • 3:00 PM                            │                      │
│      │   │                                            │                      │
│      │   │ [View Details]    [Add to Calendar]        │                      │
│      │   └────────────────────────────────────────────┘                      │
│      │                             │                                         │
└──────┴─────────────────────────────┴─────────────────────────────────────────┘
```

---

## Quick Match — ENP Experience

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   ENP QUICK MATCH FLOW                                                       │
│                                                                              │
│   SYSTEM                           ENP                                       │
│      │                              │                                        │
│      │   Incoming Quick Match!      │                                        │
│      │   (push notification +       │                                        │
│      │    in-app alert)             │                                        │
│      │─────────────────────────────►│                                        │
│      │                              │                                        │
│      │   ┌────────────────────────────────────────────┐                      │
│      │   │ 🔔 Quick Match Request                     │                      │
│      │   │                                            │                      │
│      │   │ ┌──────┐                                   │                      │
│      │   │ │ 👤   │  Juan Santos                      │                      │
│      │   │ │      │  ✓ Verified  📅 12 sessions       │                      │
│      │   │ └──────┘  ⭐ 98% reliability               │                      │
│      │   │                                            │                      │
│      │   │ 🏷️ Returning Client                        │                      │
│      │   │                                            │                      │
│      │   │ Service: Notarization (REN)                │                      │
│      │   │ Document: Deed of Sale                     │                      │
│      │   │ When: Today 3:00 PM                        │                      │
│      │   │                                            │                      │
│      │   │ ⏱️ 60 seconds to respond                   │                      │
│      │   │ ████████████████░░░░  48 sec               │                      │
│      │   │                                            │                      │
│      │   │ [✓ Accept]    [✗ Decline]                  │                      │
│      │   └────────────────────────────────────────────┘                      │
│      │                              │                                        │
│      │                              │   ENP clicks [Accept]                  │
│      │◄─────────────────────────────│                                        │
│      │                              │                                        │
│      │   Session confirmed!         │                                        │
│      │   Added to ENP calendar      │                                        │
│      │                              │                                        │
│      │   ─────────────────────────────────────────────────────────           │
│      │                              │                                        │
│      │   IF ENP doesn't respond in 60 seconds:                               │
│      │   → Auto-decline                                                      │
│      │   → System tries next best ENP                                        │
│      │   → Counts as decline (affects score)                                 │
│      │                              │                                        │
└──────┴──────────────────────────────┴────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ENP QUICK MATCH SETTINGS (in /settings)                       │
│   ═══════════════════════════════════════                       │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Quick Match Preferences                               │   │
│   │                                                         │   │
│   │   ┌─────────────────────────────────────────────────┐   │   │
│   │   │                                                 │   │   │
│   │   │   [✓] Opt-in to Quick Match                     │   │   │
│   │   │                                                 │   │   │
│   │   │   Max Quick Match sessions per day: [5 ▼]       │   │   │
│   │   │                                                 │   │   │
│   │   │   Accept requests for:                          │   │   │
│   │   │   [✓] Notarization                              │   │   │
│   │   │   [✓] Consultation                              │   │   │
│   │   │                                                 │   │   │
│   │   │   Accept modes:                                 │   │   │
│   │   │   [✓] REN (Remote)                              │   │   │
│   │   │   [✓] IEN (In-Person)                           │   │   │
│   │   │   [✓] Hybrid                                    │   │   │
│   │   │                                                 │   │   │
│   │   │   Quiet hours (no Quick Match):                 │   │   │
│   │   │   [10:00 PM] to [7:00 AM]                       │   │   │
│   │   │                                                 │   │   │
│   │   └─────────────────────────────────────────────────┘   │   │
│   │                                                         │   │
│   │   💡 Opting out has no penalty.                         │   │
│   │      Declining while opted-in affects your score.       │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Badge System

Badges are visual trust indicators displayed on profiles and during Quick Match.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ENP BADGES                                                    │
│   ══════════                                                    │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   🏆 TOP RATED                                          │   │
│   │      • 4.8+ average rating                              │   │
│   │      • Minimum 50 reviews                               │   │
│   │      • Reviewed monthly                                 │   │
│   │                                                         │   │
│   │   ⚡ FAST RESPONDER                                      │   │
│   │      • Accepts 90%+ of requests within time limit       │   │
│   │      • Average response time under 30 seconds           │   │
│   │      • Reviewed weekly                                  │   │
│   │                                                         │   │
│   │   📜 100+ SESSIONS / 500+ SESSIONS / 1000+ SESSIONS     │   │
│   │      • Milestone badges for completed notarizations     │   │
│   │      • Permanent once earned                            │   │
│   │                                                         │   │
│   │   🎯 SPECIALIST: [AREA]                                 │   │
│   │      • e.g., "Specialist: Real Estate"                  │   │
│   │      • 50+ sessions in specific document category       │   │
│   │      • Self-declared + verified by session history      │   │
│   │                                                         │   │
│   │   🌟 RISING STAR                                        │   │
│   │      • New ENP (first 30 days)                          │   │
│   │      • 4.5+ rating in first 10 sessions                 │   │
│   │      • Encourages clients to try new ENPs               │   │
│   │                                                         │   │
│   │   ✓ SC ACCREDITED                                       │   │
│   │      • Default badge for all verified ENPs              │   │
│   │      • Confirms valid commission under SC rules         │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   PRINCIPAL (CLIENT) BADGES                                     │
│   ═════════════════════════                                     │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   ✓ VERIFIED                                            │   │
│   │      • KYC completed and validated                      │   │
│   │      • Government ID verified                           │   │
│   │      • Default for all active users                     │   │
│   │                                                         │   │
│   │   🔄 RETURNING CLIENT                                   │   │
│   │      • 3+ completed sessions                            │   │
│   │      • 95%+ show-up rate                                │   │
│   │      • Signals reliability to ENPs                      │   │
│   │                                                         │   │
│   │   📜 10+ SESSIONS / 50+ SESSIONS                        │   │
│   │      • Milestone badges for session history             │   │
│   │      • Shows experience with the platform               │   │
│   │                                                         │   │
│   │   ⭐ GREAT CLIENT                                       │   │
│   │      • 4.8+ average rating from ENPs                    │   │
│   │      • ENPs can rate clients after sessions             │   │
│   │      • Based on: preparedness, communication,           │   │
│   │        punctuality, payment                             │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   BADGE DISPLAY EXAMPLES                                        │
│   ══════════════════════                                        │
│                                                                 │
│   ENP Profile Card:                                             │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Atty. Maria Santos                                    │   │
│   │   ⭐ 4.9 (234 reviews)                                  │   │
│   │                                                         │   │
│   │   🏆 Top Rated  ⚡ Fast Responder  📜 500+ Sessions     │   │
│   │   🎯 Specialist: Real Estate                            │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   Client Profile Card (shown to ENP):                           │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Juan Santos                                           │   │
│   │   ✓ Verified  🔄 Returning Client  📜 10+ Sessions      │   │
│   │   ⭐ 98% reliability                                    │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 3: Session Modes (REN / IEN / HYBRID)

### 3.1 Mode Comparison

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                         │
│   SESSION MODES COMPARISON                                                              │
│                                                                                         │
│   ┌───────────────────────────────────────────────────────────────────────────────────┐ │
│   │                                                                                   │ │
│   │   REN (Remote Electronic Notarization)                                            │ │
│   │   ════════════════════════════════════                                            │ │
│   │                                                                                   │ │
│   │   WHO:     All parties join via VIDEO CALL                                        │ │
│   │            ENP (remote) ←→ Principal (remote) ←→ Witnesses (remote)               │ │
│   │                                                                                   │ │
│   │   WHERE:   Each person at their own location                                      │ │
│   │            Must be in Philippines or at PH embassy/consular                       │ │
│   │                                                                                   │ │
│   │   USE:     OFWs abroad, clients in different cities, convenience                  │ │
│   │                                                                                   │ │
│   │   FLOW:    All join video → All do liveness check → Sign digitally                │ │
│   │                                                                                   │ │
│   └───────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                         │
│   ┌───────────────────────────────────────────────────────────────────────────────────┐ │
│   │                                                                                   │ │
│   │   IEN (In-Person Electronic Notarization)                                         │ │
│   │   ═════════════════════════════════════                                           │ │
│   │                                                                                   │ │
│   │   WHO:     All parties PHYSICALLY PRESENT with ENP                                │ │
│   │            ENP + Principal + Witnesses in same room                               │ │
│   │                                                                                   │ │
│   │   WHERE:   ENP's office or designated location                                    │ │
│   │                                                                                   │ │
│   │   USE:     Traditional notarization, high-value transactions                      │ │
│   │                                                                                   │ │
│   │   FLOW:    All present → Liveness check on ENP's device → Sign on device          │ │
│   │                                                                                   │ │
│   └───────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                         │
│   ┌───────────────────────────────────────────────────────────────────────────────────┐ │
│   │                                                                                   │ │
│   │   HYBRID (Mixed Mode)                                                             │ │
│   │   ═══════════════════                                                             │ │
│   │                                                                                   │ │
│   │   WHO:     SOME parties remote, SOME in-person                                    │ │
│   │            Example: Principal at embassy + Witness remote + ENP remote            │ │
│   │                                                                                   │ │
│   │   WHERE:   Mixed locations                                                        │ │
│   │                                                                                   │ │
│   │   USE:     OFW (at embassy) + family member (in Philippines) signing together     │ │
│   │                                                                                   │ │
│   │   FLOW:    Video call connects all → Each does liveness at their location         │ │
│   │                                                                                   │ │
│   └───────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Mode Selection During Booking

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   MODE SELECTION UI                                             │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   How will you meet with the notary?                    │   │
│   │                                                         │   │
│   │   ┌─────────────────────────────────────────────────┐   │   │
│   │   │                                                 │   │   │
│   │   │   ○ REN — Everyone joins via video call         │   │   │
│   │   │     Best for: Remote locations, convenience     │   │   │
│   │   │                                                 │   │   │
│   │   │   ○ IEN — Everyone meets in person              │   │   │
│   │   │     Best for: Traditional preference, complex   │   │   │
│   │   │     documents                                   │   │   │
│   │   │                                                 │   │   │
│   │   │   ○ HYBRID — Mix of remote and in-person        │   │   │
│   │   │     Best for: OFW + local family member         │   │   │
│   │   │                                                 │   │   │
│   │   └─────────────────────────────────────────────────┘   │   │
│   │                                                         │   │
│   │   ⚠️ Note: All parties must be in Philippines or at     │   │
│   │      a Philippine embassy/consular office abroad.       │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 4: Session Types

### 4.1 Consultation vs Notarization

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                         │
│   SESSION TYPES                                                                         │
│                                                                                         │
│   ┌───────────────────────────────────────┬───────────────────────────────────────────┐ │
│   │                                       │                                           │ │
│   │   CONSULTATION                        │   NOTARIZATION                            │ │
│   │   ════════════                        │   ════════════                            │ │
│   │                                       │                                           │ │
│   │   Purpose:                            │   Purpose:                                │ │
│   │   • Ask questions                     │   • Officially notarize documents         │ │
│   │   • Get legal advice                  │   • Create legal records                  │ │
│   │   • Review documents                  │   • Bind signatures                       │ │
│   │   • Discuss options                   │                                           │ │
│   │                                       │                                           │ │
│   │   Payment:                            │   Payment:                                │ │
│   │   • PAY UPFRONT (before session)      │   • PAY UPFRONT (before session starts)   │ │
│   │   • Based on ENP's consultation rate  │   • Based on ENP's fee per document       │ │
│   │                                       │   • Plus platform fee (10%)               │ │
│   │                                       │                                           │ │
│   │   Output:                             │   Output:                                 │ │
│   │   • No official documents             │   • Notarized documents (PDF)             │ │
│   │   • Chat/video transcript (optional)  │   • Entry in notarial book                │ │
│   │                                       │   • Session recording (optional)          │ │
│   │                                       │                                           │ │
│   │   Can upgrade to:                     │   Recording:                              │ │
│   │   • Notarization (if needed)          │   • Optional (can be enabled)             │ │
│   │                                       │   • Stored per SC requirements if enabled │ │
│   │                                       │                                           │ │
│   └───────────────────────────────────────┴───────────────────────────────────────────┘ │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Payment Split

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   PAYMENT DISTRIBUTION                                          │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Total Fee: ₱1,000 (example)                           │   │
│   │                                                         │   │
│   │   ┌─────────────────────────────────────────────────┐   │   │
│   │   │ ██████████████████████████████████████████ 90%  │   │   │
│   │   │                                                 │   │   │
│   │   │                 ENP: ₱900                       │   │   │
│   │   └─────────────────────────────────────────────────┘   │   │
│   │                                                         │   │
│   │   ┌─────┐                                               │   │
│   │   │████ │ 10%  Platform: ₱100                           │   │
│   │   └─────┘                                               │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ⚠️ IEN sessions can accept CASH payment                       │
│      ENP clicks [✓ Client Paid Cash] to confirm                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 5: Document Management

### 5.1 Document Upload & Review Flow

Documents can be uploaded by either party. The review process differs based on who uploaded.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   FLOW A: PRINCIPAL UPLOADS DOCUMENT                            │
│   ══════════════════════════════════                            │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   1. Principal uploads document                         │   │
│   │      • Contract drafts, supporting docs, etc.           │   │
│   │      • Can optionally add document type tag             │   │
│   │                                                         │   │
│   │   2. ENP reviews the document                           │   │
│   │      • Adds/corrects document type tag (if missing)     │   │
│   │      • Sets notarization fee for THIS document          │   │
│   │        (can be different per document)                  │   │
│   │      • Can request changes or reject                    │   │
│   │                                                         │   │
│   │   3. Once ENP finishes review → Document ready          │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   FLOW B: ENP UPLOADS DOCUMENT                                  │
│   ══════════════════════════════                                │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   1. ENP uploads document                               │   │
│   │      • Templates, corrected versions, forms             │   │
│   │      • Must include: document type tag                  │   │
│   │      • Must include: notarization fee for this doc      │   │
│   │                                                         │   │
│   │   2. Principal reviews the document                     │   │
│   │      • Views document content                           │   │
│   │      • Sees the fee ENP set for this document           │   │
│   │      • Clicks [✓ Approve] or [✗ Request Changes]        │   │
│   │                                                         │   │
│   │   3. Once Principal approves → Document ready           │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Document Locking & Payment

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   DOCUMENT LOCKING → PAYMENT → SESSION                          │
│   ════════════════════════════════════                          │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   STEP 1: All documents reviewed                        │   │
│   │   ─────────────────────────────────                     │   │
│   │   • Each document has been reviewed                     │   │
│   │   • Each document has: type tag + ENP fee               │   │
│   │   • Principal has approved ENP-uploaded docs            │   │
│   │                                                         │   │
│   │   STEP 2: ENP locks all documents                       │   │
│   │   ─────────────────────────────────                     │   │
│   │   • ENP clicks [🔒 Lock All Documents]                  │   │
│   │   • Documents become LOCKED                             │   │
│   │   • No more uploads or edits allowed                    │   │
│   │   • Signing order is finalized                          │   │
│   │                                                         │   │
│   │   STEP 3: Principal pays total fees                     │   │
│   │   ─────────────────────────────────                     │   │
│   │   • System shows total: sum of all document fees + 10%  │   │
│   │   • Principal pays via Card/GCash/Maya                  │   │
│   │   • (IEN: can pay cash, ENP confirms)                   │   │
│   │                                                         │   │
│   │   STEP 4: Session can start                             │   │
│   │   ─────────────────────────────────                     │   │
│   │   • Payment confirmed → [Join Session] enabled          │   │
│   │   • Documents signed in locked order                    │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ⚠️ IMPORTANT:                                                 │
│      • Principal MUST PAY before notarization starts            │
│      • Once locked, no new documents can be added               │
│      • Once locked, existing documents cannot be edited         │
│      • The signing order is set at lock time                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Document States

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   DOCUMENT STATE DIAGRAM                                        │
│                                                                 │
│   Principal uploads:                                            │
│   ┌──────────┐   ┌─────────────┐   ┌────────┐   ┌──────────┐   │
│   │ UPLOADED │──►│ ENP REVIEW  │──►│ READY  │──►│  LOCKED  │   │
│   └──────────┘   └─────────────┘   └────────┘   └──────────┘   │
│                         │                            │          │
│                         ▼                            ▼          │
│                  ┌────────────┐              ┌───────────┐      │
│                  │ NEEDS EDIT │              │ NOTARIZED │      │
│                  └────────────┘              └───────────┘      │
│                                                                 │
│   ENP uploads:                                                  │
│   ┌──────────┐   ┌───────────────┐   ┌────────┐   ┌────────┐   │
│   │ UPLOADED │──►│ CLIENT REVIEW │──►│ READY  │──►│ LOCKED │   │
│   └──────────┘   └───────────────┘   └────────┘   └────────┘   │
│                         │                            │          │
│                         ▼                            ▼          │
│                  ┌────────────┐              ┌───────────┐      │
│                  │ NEEDS EDIT │              │ NOTARIZED │      │
│                  └────────────┘              └───────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 6: Witness Management

### 6.1 Witness Invitation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   WITNESS INVITATION (by Principal or ENP)                      │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   1. From session details, click [+ Add Witness]        │   │
│   │                                                         │   │
│   │   2. Enter witness details:                             │   │
│   │      • Full legal name                                  │   │
│   │      • Email address                                    │   │
│   │      • Phone number (optional)                          │   │
│   │                                                         │   │
│   │   3. Select witness participation mode:                 │   │
│   │      ○ Remote (joins via video)                         │   │
│   │      ○ In-person (at ENP location or embassy)           │   │
│   │                                                         │   │
│   │   4. Click [Send Invitation]                            │   │
│   │                                                         │   │
│   │   5. Witness receives email with:                       │   │
│   │      • Link to register/login                           │   │
│   │      • Session details                                  │   │
│   │      • Instructions for KYC                             │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ⚠️ Witness Requirements:                                      │
│      • Must complete KYC before session                         │
│      • Must pass liveness check during session                  │
│      • Must be in Philippines or at PH embassy/consular         │
│      • No limit on number of witnesses                          │
│      • No separate fee (covered by principal's payment)         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Document Signing Status

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   DOCUMENT SIGNING STATUS (during session)                      │
│                                                                 │
│   Track signing progress per document, not per person.          │
│   Each document must be fully signed before moving to next.     │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Session #12345 — Signing Progress                     │   │
│   │                                                         │   │
│   │   ┌─────────────────────────────────────────────────┐   │   │
│   │   │                                                 │   │   │
│   │   │   📄 Document 1: Deed of Absolute Sale          │   │   │
│   │   │   ──────────────────────────────────────        │   │   │
│   │   │   [✓] Juan Santos (Principal) - Signed          │   │   │
│   │   │   [✓] Maria Cruz (Witness) - Signed             │   │   │
│   │   │   [✓] Pedro Santos (Witness) - Signed           │   │   │
│   │   │   [✓] Atty. Maria Santos (ENP) - Notarized      │   │   │
│   │   │                                                 │   │   │
│   │   │   Status: ✅ COMPLETE                           │   │   │
│   │   │                                                 │   │   │
│   │   ├─────────────────────────────────────────────────┤   │   │
│   │   │                                                 │   │   │
│   │   │   📄 Document 2: Special Power of Attorney      │   │   │
│   │   │   ──────────────────────────────────────        │   │   │
│   │   │   [✓] Juan Santos (Principal) - Signed          │   │   │
│   │   │   [⏳] Maria Cruz (Witness) - Pending           │   │   │
│   │   │   [ ] Pedro Santos (Witness) - Waiting          │   │   │
│   │   │   [ ] Atty. Maria Santos (ENP) - Waiting        │   │   │
│   │   │                                                 │   │   │
│   │   │   Status: 🔄 IN PROGRESS                        │   │   │
│   │   │                                                 │   │   │
│   │   ├─────────────────────────────────────────────────┤   │   │
│   │   │                                                 │   │   │
│   │   │   📄 Document 3: Affidavit                      │   │   │
│   │   │   ──────────────────────────────────────        │   │   │
│   │   │   [ ] Juan Santos (Principal) - Waiting         │   │   │
│   │   │   [ ] Atty. Maria Santos (ENP) - Waiting        │   │   │
│   │   │                                                 │   │   │
│   │   │   Status: ⏸️ PENDING (after Doc 2)              │   │   │
│   │   │                                                 │   │   │
│   │   └─────────────────────────────────────────────────┘   │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ⚠️ Signing Order:                                             │
│      • Documents are signed in the order they were locked       │
│      • All signers must complete Doc 1 before Doc 2 begins      │
│      • ENP signs last (adds notarial seal) for each document    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 7: The Session

### 7.1 Pre-Session Checklist

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   PRE-SESSION CHECKLIST (shown before joining)                  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Before you join, please ensure:                       │   │
│   │                                                         │   │
│   │   [✓] Stable internet connection                        │   │
│   │   [✓] Working camera and microphone                     │   │
│   │   [✓] Good lighting on your face                        │   │
│   │   [✓] Valid ID ready                                    │   │
│   │   [✓] All documents reviewed and locked                 │   │
│   │   [✓] Payment completed                                 │   │
│   │   [✓] All witnesses KYC-verified                        │   │
│   │                                                         │   │
│   │   ⚠️  Waiting for liveness + geolocation check          │   │
│   │       [Start Verification]                              │   │
│   │                                                         │   │
│   │   ────────────────────────────────────────────────      │   │
│   │                                                         │   │
│   │   [Join Session] (enabled after verification passes)    │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Session Flow (REN Example)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   REN SESSION FLOW                                                           │
│                                                                              │
│   ENP                           PRINCIPAL                    WITNESS         │
│    │                                │                           │            │
│    │◄─────── All join video call ───┼───────────────────────────┤            │
│    │                                │                           │            │
│    │   ┌────────────────────────────────────────────────────────────┐        │
│    │   │ 📹 Video Session Started                                   │        │
│    │   │ Recording: ● ACTIVE                                        │        │
│    │   │                                                            │        │
│    │   │ ┌────────┐  ┌────────┐  ┌────────┐                         │        │
│    │   │ │  ENP   │  │Principal│  │Witness │                        │        │
│    │   │ │  👤    │  │   👤   │  │   👤   │                        │        │
│    │   │ └────────┘  └────────┘  └────────┘                         │        │
│    │   └────────────────────────────────────────────────────────────┘        │
│    │                                │                           │            │
│    ├─── Verify geolocation ─────────┼───────────────────────────┤            │
│    │    (all must pass)             │                           │            │
│    │                                │                           │            │
│    ├─── Conduct liveness check ─────┼───────────────────────────┤            │
│    │    (each person, one by one)   │                           │            │
│    │                                │                           │            │
│    │   ┌────────────────────────────────────────────────────────────┐        │
│    │   │ 🔐 Security Checks                                         │        │
│    │   │                                                            │        │
│    │   │ [✓] Juan Santos - Liveness verified                        │        │
│    │   │ [✓] Maria Cruz - Liveness verified                         │        │
│    │   │ [⏳] Pedro Santos - Verifying...                           │        │
│    │   └────────────────────────────────────────────────────────────┘        │
│    │                                │                           │            │
│    ├─── Present documents ──────────┤                           │            │
│    │    (screen share)              │                           │            │
│    │                                │                           │            │
│    │   ┌────────────────────────────────────────────────────────────┐        │
│    │   │ � Payment Already Completed (pre-session)                  │        │
│    │   │    Total Paid: ₱715                                        │        │
│    │   │    ✓ Ready to proceed with signing                         │        │
│    │   └────────────────────────────────────────────────────────────┘        │
│    │                                │                           │            │
│    ├─── Present documents ──────────┤                           │            │
│    │    (one at a time, in order)   │                           │            │
│    │                                │                           │            │
│    │   ┌────────────────────────────────────────────────────────────┐        │
│    │   │ 📄 Document 1: Deed of Absolute Sale                       │        │
│    │   │                                                            │        │
│    │   │ [View Full Document]  [Download PDF]                       │        │
│    │   │                                                            │        │
│    │   │ Signing order:                                             │        │
│    │   │ 1. Juan Santos (Principal) - Pending                       │        │
│    │   │ 2. Maria Cruz (Witness) - Pending                          │        │
│    │   │ 3. Pedro Santos (Witness) - Pending                        │        │
│    │   │ 4. Atty. Maria Santos (ENP) - Pending                      │        │
│    │   └────────────────────────────────────────────────────────────┘        │
│    │                                │                           │            │
│    │◄─── Principal signs ───────────┤                           │            │
│    │                                │                           │            │
│    │◄───────────────────── Witnesses sign ──────────────────────┤            │
│    │                                │                           │            │
│    ├─── ENP affixes notarial seal ──┤                           │            │
│    │                                │                           │            │
│    ├─── Repeat for each document ───┤                           │            │
│    │    (Doc 2, Doc 3, etc.)        │                           │            │
│    │                                │                           │            │
│    ├─── All documents signed ───────┼───────────────────────────┤            │
│    │    Recording saved (if enabled)│                           │            │
│    │    Documents distributed       │                           │            │
│    │                                │                           │            │
└────┴────────────────────────────────┴───────────────────────────┴────────────┘
```

### 7.3 IEN Session Specifics

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   IEN SESSION DIFFERENCES                                       │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Same flow as REN, but:                                │   │
│   │                                                         │   │
│   │   📍 Location:                                          │   │
│   │      • All parties physically at ENP's location         │   │
│   │      • Or at pre-arranged meeting place                 │   │
│   │                                                         │   │
│   │   📱 Liveness:                                          │   │
│   │      • Done on ENP's device                             │   │
│   │      • Each person takes turn                           │   │
│   │                                                         │   │
│   │   ✍️ Signing:                                           │   │
│   │      • On ENP's tablet/device                           │   │
│   │      • Or on principal's device if available            │   │
│   │                                                         │   │
│   │   💵 Payment:                                           │   │
│   │      • Can pay CASH                                     │   │
│   │      • ENP clicks [✓ Client Paid Cash] button           │   │
│   │      • Or pay digitally (same as REN)                   │   │
│   │                                                         │   │
│   │   📹 Recording:                                         │   │
│   │      • Still recorded (device camera)                   │   │
│   │      • Shows physical presence of all parties           │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 HYBRID Session Specifics

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   HYBRID SESSION EXAMPLE                                        │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Scenario: OFW at Philippine Embassy + Family in PH    │   │
│   │                                                         │   │
│   │   ┌───────────────────────────────────────────────────┐ │   │
│   │   │                                                   │ │   │
│   │   │   🏢 EMBASSY (Saudi Arabia)     🏠 PHILIPPINES    │ │   │
│   │   │                                                   │ │   │
│   │   │   👤 Juan (Principal)           👤 Maria (Wife)   │ │   │
│   │   │      IN-PERSON at embassy          REMOTE         │ │   │
│   │   │                                                   │ │   │
│   │   │   Geolocation: Embassy GPS     Geolocation: PH    │ │   │
│   │   │   verified                     verified           │ │   │
│   │   │                                                   │ │   │
│   │   │              🎥 VIDEO CALL CONNECTION             │ │   │
│   │   │                      │                            │ │   │
│   │   │                      ▼                            │ │   │
│   │   │                  👤 ENP                           │ │   │
│   │   │                  REMOTE (PH)                      │ │   │
│   │   │                                                   │ │   │
│   │   └───────────────────────────────────────────────────┘ │   │
│   │                                                         │   │
│   │   ⚠️ ENP may request camera pan to verify physical      │   │
│   │      environment at embassy location                    │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 8: Post-Session

### 8.1 Document Distribution

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   POST-SESSION: DOCUMENT DISTRIBUTION                           │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   After session completion:                             │   │
│   │                                                         │   │
│   │   1. Principal receives:                                │   │
│   │      • Notarized document (PDF with digital seal)       │   │
│   │      • Receipt/proof of notarization                    │   │
│   │      • Access to session recording (optional)           │   │
│   │                                                         │   │
│   │   2. ENP records:                                       │   │
│   │      • Entry added to notarial book (automatic)         │   │
│   │      • Copy of notarized document                       │   │
│   │      • Session recording stored per SC rules            │   │
│   │                                                         │   │
│   │   3. Witnesses receive:                                 │   │
│   │      • Confirmation email                               │   │
│   │      • Copy of notarized document (if requested)        │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Notarial Book Entry (Per SC Rules)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   NOTARIAL BOOK ENTRY (Auto-generated)                          │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Required fields per A.M. No. 24-10-14-SC:             │   │
│   │                                                         │   │
│   │   ┌─────────────────────────────────────────────────┐   │   │
│   │   │                                                 │   │   │
│   │   │   Entry Number: 2024-001234                     │   │   │
│   │   │   Date & Time: January 15, 2024, 2:30 PM        │   │   │
│   │   │                                                 │   │   │
│   │   │   Document Type: Deed of Absolute Sale          │   │   │
│   │   │   Document Date: January 15, 2024               │   │   │
│   │   │                                                 │   │   │
│   │   │   Principal(s):                                 │   │   │
│   │   │   • Juan Santos (ID: PSA-123456)                │   │   │
│   │   │                                                 │   │   │
│   │   │   Witness(es):                                  │   │   │
│   │   │   • Maria Cruz (ID: DL-789012)                  │   │   │
│   │   │   • Pedro Santos (ID: PP-345678)                │   │   │
│   │   │                                                 │   │   │
│   │   │   Session Mode: REN                             │   │   │
│   │   │   Verification: Liveness + Geolocation ✓        │   │   │
│   │   │                                                 │   │   │
│   │   │   Notarial Fee: ₱500                            │   │   │
│   │   │   Doc Control #: NC-2024-001234                 │   │   │
│   │   │                                                 │   │   │
│   │   │   Recording ID: REC-2024-001234                 │   │   │
│   │   │   Storage Location: [Secure Cloud]              │   │   │
│   │   │                                                 │   │   │
│   │   └─────────────────────────────────────────────────┘   │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Messaging → Session Upgrade

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   UPGRADING A CHAT TO A SESSION                                 │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   During a /messages conversation:                      │   │
│   │                                                         │   │
│   │   1. Either party clicks [📅 Request Session]           │   │
│   │                                                         │   │
│   │   2. Requester fills in:                                │   │
│   │      • Session type (Consultation/Notarization)         │   │
│   │      • Mode (REN/IEN/Hybrid)                            │   │
│   │      • Preferred date/time                              │   │
│   │                                                         │   │
│   │   3. Other party receives notification in chat:         │   │
│   │                                                         │   │
│   │      ┌──────────────────────────────────────────────┐   │   │
│   │      │ 📅 Session Request                           │   │   │
│   │      │                                              │   │   │
│   │      │ Juan requests a Notarization (REN)           │   │   │
│   │      │ January 20, 2024 at 3:00 PM                  │   │   │
│   │      │                                              │   │   │
│   │      │ [Accept] [Suggest Another Time] [Decline]    │   │   │
│   │      └──────────────────────────────────────────────┘   │   │
│   │                                                         │   │
│   │   4. Once accepted → Session created                    │   │
│   │      • Appears in both parties' calendars               │   │
│   │      • Chat history preserved for reference             │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Checks Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   SECURITY CHECKS AT EACH STAGE                                 │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   REGISTRATION:                                         │   │
│   │   • Email verification                                  │   │
│   │   • Phone verification (optional)                       │   │
│   │                                                         │   │
│   │   KYC (one-time, to access system):                     │   │
│   │   • Government ID upload + validation                   │   │
│   │   • Face matching (ID photo vs selfie)                  │   │
│   │   • Required for ALL users                              │   │
│   │                                                         │   │
│   │   BOOKING:                                              │   │
│   │   • KYC must be complete                                │   │
│   │   • ENP availability verified                           │   │
│   │                                                         │   │
│   │   PRE-SESSION:                                          │   │
│   │   • All participants KYC verified                       │   │
│   │   • All witnesses registered and KYC verified           │   │
│   │   • Documents reviewed, locked, and PAID                │   │
│   │   • Liveness check (each participant)                   │   │
│   │   • Geolocation check (PH or embassy)                   │   │
│   │   • VPN detection and blocking                          │   │
│   │                                                         │   │
│   │   DURING SESSION:                                       │   │
│   │   • All participants already verified (pre-session)     │   │
│   │   • Session recording (optional)                        │   │
│   │   • Audit logging of all actions                        │   │
│   │                                                         │   │
│   │   POST-SESSION:                                         │   │
│   │   • Digital signatures verified                         │   │
│   │   • Document hash stored for integrity                  │   │
│   │   • Recording stored per SC requirements                │   │
│   │   • Notarial book entry created                         │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Default Fee Schedule

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   DEFAULT NOTARIAL FEES (ENP can customize)                     │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Base Fees:                                            │   │
│   │   • Acknowledgment: ₱500                                │   │
│   │   • Affidavit: ₱500                                     │   │
│   │   • Deed of Sale: ₱500                                  │   │
│   │   • Special Power of Attorney: ₱500                     │   │
│   │   • General Power of Attorney: ₱500                     │   │
│   │   • Other documents: ₱500                               │   │
│   │                                                         │   │
│   │   Additional Fees:                                      │   │
│   │   • Per additional page: ₱50                            │   │
│   │   • Per additional signatory: ₱100                      │   │
│   │                                                         │   │
│   │   Consultation Rate:                                    │   │
│   │   • Per 30 minutes: ₱500 (ENP sets own rate)            │   │
│   │                                                         │   │
│   │   ──────────────────────────────────────────────        │   │
│   │                                                         │   │
│   │   Platform Fee: 10% of total (deducted automatically)   │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Simplified Navigation

### Before (Confusing)

```
❌  Multiple overlapping pages:
    /find-a-lawyer
    /book
    /consultations
    /requests
    /appointments
    /notarizations
    /meetings
    /calendar
```

### After (Clear)

```
✅  Unified structure:

    CLIENT:
    ├── /dashboard ............ Overview + upcoming sessions
    ├── /browse ............... Find ENPs (Browse & Select / Quick Match)
    ├── /sessions ............. All my sessions (past & upcoming)
    ├── /documents ............ My notarized documents
    └── /messages ............. Chat with ENPs

    ENP:
    ├── /dashboard ............ Overview + today's sessions
    ├── /requests ............. Incoming booking requests (incl. Quick Match)
    ├── /sessions ............. All sessions
    ├── /notarial-book ........ Official records
    ├── /messages ............. Chat with clients
    └── /settings ............. Profile, rates, Quick Match preferences

    ─────────────────────────────────────────────────────────────

    🔮 FUTURE: Organization / Law Firm Support

    The /browse route is designed to be future-ready for:
    • Multi-tenant support (law firms, organizations)
    • Firm profiles with multiple ENPs
    • Organization-level booking
    • Team management dashboards
    • Firm-wide analytics and reporting

    Placeholder routes (not yet implemented):
    ├── /org/[org-id] ......... Organization profile
    ├── /org/[org-id]/enps .... Browse ENPs in organization
    └── /firm-admin ........... Firm management dashboard
```

---

## Summary: User Journey

| Step            | Principal (Client)                                | ENP (Notary)                                                  |
| --------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| 1. Register     | Create account, verify email, complete KYC        | Create account, verify credentials with SC                    |
| 2. Find ENP     | /browse → Browse & Select / Quick Match / Message | Set availability, Quick Match preferences                     |
| 3. Book         | Select date/time, mode, service type              | Accept/reject/reschedule requests                             |
| 4. Prepare      | Upload documents, invite witnesses                | Review documents, prepare session                             |
| 5. Session      | Join video, pass liveness, sign documents, pay    | Conduct session, verify identities, notarize, collect payment |
| 6. Post-session | Download notarized docs, leave review             | Entry auto-added to notarial book, receive 90% of fee         |

---

## Resolved Questions

| Question                   | Answer                                                                                                                                                                                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Can ENP unlock documents?  | Yes, but requires client to RE-APPROVE all documents                                                                                                                                                                                                             |
| IEN cash payment tracking? | ENP clicks [✓ Client Paid Cash] button to confirm                                                                                                                                                                                                                |
| Max witnesses?             | No limit                                                                                                                                                                                                                                                         |
| Witness fees?              | None — covered by principal's fee                                                                                                                                                                                                                                |
| HYBRID ENP location?       | Can be remote (e.g., OFW at embassy, ENP may request camera pan for manual verification)                                                                                                                                                                         |
| Quick Match algorithm?     | Bidirectional scoring: ENP score (rating, speed, experience, specialization, workload) + Principal score (verification, reliability, history). Includes boosts for new/returning ENPs and penalties for excessive declines. See "Quick Match Algorithm" section. |
| Quick Match fairness?      | Workload balancer ensures even distribution. ENPs can opt-out without penalty. Clients have 2 re-matches then 10-min cooldown. ENP decline penalty: -5% to -10% score for 3-5+ declines in 24 hours.                                                             |

---

## Open Questions

1. **Cancellation policy** — What happens if client/ENP cancels? Refunds?
2. **Rescheduling limits** — How many times can a session be rescheduled?
3. **Embassy/Consular list** — Do we need a predefined list of valid embassy/consular locations for geolocation?

---

_Document Version: 2.0_
_Last Updated: January 2026_
_Author: Quanby Legal Product Team_
