# Quanby Sign — System Flow

> **Purpose:** This document outlines the simplified user flow for booking and completing notarization or consultation sessions.  
> **Audience:** UI/UX designers, product managers, stakeholders  
> **Last Updated:** January 21, 2026

---

## Overview

Quanby Sign is an e-notary platform for the Philippines. Users can:

- **Book a Notarization** — Get documents notarized remotely (REN) or in-person (IEN)
- **Book a Consultation** — Get legal advice from an ENP (Electronic Notary Public)

---

## Key Terms

| Term        | Meaning                                                            |
| ----------- | ------------------------------------------------------------------ |
| **ENP**     | Electronic Notary Public — the lawyer/notary providing the service |
| **Client**  | The person booking and paying for the service                      |
| **REN**     | Remote Electronic Notarization — done via video call               |
| **IEN**     | In-Person Electronic Notarization — done at a physical location    |
| **Session** | The actual meeting (video call or in-person)                       |

---

## The Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   ╔═══════════════════════════════════════════════════════════════════════╗  │
│   ║                         1. ONBOARDING                                 ║  │
│   ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│         ┌─────────────┐          ┌─────────────────────┐                     │
│         │   Sign Up   │ ───────► │   KYC Verification  │                     │
│         └─────────────┘          │   (ID + Face Match) │                     │
│                                  └─────────────────────┘                     │
│                                            │                                 │
│                                            ▼                                 │
│   ╔═══════════════════════════════════════════════════════════════════════╗  │
│   ║                          2. BOOKING                                   ║  │
│   ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│         ┌─────────────────────────────────────────────┐                      │
│         │  What do you need?                          │                      │
│         │                                             │                      │
│         │   ┌─────────────┐    ┌─────────────────┐    │                      │
│         │   │ NOTARIZATION│    │  CONSULTATION   │    │                      │
│         │   │             │    │                 │    │                      │
│         │   │ Get docs    │    │ Get legal       │    │                      │
│         │   │ notarized   │    │ advice          │    │                      │
│         │   └─────────────┘    └─────────────────┘    │                      │
│         └─────────────────────────────────────────────┘                      │
│                              │                                               │
│                              ▼                                               │
│         ┌─────────────────────────────────────────────┐                      │
│         │  How do you want to meet?                   │                      │
│         │                                             │                      │
│         │   ┌─────────────┐    ┌─────────────────┐    │                      │
│         │   │     REN     │    │      IEN        │    │                      │
│         │   │   (Remote)  │    │  (In-Person)    │    │                      │
│         │   │             │    │                 │    │                      │
│         │   │ Video call  │    │ Meet at a       │    │                      │
│         │   │ from home   │    │ physical place  │    │                      │
│         │   └─────────────┘    └─────────────────┘    │                      │
│         └─────────────────────────────────────────────┘                      │
│                              │                                               │
│                              ▼                                               │
│         ┌─────────────────────────────────────────────┐                      │
│         │  Find an ENP                                │                      │
│         │                                             │                      │
│         │  • Browse available ENPs                    │                      │
│         │  • Filter by: specialization, ratings,      │                      │
│         │    location, language, price (consultation) │                      │
│         │  • View ENP profile & availability          │                      │
│         └─────────────────────────────────────────────┘                      │
│                              │                                               │
│                              ▼                                               │
│         ┌─────────────────────────────────────────────┐                      │
│         │  Select Date & Time                         │                      │
│         │                                             │                      │
│         │  • Pick from ENP's available slots          │                      │
│         │  • Add notes (optional)                     │                      │
│         └─────────────────────────────────────────────┘                      │
│                              │                                               │
│                              ▼                                               │
│         ┌─────────────────────────────────────────────┐                      │
│         │  Submit Booking Request                     │                      │
│         └─────────────────────────────────────────────┘                      │
│                              │                                               │
│                              ▼                                               │
│   ╔═══════════════════════════════════════════════════════════════════════╗  │
│   ║                       3. ENP REVIEW                                   ║  │
│   ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│         ┌─────────────────────────────────────────────┐                      │
│         │  ENP receives notification                  │                      │
│         │                                             │                      │
│         │  ENP can:                                   │                      │
│         │   ✓ Accept                                  │                      │
│         │   ✗ Reject (with reason)                    │                      │
│         │   ↻ Reschedule (propose new time)           │                      │
│         └─────────────────────────────────────────────┘                      │
│                              │                                               │
│                              ▼                                               │
│   ╔═══════════════════════════════════════════════════════════════════════╗  │
│   ║                   4. PAYMENT (Consultation Only)                      ║  │
│   ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│         ┌─────────────────────────────────────────────┐                      │
│         │  For CONSULTATION bookings:                 │                      │
│         │                                             │                      │
│         │  • ENP's consultation fee is shown          │                      │
│         │    (set by ENP in their profile)            │                      │
│         │  • Client pays upfront                      │                      │
│         │  • Session is confirmed                     │                      │
│         │                                             │                      │
│         │  For NOTARIZATION bookings:                 │                      │
│         │                                             │                      │
│         │  • No upfront payment                       │                      │
│         │  • Proceed directly to session              │                      │
│         │  • Payment happens AFTER document upload    │                      │
│         └─────────────────────────────────────────────┘                      │
│                              │                                               │
│                              ▼                                               │
│   ╔═══════════════════════════════════════════════════════════════════════╗  │
│   ║                        5. SESSION                                     ║  │
│   ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│         ┌─────────────────────────────────────────────┐                      │
│         │  JOINING                                    │                      │
│         │                                             │                      │
│         │  For REN (Remote):                          │                      │
│         │   • Both parties join video room            │                      │
│         │   • Liveness check (face verification)      │                      │
│         │                                             │                      │
│         │  For IEN (In-Person):                       │                      │
│         │   • Meet at the agreed location             │                      │
│         │   • ENP verifies identity in person         │                      │
│         └─────────────────────────────────────────────┘                      │
│                              │                                               │
│                              ▼                                               │
│                                                                              │
│    ┌────────────────────────────┐    ┌────────────────────────────┐          │
│    │      CONSULTATION          │    │       NOTARIZATION         │          │
│    ├────────────────────────────┤    ├────────────────────────────┤          │
│    │                            │    │                            │          │
│    │  • Client asks questions   │    │  1. Client uploads docs    │          │
│    │  • ENP provides advice     │    │                            │          │
│    │  • Discussion recorded     │    │  2. ENP reviews docs       │          │
│    │    (for REN)               │    │                            │          │
│    │                            │    │  3. ENP assigns fee        │          │
│    │                            │    │     per document           │          │
│    │                            │    │     (opens modal)          │          │
│    │                            │    │                            │          │
│    │                            │    │  4. Client reviews &       │          │
│    │                            │    │     pays total fee         │          │
│    │                            │    │                            │          │
│    │                            │    │  5. Client signs docs      │          │
│    │                            │    │                            │          │
│    │                            │    │  6. Witness signs          │          │
│    │                            │    │     (if required)          │          │
│    │                            │    │                            │          │
│    │                            │    │  7. ENP notarizes &        │          │
│    │                            │    │     signs docs             │          │
│    │                            │    │                            │          │
│    │                            │    │  8. Session recorded       │          │
│    │                            │    │     (for REN)              │          │
│    └────────────────────────────┘    └────────────────────────────┘          │
│                              │                                               │
│                              ▼                                               │
│   ╔═══════════════════════════════════════════════════════════════════════╗  │
│   ║                       6. COMPLETION                                   ║  │
│   ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│         ┌─────────────────────────────────────────────┐                      │
│         │  Session ends                               │                      │
│         │                                             │                      │
│         │  For CONSULTATION:                          │                      │
│         │   • Session marked complete                 │                      │
│         │   • Recording saved (REN)                   │                      │
│         │                                             │                      │
│         │  For NOTARIZATION:                          │                      │
│         │   • Notarized docs finalized                │                      │
│         │   • Entry added to Notarial Book            │                      │
│         │   • Docs saved to blockchain (optional)     │                      │
│         │   • Client receives notarized documents     │                      │
│         └─────────────────────────────────────────────┘                      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Payment Model

### Consultation Sessions

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ENP sets consultation rate                                    │
│   (in their profile settings)                                   │
│                                                                 │
│         Example: ₱500/hour                                      │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Client books 1-hour consultation                      │   │
│   │                                                         │   │
│   │   Total: ₱500                                           │   │
│   │    ├── ENP receives: ₱450 (90%)                         │   │
│   │    └── Platform fee: ₱50  (10%)                         │   │
│   │                                                         │   │
│   │   Payment: BEFORE session                               │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Notarization Sessions

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ENP assigns fee per document                                  │
│   (during the session, after reviewing docs)                    │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Client uploads 3 documents                            │   │
│   │                                                         │   │
│   │   ENP assigns fees:                                     │   │
│   │    • Deed of Sale ............ ₱300                     │   │
│   │    • Affidavit ............... ₱200                     │   │
│   │    • Authorization Letter .... ₱150                     │   │
│   │                                                         │   │
│   │   Total: ₱650                                           │   │
│   │    ├── ENP receives: ₱585 (90%)                         │   │
│   │    └── Platform fee: ₱65  (10%)                         │   │
│   │                                                         │   │
│   │   Payment: DURING session (after fee assignment)        │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Notarization Session — Detailed Steps

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                          NOTARIZATION SESSION FLOW                           │
│                                                                              │
│   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐         │
│   │                  │   │                  │   │                  │         │
│   │      CLIENT      │   │      SYSTEM      │   │       ENP        │         │
│   │                  │   │                  │   │                  │         │
│   └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘         │
│            │                      │                      │                   │
│            │   Joins Session      │                      │                   │
│            │─────────────────────►│                      │                   │
│            │                      │                      │                   │
│            │                      │   Joins Session      │                   │
│            │                      │◄─────────────────────│                   │
│            │                      │                      │                   │
│            │                      │  Creates Video Room  │                   │
│            │◄────────────────────►│◄────────────────────►│                   │
│            │                      │                      │                   │
│            │   Liveness Check     │                      │                   │
│            │◄────────────────────►│                      │                   │
│            │                      │                      │                   │
│            │                      │   Liveness Check     │                   │
│            │                      │◄────────────────────►│                   │
│            │                      │                      │                   │
│   ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─   │
│            │                      │                      │                   │
│            │   Uploads Documents  │                      │                   │
│            │─────────────────────►│                      │                   │
│            │                      │                      │                   │
│            │                      │   Shows Documents    │                   │
│            │                      │─────────────────────►│                   │
│            │                      │                      │                   │
│            │                      │   Reviews Documents  │                   │
│            │                      │◄─────────────────────│                   │
│            │                      │                      │                   │
│            │                      │   Assigns Fee/Doc    │                   │
│            │                      │◄─────────────────────│                   │
│            │                      │   (via modal)        │                   │
│            │                      │                      │                   │
│            │   Shows Total Fee    │                      │                   │
│            │◄─────────────────────│                      │                   │
│            │                      │                      │                   │
│            │   Pays Fee           │                      │                   │
│            │─────────────────────►│                      │                   │
│            │                      │                      │                   │
│            │                      │   Payment Confirmed  │                   │
│            │                      │─────────────────────►│                   │
│            │                      │                      │                   │
│   ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─   │
│            │                      │                      │                   │
│            │   Signs Documents    │                      │                   │
│            │─────────────────────►│                      │                   │
│            │                      │                      │                   │
│            │                      │  (Witness Signs if   │                   │
│            │                      │   required)          │                   │
│            │                      │                      │                   │
│            │                      │   ENP Notarizes &    │                   │
│            │                      │◄─────────────────────│                   │
│            │                      │   Signs Documents    │                   │
│            │                      │                      │                   │
│   ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─   │
│            │                      │                      │                   │
│            │                      │  Session Ends        │                   │
│            │                      │                      │                   │
│            │                      │  ┌────────────────┐  │                   │
│            │                      │  │ • Docs saved   │  │                   │
│            │                      │  │ • Notarial     │  │                   │
│            │                      │  │   book updated │  │                   │
│            │                      │  │ • Recording    │  │                   │
│            │                      │  │   saved (REN)  │  │                   │
│            │                      │  └────────────────┘  │                   │
│            │                      │                      │                   │
│            │  Receives Notarized  │                      │                   │
│            │◄─────────────────────│                      │                   │
│            │  Documents           │                      │                   │
│            │                      │                      │                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## User Dashboards

### Client Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  MY DASHBOARD                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   UPCOMING  │  │   PENDING   │  │  COMPLETED  │              │
│  │   SESSIONS  │  │   REQUESTS  │  │   SESSIONS  │              │
│  │             │  │             │  │             │              │
│  │     2       │  │     1       │  │     15      │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Upcoming Sessions                                       │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  📅 Jan 25, 2026 • 2:00 PM                               │   │
│  │  Notarization (REN) with Atty. Juan dela Cruz            │   │
│  │  [Join Session]                                          │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  📅 Jan 28, 2026 • 10:00 AM                              │   │
│  │  Consultation (REN) with Atty. Maria Santos              │   │
│  │  [Join Session]                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [+ Book New Session]                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### ENP Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  MY DASHBOARD                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   TODAY'S   │  │   PENDING   │  │  THIS MONTH │              │
│  │   SESSIONS  │  │   REQUESTS  │  │   EARNINGS  │              │
│  │             │  │             │  │             │              │
│  │     3       │  │     5       │  │   ₱12,500   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Pending Requests                              [View All] │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  🔔 New Request                                          │   │
│  │  Notarization (REN) • Juan Santos                        │   │
│  │  Requested: Jan 26, 2026 • 3:00 PM                       │   │
│  │  [Accept]  [Reject]  [Reschedule]                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Today's Sessions                                        │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  ⏰ 2:00 PM — Notarization (REN)                         │   │
│  │  Client: Maria Garcia                                    │   │
│  │  [Start Session]                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Simplified Navigation

### Before (Confusing)

```
❌  Multiple overlapping pages:
    /find-a-lawyer
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
    ├── /book ................. Start new booking (unified)
    ├── /sessions ............. All my sessions (past & upcoming)
    └── /documents ............ My notarized documents

    ENP:
    ├── /dashboard ............ Overview + today's sessions
    ├── /requests ............. Incoming booking requests
    ├── /sessions ............. All sessions
    ├── /notarial-book ........ Official records
    └── /settings ............. Profile, rates, availability
```

---

## Summary

| Step             | Client Action                               | ENP Action                             |
| ---------------- | ------------------------------------------- | -------------------------------------- |
| 1. Onboard       | Sign up → KYC                               | Sign up → KYC → Set rates              |
| 2. Book          | Choose type → Find ENP → Pick slot → Submit | —                                      |
| 3. Review        | Wait for response                           | Accept / Reject / Reschedule           |
| 4. Pay (Consult) | Pay upfront                                 | —                                      |
| 5. Session       | Join → Upload docs (notarization) → Sign    | Join → Review → Assign fees → Notarize |
| 6. Complete      | Receive documents                           | Record in Notarial Book                |

---

## Open Questions

1. **Witness flow** — How do witnesses join? Invited by client or ENP?
2. **Cancellation policy** — What happens if client/ENP cancels?
3. **Rescheduling limits** — How many times can a session be rescheduled?
4. **Document types** — Do we need a predefined list of document types with suggested fees?
5. **Payment methods** — GCash, bank transfer, credit card?
6. **IEN location** — Does the ENP have a fixed office, or can they meet anywhere?

---

_This document is a living draft. Please update as decisions are made._
