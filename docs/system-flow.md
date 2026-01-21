# Quanby Sign — System Flow

> **Purpose:** This document outlines the simplified user flow for booking and completing notarization or consultation sessions.  
> **Audience:** UI/UX designers, product managers, stakeholders  
> **Last Updated:** January 21, 2026

---

## Overview

Quanby Sign is an e-notary platform for the Philippines. Users can:

- **Book a Notarization** — Get documents notarized remotely (REN), in-person (IEN), or hybrid
- **Book a Consultation** — Get legal advice from an ENP (Electronic Notary Public)

---

## Key Terms

| Term                     | Meaning                                                               |
| ------------------------ | --------------------------------------------------------------------- |
| **ENP**                  | Electronic Notary Public — the lawyer/notary providing the service    |
| **Client**               | The person booking and paying for the service                         |
| **Principal**            | The client, when referred to in a notarization context                |
| **Witness**              | A person who observes the signing and may also sign to attest         |
| **REN**                  | Remote Electronic Notarization — ALL participants join via video call |
| **IEN**                  | In-Person Electronic Notarization — ALL participants meet physically  |
| **HYBRID**               | Mixed mode — some participants remote, some in-person                 |
| **Session**              | The actual meeting (video call, in-person, or hybrid)                 |
| **Jurat**                | Document type — signer swears content is true                         |
| **Acknowledgement**      | Document type — signer acknowledges signing voluntarily               |
| **Certified Copy**       | Document type — ENP certifies copy matches original                   |
| **Oath/Affirmation**     | Document type — verbal pledge administered by ENP                     |
| **Signature Witnessing** | Document type — ENP witnesses signature only                          |
| **Notarial Book**        | Official electronic record of all notarial acts performed by an ENP   |

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
│         │   ┌─────────┐  ┌─────────┐  ┌─────────┐     │                      │
│         │   │   REN   │  │   IEN   │  │ HYBRID  │     │                      │
│         │   │ (Remote)│  │(In-Per.)│  │ (Mixed) │     │                      │
│         │   │         │  │         │  │         │     │                      │
│         │   │ Video   │  │ Meet at │  │ Some    │     │                      │
│         │   │ call    │  │ physical│  │ remote, │     │                      │
│         │   │ from    │  │ place   │  │ some    │     │                      │
│         │   │ home    │  │         │  │ in-pers │     │                      │
│         │   └─────────┘  └─────────┘  └─────────┘     │                      │
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
│         │  • Payment happens DURING session           │                      │
│         │    (after document review & lock)           │                      │
│         └─────────────────────────────────────────────┘                      │
│                              │                                               │
│                              ▼                                               │
│   ╔═══════════════════════════════════════════════════════════════════════╗  │
│   ║                        5. SESSION                                     ║  │
│   ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│         ┌─────────────────────────────────────────────┐                      │
│         │  JOINING (see "Session Modes" section       │                      │
│         │  for security checks per mode)              │                      │
│         │                                             │                      │
│         │  • REN: All join video room + security      │                      │
│         │    checks (liveness, geolocation, VPN)      │                      │
│         │                                             │                      │
│         │  • IEN: Meet at agreed location, ENP        │                      │
│         │    verifies identity in person              │                      │
│         │                                             │                      │
│         │  • HYBRID: Remote participants do REN       │                      │
│         │    checks, in-person verified physically    │                      │
│         └─────────────────────────────────────────────┘                      │
│                              │                                               │
│                              ▼                                               │
│                                                                              │
│    ┌────────────────────────────┐    ┌────────────────────────────┐          │
│    │      CONSULTATION          │    │       NOTARIZATION         │          │
│    ├────────────────────────────┤    ├────────────────────────────┤          │
│    │                            │    │                            │          │
│    │  • Client asks questions   │    │  1. Upload documents       │          │
│    │  • ENP provides advice     │    │     (by Client OR ENP)     │          │
│    │                            │    │                            │          │
│    │  • Client can upload files │    │  2. Review & approve       │          │
│    │    for ENP to review       │    │     (both parties)         │          │
│    │    (e.g., contracts,       │    │                            │          │
│    │    agreements needing      │    │  3. Invite witnesses       │          │
│    │    legal advice)           │    │     (if needed)            │          │
│    │                            │    │                            │          │
│    │  • ENP can share reference │    │  4. ENP locks documents    │          │
│    │    documents               │    │                            │          │
│    │                            │    │  5. Client pays total fee  │          │
│    │  • Recording (optional,    │    │                            │          │
│    │    with all-party consent) │    │  6. Signing process        │          │
│    │                            │    │     (Principals → Witness  │          │
│    │                            │    │      → ENP notarizes)      │          │
│    │                            │    │                            │          │
│    │                            │    │  7. Recording (optional,   │          │
│    │                            │    │     with consent)          │          │
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
│         │   • Recording available (if recorded)       │                      │
│         │   • Shared files accessible in history      │                      │
│         │                                             │                      │
│         │  For NOTARIZATION:                          │                      │
│         │   • Notarized docs finalized with:          │                      │
│         │     - Digital seal                          │                      │
│         │     - Certificate of notarization           │                      │
│         │   • Entry added to Notarial Book            │                      │
│         │   • Docs saved to blockchain (optional)     │                      │
│         │   • Client receives:                        │                      │
│         │     - Notarized documents                   │                      │
│         │     - Session recording (if recorded)       │                      │
│         │     - Official Receipt                      │                      │
│         └─────────────────────────────────────────────┘                      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Session Modes

There are three ways to conduct a notarization or consultation session:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   1. REN (Remote Electronic Notarization)                       │
│   ══════════════════════════════════════                        │
│                                                                 │
│   ALL participants join via video call.                         │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Who's remote?     EVERYONE                            │   │
│   │                                                         │   │
│   │   Security checks:                                      │   │
│   │    ✓ Liveness check (all participants)                  │   │
│   │    ✓ Geolocation check (PH/embassy/consular)            │   │
│   │    ✓ VPN detection (not allowed)                        │   │
│   │                                                         │   │
│   │   Use case:                                             │   │
│   │    • Client is abroad or in another city                │   │
│   │    • Witnesses are in different locations               │   │
│   │    • Convenient, no travel needed                       │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   2. IEN (In-Person Electronic Notarization)                    │
│   ══════════════════════════════════════════                    │
│                                                                 │
│   ALL participants meet at the same physical location.          │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Who's in-person?  EVERYONE                            │   │
│   │                                                         │   │
│   │   Security checks:                                      │   │
│   │    ✓ ENP verifies identity in person                    │   │
│   │    ✓ Physical ID inspection                             │   │
│   │    ✗ No liveness/geolocation/VPN checks needed          │   │
│   │                                                         │   │
│   │   Use case:                                             │   │
│   │    • All parties are local                              │   │
│   │    • Complex documents requiring physical presence      │   │
│   │    • Client prefers face-to-face interaction            │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   3. HYBRID (Mixed Mode)                                        │
│   ══════════════════════                                        │
│                                                                 │
│   Some participants are in-person, some join remotely.          │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Who's where?                                          │   │
│   │    • ENP: In-person (at their office/location)          │   │
│   │    • Principal: Could be either                         │   │
│   │    • Witnesses: Could be either                         │   │
│   │                                                         │   │
│   │   Security checks:                                      │   │
│   │    ✓ REMOTE participants: Full REN checks               │   │
│   │      (liveness, geolocation, VPN detection)             │   │
│   │    ✓ IN-PERSON participants: Physical verification      │   │
│   │      by ENP                                             │   │
│   │                                                         │   │
│   │   Use case:                                             │   │
│   │    • Principal with ENP, witness joins remotely         │   │
│   │    • Multiple principals in different locations         │   │
│   │    • One co-signer abroad, others local                 │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Security Check Summary by Mode

| Participant         | REN (Remote)                    | IEN (In-Person)    | HYBRID                          |
| ------------------- | ------------------------------- | ------------------ | ------------------------------- |
| **Remote users**    | Liveness + Geolocation + No VPN | N/A                | Liveness + Geolocation + No VPN |
| **In-person users** | N/A                             | Physical ID by ENP | Physical ID by ENP              |
| **ENP**             | Liveness + Geolocation + No VPN | Present physically | Present physically (usually)    |

---

## Finding an ENP

Users can find and connect with an ENP through two paths:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   PATH A: DIRECT BOOKING                                        │
│   ══════════════════════                                        │
│                                                                 │
│   User wants to book a session directly.                        │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   1. Go to /find-notary (or /book)                      │   │
│   │                                                         │   │
│   │   2. Browse available ENPs                              │   │
│   │      • Filter by: specialization, ratings,              │   │
│   │        location, language, consultation rate            │   │
│   │                                                         │   │
│   │   3. View ENP profile                                   │   │
│   │      • See qualifications, reviews, rates               │   │
│   │      • Check availability calendar                      │   │
│   │                                                         │   │
│   │   4. Select date & time slot                            │   │
│   │                                                         │   │
│   │   5. Choose session type (Consultation/Notarization)    │   │
│   │                                                         │   │
│   │   6. Choose mode (REN/IEN/Hybrid)                       │   │
│   │                                                         │   │
│   │   7. Submit booking request                             │   │
│   │                                                         │   │
│   │   8. Wait for ENP to accept/reject/reschedule           │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   PATH B: MESSAGE FIRST                                         │
│   ═════════════════════                                         │
│                                                                 │
│   User has questions or wants to discuss before booking.        │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   1. Go to /find-notary                                 │   │
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
| Know exactly what you need                  | Direct Booking   |
| Have questions before committing            | Message First    |
| Need ENP to review documents before booking | Message First    |
| Urgent notarization needed                  | Direct Booking   |
| Unsure which document type you need         | Message First    |
| Regular client with established ENP         | Either           |

---

## Payment Model

### Consultation Sessions

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ENP sets consultation rate                                    │
│   (in their profile settings, BEFORE any booking)               │
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
│   │   Payment: BEFORE session (after ENP accepts)           │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Notarization Sessions

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ENP DEFAULT FEES (set in profile settings — OPTIONAL)         │
│                                                                 │
│   ENPs can pre-set default fees per document type.              │
│   They can also set DIFFERENT rates based on who provides       │
│   the document:                                                 │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Default Notarization Fees:                            │   │
│   │                                                         │   │
│   │                              Client      ENP            │   │
│   │   Document Type              Provides    Provides       │   │
│   │   ─────────────────────────────────────────────────     │   │
│   │   • Jurat .................. ₱150       ₱250            │   │
│   │   • Acknowledgement ........ ₱200       ₱350            │   │
│   │   • Certified Copy ......... ₱100       ₱150            │   │
│   │   • Oath/Affirmation ....... ₱150       ₱200            │   │
│   │   • Signature Witnessing ... ₱100       ₱150            │   │
│   │                                                         │   │
│   │   💡 ENP-provided docs are typically more expensive     │   │
│   │      because ENP prepares the template/content          │   │
│   │                                                         │   │
│   │   These are PRE-FILLED during session but EDITABLE      │   │
│   │   (ENP can adjust per document as needed)               │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   DOCUMENT UPLOAD & FEE ASSIGNMENT (during session)             │
│                                                                 │
│   Either party can upload documents during the session:         │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   SCENARIO A: CLIENT UPLOADS DOCUMENT                   │   │
│   │                                                         │   │
│   │   1. Client uploads file                                │   │
│   │   2. ENP reviews document                               │   │
│   │   3. ENP assigns via modal:                             │   │
│   │      • Document type (Jurat, Acknowledgement, etc.)     │   │
│   │      • Fee (PRE-FILLED from "Client Provides" default)  │   │
│   │      • Tags/labels (optional)                           │   │
│   │   4. Client sees ENP's review                           │   │
│   │   5. Client marks as "Reviewed & Approved"              │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   SCENARIO B: ENP UPLOADS PREPARED DOCUMENT             │   │
│   │                                                         │   │
│   │   1. ENP uploads file via modal with REQUIRED fields:   │   │
│   │      • Document type (Jurat, Acknowledgement, etc.)     │   │
│   │      • Fee (PRE-FILLED from "ENP Provides" default)     │   │
│   │      • Tags/labels (optional)                           │   │
│   │   2. Client receives document                           │   │
│   │   3. Client reviews content                             │   │
│   │   4. Client marks as "Reviewed & Approved"              │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   DOCUMENT LOCKING                                              │
│                                                                 │
│   After ALL documents are reviewed & approved:                  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   ENP clicks [🔒 Lock Documents]                        │   │
│   │                                                         │   │
│   │   What this does:                                       │   │
│   │    ✗ No new documents can be added                      │   │
│   │    ✗ Existing documents cannot be edited                │   │
│   │    ✗ Fees cannot be changed                             │   │
│   │    ✗ Document list is frozen                            │   │
│   │                                                         │   │
│   │   ⚠️  Can ONLY lock when ALL docs are approved          │   │
│   │                                                         │   │
│   │   After locking → Payment button becomes available      │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   PAYMENT (after documents locked)                              │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Example session with 3 documents:                     │   │
│   │                                                         │   │
│   │    • Deed of Sale (Ack, Client) ........ ₱200  ✓ 🔒     │   │
│   │    • Affidavit (Jurat, ENP) ............ ₱250  ✓ 🔒     │   │
│   │    • SPA (Ack, Client) ................. ₱200  ✓ 🔒     │   │
│   │                                         ──────          │   │
│   │   Total: ₱650                                           │   │
│   │    ├── ENP receives: ₱585 (90%)                         │   │
│   │    └── Platform fee: ₱65  (10%)                         │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   PAYMENT METHODS                                       │   │
│   │                                                         │   │
│   │   For REN (Remote):                                     │   │
│   │    • Online payment only                                │   │
│   │      ┌──────────┐  ┌──────────┐                         │   │
│   │      │   Card   │  │  GCash/  │                         │   │
│   │      │    💳    │  │   Maya   │                         │   │
│   │      └──────────┘  └──────────┘                         │   │
│   │                                                         │   │
│   │   For IEN (In-Person) or HYBRID:                        │   │
│   │    • Client chooses payment method:                     │   │
│   │      ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│   │      │   Card   │  │    QR    │  │   Cash   │           │   │
│   │      │    💳    │  │    📱    │  │    💵    │           │   │
│   │      │          │  │ (GCash/  │  │  (to ENP │           │   │
│   │      │          │  │  Maya)   │  │ directly)│           │   │
│   │      └──────────┘  └──────────┘  └──────────┘           │   │
│   │                                                         │   │
│   │   ✓ All payments go through system                      │   │
│   │   ✓ Official Receipt issued for every transaction       │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Session Recording

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   RECORDING (for ALL session types)                             │
│                                                                 │
│   Recording is OPTIONAL for all sessions:                       │
│    • REN (Remote)                                               │
│    • IEN (In-Person) — if venue has recording capability        │
│    • HYBRID                                                     │
│    • Consultations                                              │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   WHO CAN START?                                        │   │
│   │    • Anyone in the session can click [🔴 Start Record]  │   │
│   │                                                         │   │
│   │   CONSENT REQUIRED:                                     │   │
│   │    • When someone starts recording, ALL parties see     │   │
│   │      a consent prompt:                                  │   │
│   │                                                         │   │
│   │      ┌────────────────────────────────────────────┐     │   │
│   │      │  🔴 Recording Request                      │     │   │
│   │      │                                            │     │   │
│   │      │  [User] wants to record this session.      │     │   │
│   │      │                                            │     │   │
│   │      │  Do you consent to being recorded?         │     │   │
│   │      │                                            │     │   │
│   │      │  [Yes, I consent]    [No, decline]         │     │   │
│   │      └────────────────────────────────────────────┘     │   │
│   │                                                         │   │
│   │    ✓ Recording ONLY starts when ALL parties consent     │   │
│   │    ✗ If anyone declines → recording does not start      │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   AFTER SESSION ENDS:                                   │   │
│   │                                                         │   │
│   │   Participants can download:                            │   │
│   │                                                         │   │
│   │    🎥 Session recording (if recorded)                   │   │
│   │                                                         │   │
│   │    📄 Notarized documents with:                         │   │
│   │       • Digital seal                                    │   │
│   │       • Certificate of notarization                     │   │
│   │                                                         │   │
│   │    🧾 Official Receipt                                  │   │
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
│  ══════════╪══════════════════════╪══════════════════════╪═══════════════    │
│            │     PHASE 1: JOIN SESSION                   │                   │
│  ══════════╪══════════════════════╪══════════════════════╪═══════════════    │
│            │                      │                      │                   │
│            │   Joins Session      │                      │                   │
│            │─────────────────────►│                      │                   │
│            │                      │   Joins Session      │                   │
│            │                      │◄─────────────────────│                   │
│            │                      │                      │                   │
│            │                      │  (Security checks    │                   │
│            │                      │   per mode — see     │                   │
│            │                      │   Session Modes)     │                   │
│            │                      │                      │                   │
│  ══════════╪══════════════════════╪══════════════════════╪═══════════════    │
│            │     PHASE 2: DOCUMENT UPLOAD & REVIEW       │                   │
│  ══════════╪══════════════════════╪══════════════════════╪═══════════════    │
│            │                      │                      │                   │
│   ┌────────┴──────────────────────┴──────────────────────┴────────┐          │
│   │                                                               │          │
│   │   SCENARIO A: Client uploads document                         │          │
│   │                                                               │          │
│   │   Client                    System                  ENP       │          │
│   │      │                         │                      │       │          │
│   │      │   Uploads document      │                      │       │          │
│   │      │────────────────────────►│                      │       │          │
│   │      │                         │   Shows document     │       │          │
│   │      │                         │─────────────────────►│       │          │
│   │      │                         │                      │       │          │
│   │      │                         │   ENP opens modal    │       │          │
│   │      │                         │   and assigns:       │       │          │
│   │      │                         │   • Doc type         │       │          │
│   │      │                         │   • Fee (pre-filled) │       │          │
│   │      │                         │   • Tags (optional)  │       │          │
│   │      │                         │◄─────────────────────│       │          │
│   │      │                         │                      │       │          │
│   │      │   Shows ENP's review    │                      │       │          │
│   │      │◄────────────────────────│                      │       │          │
│   │      │                         │                      │       │          │
│   │      │   Marks as "Approved"   │                      │       │          │
│   │      │────────────────────────►│                      │       │          │
│   │      │                         │                      │       │          │
│   └──────┴─────────────────────────┴──────────────────────┴───────┘          │
│                                                                              │
│   ┌────────┬──────────────────────┬──────────────────────┬────────┐          │
│   │                                                               │          │
│   │   SCENARIO B: ENP uploads prepared document                   │          │
│   │                                                               │          │
│   │   Client                    System                  ENP       │          │
│   │      │                         │                      │       │          │
│   │      │                         │   Opens upload modal │       │          │
│   │      │                         │   with REQUIRED:     │       │          │
│   │      │                         │   • Doc type         │       │          │
│   │      │                         │   • Fee (pre-filled) │       │          │
│   │      │                         │   • Tags (optional)  │       │          │
│   │      │                         │◄─────────────────────│       │          │
│   │      │                         │                      │       │          │
│   │      │   Shows document +      │                      │       │          │
│   │      │   details to Client     │                      │       │          │
│   │      │◄────────────────────────│                      │       │          │
│   │      │                         │                      │       │          │
│   │      │   Client reviews        │                      │       │          │
│   │      │   content carefully     │                      │       │          │
│   │      │   ....                  │                      │       │          │
│   │      │                         │                      │       │          │
│   │      │   Marks as "Approved"   │                      │       │          │
│   │      │────────────────────────►│                      │       │          │
│   │      │                         │                      │       │          │
│   └──────┴─────────────────────────┴──────────────────────┴───────┘          │
│                                                                              │
│            │                      │                      │                   │
│            │    (repeat for each document)               │                   │
│            │                      │                      │                   │
│  ══════════╪══════════════════════╪══════════════════════╪═══════════════    │
│            │     PHASE 3: INVITE WITNESSES (if needed)   │                   │
│  ══════════╪══════════════════════╪══════════════════════╪═══════════════    │
│            │                      │                      │                   │
│            │                      │  (See "Witness       │                   │
│            │                      │   Invitation" section│                   │
│            │                      │   for full flow)     │                   │
│            │                      │                      │                   │
│  ══════════╪══════════════════════╪══════════════════════╪═══════════════    │
│            │     PHASE 4: LOCK DOCUMENTS                 │                   │
│  ══════════╪══════════════════════╪══════════════════════╪═══════════════    │
│            │                      │                      │                   │
│            │                      │  All docs approved?  │                   │
│            │                      │  ┌────────────────┐  │                   │
│            │                      │  │ ✓ Doc 1       │  │                   │
│            │                      │  │ ✓ Doc 2       │  │                   │
│            │                      │  │ ✓ Doc 3       │  │                   │
│            │                      │  └────────────────┘  │                   │
│            │                      │                      │                   │
│            │                      │   ENP clicks         │                   │
│            │                      │◄─────────────────────│                   │
│            │                      │   [🔒 Lock Docs]     │                   │
│            │                      │                      │                   │
│            │   Docs are now       │                      │                   │
│            │◄─────────────────────│                      │                   │
│            │   LOCKED             │                      │                   │
│            │   (no more changes)  │                      │                   │
│            │                      │                      │                   │
│  ══════════╪══════════════════════╪══════════════════════╪═══════════════    │
│            │     PHASE 5: PAYMENT                        │                   │
│  ══════════╪══════════════════════╪══════════════════════╪═══════════════    │
│            │                      │                      │                   │
│            │   Shows total fee    │                      │                   │
│            │◄─────────────────────│                      │                   │
│            │   + payment options  │                      │                   │
│            │                      │                      │                   │
│            │   REN: Card/GCash    │                      │                   │
│            │   IEN/Hybrid:        │                      │                   │
│            │   Card/QR/Cash       │                      │                   │
│            │                      │                      │                   │
│            │   Pays ONCE          │                      │                   │
│            │─────────────────────►│                      │                   │
│            │                      │                      │                   │
│            │                      │   Payment confirmed  │                   │
│            │                      │─────────────────────►│                   │
│            │                      │                      │                   │
│  ══════════╪══════════════════════╪══════════════════════╪═══════════════    │
│            │     PHASE 6: SIGNING                        │                   │
│  ══════════╪══════════════════════╪══════════════════════╪═══════════════    │
│            │                      │                      │                   │
│            │   ┌─────────────────────────────────────┐   │                   │
│            │   │  SIGNING ORDER (strict)             │   │                   │
│            │   │                                     │   │                   │
│            │   │  1. ALL Principals sign first       │   │                   │
│            │   │     (cannot proceed until done)     │   │                   │
│            │   │              ↓                      │   │                   │
│            │   │  2. ALL Witnesses sign second       │   │                   │
│            │   │     (cannot proceed until done)     │   │                   │
│            │   │              ↓                      │   │                   │
│            │   │  3. ENP notarizes last              │   │                   │
│            │   │     (applies seal & certificate)    │   │                   │
│            │   └─────────────────────────────────────┘   │                   │
│            │                      │                      │                   │
│  ══════════╪══════════════════════╪══════════════════════╪═══════════════    │
│            │     PHASE 7: COMPLETION                     │                   │
│  ══════════╪══════════════════════╪══════════════════════╪═══════════════    │
│            │                      │                      │                   │
│            │                      │  ┌────────────────┐  │                   │
│            │                      │  │ • Docs saved   │  │                   │
│            │                      │  │ • Seal added   │  │                   │
│            │                      │  │ • Certificate  │  │                   │
│            │                      │  │   attached     │  │                   │
│            │                      │  │ • Notarial     │  │                   │
│            │                      │  │   book updated │  │                   │
│            │                      │  │ • Recording    │  │                   │
│            │                      │  │   saved        │  │                   │
│            │                      │  └────────────────┘  │                   │
│            │                      │                      │                   │
│            │  Receives:           │                      │                   │
│            │  • Notarized docs    │                      │                   │
│            │  • Recording         │                      │                   │
│            │  • Official Receipt  │                      │                   │
│            │◄─────────────────────│                      │                   │
│            │                      │                      │                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Witness Invitation & Signing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   WHEN ARE WITNESSES NEEDED?                                    │
│                                                                 │
│   Witnesses may be required for certain documents:              │
│    • Some contracts require 2 witnesses                         │
│    • Wills typically require witnesses                          │
│    • ENP may request witnesses for verification                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   WHO CAN INVITE WITNESSES?                                     │
│                                                                 │
│    • Principal (Client)                                         │
│    • ENP                                                        │
│                                                                 │
│   Both can invite witnesses during the session.                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   WITNESS INVITATION FLOW                                                    │
│                                                                              │
│   INVITER                       SYSTEM                       WITNESS         │
│      │                             │                            │            │
│      │   Clicks [+ Add Witness]    │                            │            │
│      │────────────────────────────►│                            │            │
│      │                             │                            │            │
│      │   ┌─────────────────────────────────────────┐            │            │
│      │   │ Invite Witness                          │            │            │
│      │   │                                         │            │            │
│      │   │ Email: [____________________]           │            │            │
│      │   │                                         │            │            │
│      │   │ How will they join?                     │            │            │
│      │   │  ○ Remote (via video)                   │            │            │
│      │   │  ○ In-Person (with ENP)                 │            │            │
│      │   │                                         │            │            │
│      │   │ [Send Invite]                           │            │            │
│      │   └─────────────────────────────────────────┘            │            │
│      │                             │                            │            │
│      │   Fills & submits           │                            │            │
│      │────────────────────────────►│                            │            │
│      │                             │                            │            │
│      │                             │   ┌──────────────────────┐ │            │
│      │                             │   │ Witness must have    │ │            │
│      │                             │   │ existing account     │ │            │
│      │                             │   └──────────────────────┘ │            │
│      │                             │                            │            │
│      │                             │   In-app notification      │            │
│      │                             │───────────────────────────►│            │
│      │                             │                            │            │
│      │                             │   ┌────────────────────────────────┐    │
│      │                             │   │ 📩 Witness Invitation          │    │
│      │                             │   │                                │    │
│      │                             │   │ You've been invited to         │    │
│      │                             │   │ witness a notarization         │    │
│      │                             │   │                                │    │
│      │                             │   │ Session: Deed of Sale          │    │
│      │                             │   │ ENP: Atty. Juan dela Cruz      │    │
│      │                             │   │ When: Jan 25, 2026 • 3:00 PM   │    │
│      │                             │   │ Mode: Remote                   │    │
│      │                             │   │                                │    │
│      │                             │   │ [Accept]  [Decline]            │    │
│      │                             │   └────────────────────────────────┘    │
│      │                             │                            │            │
│      │                             │   Witness accepts          │            │
│      │                             │◄───────────────────────────│            │
│      │                             │                            │            │
│      │   Notification: Witness     │                            │            │
│      │   accepted!                 │                            │            │
│      │◄────────────────────────────│                            │            │
│      │                             │                            │            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   WITNESS STATUS STATES                                         │
│                                                                 │
│   ┌────────┐   ┌────────┐   ┌────────┐                          │
│   │PENDING │──►│VERIFIED│──►│ SIGNED │                          │
│   └────────┘   └────────┘   └────────┘                          │
│       │                                                         │
│       └──────►┌────────┐                                        │
│               │REJECTED│ (witness declined)                     │
│               └────────┘                                        │
│                                                                 │
│   PENDING  → Invite sent, waiting for response                  │
│   VERIFIED → Witness accepted, identity confirmed               │
│   REJECTED → Witness declined invitation                        │
│   SIGNED   → Witness has signed the document(s)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   WITNESS SECURITY CHECKS                                       │
│                                                                 │
│   When witness joins the session:                               │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   REMOTE WITNESS (joining via video):                   │   │
│   │    ✓ Liveness check                                     │   │
│   │    ✓ Geolocation check (PH/embassy/consular)            │   │
│   │    ✓ VPN detection (not allowed)                        │   │
│   │    ✓ ID verification (government-issued)                │   │
│   │                                                         │   │
│   │   IN-PERSON WITNESS (with ENP):                         │   │
│   │    ✓ Physical ID verification by ENP                    │   │
│   │    ✓ ENP confirms identity in system                    │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   SIGNING ORDER (STRICT)                                        │
│                                                                 │
│   Documents must be signed in this exact order:                 │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   STEP 1: ALL PRINCIPALS SIGN                           │   │
│   │   ════════════════════════════                          │   │
│   │                                                         │   │
│   │   • Each principal signs all documents                  │   │
│   │   • System waits until ALL principals complete          │   │
│   │   • Cannot proceed to witnesses until done              │   │
│   │                                                         │   │
│   │           ┌─────────────┐                               │   │
│   │           │ Principal 1 │ ✓ Signed                      │   │
│   │           └─────────────┘                               │   │
│   │           ┌─────────────┐                               │   │
│   │           │ Principal 2 │ ✓ Signed                      │   │
│   │           └─────────────┘                               │   │
│   │                  ↓                                      │   │
│   │                                                         │   │
│   │   STEP 2: ALL WITNESSES SIGN                            │   │
│   │   ══════════════════════════                            │   │
│   │                                                         │   │
│   │   • Witnesses attest they saw principals sign           │   │
│   │   • System waits until ALL witnesses complete           │   │
│   │   • Cannot proceed to ENP until done                    │   │
│   │                                                         │   │
│   │           ┌─────────────┐                               │   │
│   │           │  Witness 1  │ ✓ Signed                      │   │
│   │           └─────────────┘                               │   │
│   │           ┌─────────────┐                               │   │
│   │           │  Witness 2  │ ✓ Signed                      │   │
│   │           └─────────────┘                               │   │
│   │                  ↓                                      │   │
│   │                                                         │   │
│   │   STEP 3: ENP NOTARIZES                                 │   │
│   │   ═════════════════════                                 │   │
│   │                                                         │   │
│   │   • ENP applies signature                               │   │
│   │   • ENP applies digital seal                            │   │
│   │   • ENP attaches certificate of notarization            │   │
│   │   • Entry recorded in Notarial Book                     │   │
│   │                                                         │   │
│   │           ┌─────────────┐                               │   │
│   │           │     ENP     │ ✓ Notarized                   │   │
│   │           └─────────────┘                               │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   MULTIPLE WITNESSES                                            │
│                                                                 │
│   Sessions can have multiple witnesses:                         │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Example: Contract requiring 2 witnesses               │   │
│   │                                                         │   │
│   │   Witnesses:                                            │   │
│   │    ┌───────────────────────────────────────────────┐    │   │
│   │    │ 👤 Maria Santos        Remote    ✓ VERIFIED   │    │   │
│   │    └───────────────────────────────────────────────┘    │   │
│   │    ┌───────────────────────────────────────────────┐    │   │
│   │    │ 👤 Pedro Garcia        In-Person ✓ VERIFIED   │    │   │
│   │    └───────────────────────────────────────────────┘    │   │
│   │                                                         │   │
│   │   [+ Add Another Witness]                               │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   In HYBRID mode, some witnesses can be remote while            │
│   others are in-person with the ENP.                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Document Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   DOCUMENT STATES IN A SESSION                                  │
│                                                                 │
│                      ┌──────────┐                               │
│                      │ REJECTED │ (with remarks)                │
│                      └──────────┘                               │
│                           ↑                                     │
│   ┌────────┐   ┌────────┐ │ ┌────────┐   ┌────────┐   ┌───────┐ │
│   │UPLOADED│──►│REVIEWED│─┴►│APPROVED│──►│ LOCKED │──►│ SIGNED│ │
│   └────────┘   └────────┘   └────────┘   └────────┘   └───────┘ │
│                                                                 │
│   ─────────────────────────────────────────────────────────────  │
│                                                                 │
│   UPLOADED  → Document uploaded by Client or ENP                │
│   REVIEWED  → ENP has reviewed and assigned type/fee            │
│   APPROVED  → Client has approved the document                  │
│   REJECTED  → ENP rejected document (with remarks/reason)       │
│   LOCKED    → All docs locked, ready for payment                │
│   SIGNED    → Document has been signed and notarized            │
│                                                                 │
│   ─────────────────────────────────────────────────────────────  │
│                                                                 │
│   Each document requires:                                       │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   ☐ Document Type     (Jurat / Acknowledgement / etc.)  │   │
│   │   ☐ Fee Assigned      (₱ amount set by ENP)             │   │
│   │   ☐ ENP Reviewed      (ENP marked as reviewed)          │   │
│   │   ☐ Client Approved   (Client marked as approved)       │   │
│   │   ☐ Locked            (ENP locked all documents)        │   │
│   │                                                         │   │
│   │   ═══════════════════════════════════════════════════   │   │
│   │   Payment only available after ALL docs are LOCKED      │   │
│   │   Signing only available after PAYMENT confirmed        │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   DOCUMENT REJECTION                                            │
│                                                                 │
│   ENP can reject a document if there are issues:                │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   ENP clicks [✗ Reject Document]                        │   │
│   │                                                         │   │
│   │   ┌────────────────────────────────────────────┐        │   │
│   │   │ Reject Document                            │        │   │
│   │   │                                            │        │   │
│   │   │ Reason for rejection:                      │        │   │
│   │   │ ┌────────────────────────────────────────┐ │        │   │
│   │   │ │ Document is incomplete. Missing page 3 │ │        │   │
│   │   │ │ signature block. Please upload a       │ │        │   │
│   │   │ │ complete version.                      │ │        │   │
│   │   │ └────────────────────────────────────────┘ │        │   │
│   │   │                                            │        │   │
│   │   │ [Confirm Rejection]   [Cancel]             │        │   │
│   │   └────────────────────────────────────────────┘        │   │
│   │                                                         │   │
│   │   After rejection:                                      │   │
│   │    • Document marked as REJECTED                        │   │
│   │    • Remarks visible to Client                          │   │
│   │    • Client can upload corrected version                │   │
│   │    • Rejected doc excluded from final notarization      │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Checks (REN & Hybrid Remote Participants)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   BEFORE JOINING A SESSION (for REMOTE participants)            │
│                                                                 │
│   Remote participants must pass these checks:                   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   1. LIVENESS CHECK                                     │   │
│   │      • Face verification via camera                     │   │
│   │      • Ensures real person, not photo/video             │   │
│   │      ✓ PASS → Continue                                  │   │
│   │      ✗ FAIL → Cannot join session                       │   │
│   │                                                         │   │
│   │   2. GEOLOCATION CHECK                                  │   │
│   │      • System detects user's location                   │   │
│   │      • Must be in one of:                               │   │
│   │         - Philippines 🇵🇭                                │   │
│   │         - Philippine Embassy (abroad)                   │   │
│   │         - Philippine Consular Office (abroad)           │   │
│   │      ✓ PASS → Continue                                  │   │
│   │      ✗ FAIL → Show error, cannot proceed                │   │
│   │                                                         │   │
│   │   3. VPN DETECTION                                      │   │
│   │      • System checks for VPN/proxy usage                │   │
│   │      • VPN is NOT ALLOWED                               │   │
│   │      ✓ No VPN detected → Continue                       │   │
│   │      ✗ VPN detected → Show error, must disable VPN      │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   All 3 checks must pass before entering the video room.        │
│                                                                 │
│   This applies to:                                              │
│    • ALL participants in REN sessions                           │
│    • REMOTE participants in HYBRID sessions                     │
│    • REMOTE witnesses                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Why These Checks?

| Check       | Reason                                                        |
| ----------- | ------------------------------------------------------------- |
| Liveness    | Prevent impersonation / fraud                                 |
| Geolocation | Philippine notarization law requires presence in PH territory |
| VPN         | VPN can spoof location, undermining geolocation check         |

---

## Messaging → Session Upgrade (Bidirectional)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Both Client and ENP can request a session upgrade from chat.  │
│                                                                 │
│   Use cases:                                                    │
│    • Client has questions → realizes they need formal session   │
│    • ENP sees complexity → recommends consultation/notarization │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   SCENARIO A: ENP INVITES CLIENT                                             │
│                                                                              │
│   CLIENT                         SYSTEM                         ENP         │
│      │                              │                            │          │
│      │   Sends message              │                            │          │
│      │─────────────────────────────►│                            │          │
│      │                              │   Receives message         │          │
│      │                              │───────────────────────────►│          │
│      │                              │                            │          │
│      │            ... conversation continues ...                 │          │
│      │                              │                            │          │
│      │                              │   ENP realizes this is     │          │
│      │                              │   getting complex...       │          │
│      │                              │                            │          │
│      │                              │   ENP clicks:              │          │
│      │                              │   [📩 Invite to Session]   │          │
│      │                              │◄───────────────────────────│          │
│      │                              │                            │          │
│      │   Receives invite in chat    │                            │          │
│      │◄─────────────────────────────│                            │          │
│      │                              │                            │          │
│      │   ┌────────────────────────────────────────────┐          │          │
│      │   │ 📩 Atty. Juan invited you to a session     │          │          │
│      │   │                                            │          │          │
│      │   │ Type: Notarization (REN)                   │          │          │
│      │   │ Suggested: Jan 25, 2026 • 3:00 PM          │          │          │
│      │   │                                            │          │          │
│      │   │ [Accept]  [Suggest Different Time]         │          │          │
│      │   └────────────────────────────────────────────┘          │          │
│      │                              │                            │          │
│      │   Accepts invite             │                            │          │
│      │─────────────────────────────►│                            │          │
│      │                              │                            │          │
│      │                              │   Session booked!          │          │
│      │                              │   (ENP already accepted    │          │
│      │                              │    since they initiated)   │          │
│      │                              │                            │          │
└──────┴──────────────────────────────┴────────────────────────────┴──────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   SCENARIO B: CLIENT REQUESTS SESSION                                        │
│                                                                              │
│   CLIENT                         SYSTEM                         ENP         │
│      │                              │                            │          │
│      │            ... conversation continues ...                 │          │
│      │                              │                            │          │
│      │   Client realizes they need  │                            │          │
│      │   a formal session...        │                            │          │
│      │                              │                            │          │
│      │   Client clicks:             │                            │          │
│      │   [📅 Request Session]       │                            │          │
│      │─────────────────────────────►│                            │          │
│      │                              │                            │          │
│      │   ┌────────────────────────────────────────────┐          │          │
│      │   │ Request Session                            │          │          │
│      │   │                                            │          │          │
│      │   │ What type?                                 │          │          │
│      │   │  ○ Consultation                            │          │          │
│      │   │  ○ Notarization                            │          │          │
│      │   │                                            │          │          │
│      │   │ Mode: REN / IEN / Hybrid                   │          │          │
│      │   │                                            │          │          │
│      │   │ Preferred time?                            │          │          │
│      │   │ [____________]                             │          │          │
│      │   │                                            │          │          │
│      │   │ [Send Request]                             │          │          │
│      │   └────────────────────────────────────────────┘          │          │
│      │                              │                            │          │
│      │                              │   ENP receives request     │          │
│      │                              │───────────────────────────►│          │
│      │                              │                            │          │
│      │                              │   ┌────────────────────────────────┐  │
│      │                              │   │ 📅 Session Request             │  │
│      │                              │   │                                │  │
│      │                              │   │ Juan Santos requested a        │  │
│      │                              │   │ Consultation (REN)             │  │
│      │                              │   │                                │  │
│      │                              │   │ Preferred: Jan 26 • 2:00 PM    │  │
│      │                              │   │                                │  │
│      │                              │   │ [Accept] [Reject] [Reschedule] │  │
│      │                              │   └────────────────────────────────┘  │
│      │                              │                            │          │
│      │                              │   ENP accepts              │          │
│      │                              │◄───────────────────────────│          │
│      │                              │                            │          │
│      │   Request accepted!          │                            │          │
│      │◄─────────────────────────────│                            │          │
│      │                              │                            │          │
│      │                              │   (If Consultation:        │          │
│      │                              │    Client pays upfront)    │          │
│      │                              │                            │          │
└──────┴──────────────────────────────┴────────────────────────────┴──────────┘
```

### Key Points

- **Bidirectional** — Either party can initiate session upgrade
- **Pre-filled details** — Initiator sets session type, mode, and suggested time
- **Other party responds** — Accept, reject, or suggest different time
- **Streamlined** — Skips the "find ENP" step since they're already talking
- **Context preserved** — Chat history is linked to the session for reference

---

## Notarial Book Requirements

Per Philippine Supreme Court Rules on Electronic Notarial Practice (Section 2), each entry in the Electronic Notarial Book must contain:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   REQUIRED FIELDS FOR EACH NOTARIAL ACT                         │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   i.   Electronic notarial act type                     │   │
│   │        (Jurat, Acknowledgement, Oath, etc.)             │   │
│   │                                                         │   │
│   │   ii.  Date and time of the notarial act                │   │
│   │                                                         │   │
│   │   iii. Title/description of notarized document          │   │
│   │                                                         │   │
│   │   iv.  Name and address of each principal               │   │
│   │                                                         │   │
│   │   v.   Name and address of each witness (if any)        │   │
│   │                                                         │   │
│   │   vi.  Competent evidence of identity                   │   │
│   │        (for principals and witnesses)                   │   │
│   │        - Government-issued ID type                      │   │
│   │        - ID number                                      │   │
│   │                                                         │   │
│   │   vii. Fee charged for the notarial act                 │   │
│   │                                                         │   │
│   │   viii. Location statement:                             │   │
│   │         "All parties were situated within the           │   │
│   │          Philippines / Philippine Embassy /             │   │
│   │          Consular Office / Honorary Consul Office"      │   │
│   │                                                         │   │
│   │   ix.  Mode of notarization: REN / IEN / HYBRID         │   │
│   │                                                         │   │
│   │   x.   Any other significant circumstances              │   │
│   │        (as deemed by the ENP)                           │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   INCOMPLETE / REJECTED NOTARIAL ACTS                           │
│                                                                 │
│   When a notarial act is NOT completed, ENP must record:        │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   • Reason for non-completion                           │   │
│   │   • Circumstances leading to rejection                  │   │
│   │   • Remarks / notes                                     │   │
│   │                                                         │   │
│   │   Examples:                                             │   │
│   │    - "Principal failed liveness verification"           │   │
│   │    - "Document incomplete - missing signatures"         │   │
│   │    - "Principal outside valid jurisdiction (VPN)"       │   │
│   │    - "Witness declined to participate"                  │   │
│   │    - "Payment not completed"                            │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   INSPECTION / COPY REQUESTS                                    │
│                                                                 │
│   When someone requests to inspect or copy an entry:            │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   Record in Notarial Book:                              │   │
│   │                                                         │   │
│   │   • Requesting party's name                             │   │
│   │   • Requesting party's address                          │   │
│   │   • Requesting party's electronic signature             │   │
│   │   • Competent evidence of identity                      │   │
│   │   • Stated lawful purpose for the request               │   │
│   │                                                         │   │
│   │   If request is REFUSED, also record:                   │   │
│   │   • Reasons for refusal                                 │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   CERTIFICATE NUMBERING                                         │
│                                                                 │
│   The entry number in the Notarial Book must correspond         │
│   to the certificate number on each notarized document.         │
│                                                                 │
│   Format example: 2026-00001, 2026-00002, etc.                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Notarial Book Entry Summary Table

| Field                 | Required | Description                                   |
| --------------------- | -------- | --------------------------------------------- |
| Act Type              | ✓        | Jurat, Acknowledgement, Oath, etc.            |
| Date & Time           | ✓        | Exact timestamp of execution                  |
| Document Title        | ✓        | Description of what was notarized             |
| Principal Name(s)     | ✓        | Full legal name of each principal             |
| Principal Address(es) | ✓        | Residential address of each principal         |
| Principal ID(s)       | ✓        | Government ID type + number for each          |
| Witness Name(s)       | If any   | Full legal name of each witness               |
| Witness Address(es)   | If any   | Residential address of each witness           |
| Witness ID(s)         | If any   | Government ID type + number for each          |
| Fee Charged           | ✓        | Amount in PHP                                 |
| Location Statement    | ✓        | Confirms PH / Embassy / Consular jurisdiction |
| Mode                  | ✓        | REN / IEN / HYBRID                            |
| Certificate Number    | ✓        | Unique number matching the document           |
| Other Circumstances   | Optional | Any significant notes by ENP                  |
| Rejection Reason      | If N/A   | Why notarial act was not completed            |
| Rejection Remarks     | If N/A   | Additional context for non-completion         |

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
│  │  Consultation (HYBRID) with Atty. Maria Santos           │   │
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
│  │  Notarization (HYBRID) • Juan Santos                     │   │
│  │  Requested: Jan 26, 2026 • 3:00 PM                       │   │
│  │  [Accept]  [Reject]  [Reschedule]                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Today's Sessions                                        │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  ⏰ 2:00 PM — Notarization (REN)                         │   │
│  │  Client: Maria Garcia                                    │   │
│  │  Witnesses: 2 confirmed                                  │   │
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
    /find-notary
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
    ├── /documents ............ My notarized documents
    └── /messages ............. Chat with ENPs

    ENP:
    ├── /dashboard ............ Overview + today's sessions
    ├── /requests ............. Incoming booking requests
    ├── /sessions ............. All sessions
    ├── /notarial-book ........ Official records
    ├── /messages ............. Chat with clients
    └── /settings ............. Profile, rates, availability
```

---

## Summary

| Step             | Client Action                                                 | ENP Action                                                                   |
| ---------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1. Onboard       | Sign up → KYC                                                 | Sign up → KYC → Set consultation rates → Set default notarization fees       |
| 2. Find ENP      | Browse /find-notary OR message first                          | Set availability, respond to messages                                        |
| 3. Book          | Choose type → Pick slot → Submit (or request from chat)       | — (or invite from chat)                                                      |
| 4. Review        | Wait for response                                             | Accept / Reject / Reschedule                                                 |
| 5. Pay (Consult) | Pay upfront                                                   | —                                                                            |
| 6. Session       | Join → Upload/review docs → Approve → Pay (after lock) → Sign | Join → Upload/review docs → Invite witnesses → Assign fees → Lock → Notarize |
| 7. Complete      | Receive: docs (with seal + cert) + recording + OR             | Record in Notarial Book (including rejections with remarks)                  |

---

## Open Questions

1. **Cancellation policy** — What happens if client/ENP cancels? Refunds?
2. **Rescheduling limits** — How many times can a session be rescheduled?
3. **Embassy/Consular list** — Do we need a predefined list of valid embassy/consular locations for geolocation?
4. **Cash payment tracking** — For IEN cash payments, how does ENP confirm receipt in the system?
5. **Unlock documents** — Can ENP unlock documents after locking? (probably requires re-approval from client)
6. **Witness limits** — Is there a maximum number of witnesses per session?
7. **Witness fees** — Do witnesses pay anything or is it covered by the principal's fee?
8. **Hybrid ENP location** — In HYBRID mode, is ENP always in-person or can they be remote too?

---

_This document is a living draft. Please update as decisions are made._
