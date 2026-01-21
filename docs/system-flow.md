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

| Term                | Meaning                                                            |
| ------------------- | ------------------------------------------------------------------ |
| **ENP**             | Electronic Notary Public — the lawyer/notary providing the service |
| **Client**          | The person booking and paying for the service                      |
| **Principal**       | The client, when referred to in a notarization context             |
| **REN**             | Remote Electronic Notarization — done via video call               |
| **IEN**             | In-Person Electronic Notarization — done at a physical location    |
| **Session**         | The actual meeting (video call or in-person)                       |
| **Jurat**           | Document type — signer swears content is true                      |
| **Acknowledgement** | Document type — signer acknowledges signing voluntarily            |

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
│         │  JOINING                                    │                      │
│         │                                             │                      │
│         │  For REN (Remote):                          │                      │
│         │   • Both parties join video room            │                      │
│         │   • Liveness check (face verification)      │                      │
│         │   • Geolocation check (must be in PH,       │                      │
│         │     embassy, or consular office)            │                      │
│         │   • VPN detection (VPN NOT allowed)         │                      │
│         │                                             │                      │
│         │  For IEN (In-Person):                       │                      │
│         │   • Meet at the agreed location             │                      │
│         │   • ENP verifies identity in person         │                      │
│         │   • Same workflow, just no video            │                      │
│         │   • Payment still done via system           │                      │
│         │     (for Official Receipt issuance)         │                      │
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
│    │  • Anyone can start        │    │                            │          │
│    │    recording (with         │    │  2. Review & approve       │          │
│    │    all-party consent)      │    │     (both parties)         │          │
│    │                            │    │                            │          │
│    │                            │    │  3. ENP locks documents    │          │
│    │                            │    │                            │          │
│    │                            │    │  4. Client pays total fee  │          │
│    │                            │    │                            │          │
│    │                            │    │  5. Signing process        │          │
│    │                            │    │     (Client → Witness →    │          │
│    │                            │    │      ENP notarizes)        │          │
│    │                            │    │                            │          │
│    │                            │    │  6. Recording (optional,   │          │
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
│   │   For IEN (In-Person):                                  │   │
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
│   RECORDING (for REN sessions and Consultations)                │
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
│            │                      │  Creates Video Room  │                   │
│            │◄────────────────────►│◄────────────────────►│  (REN only)       │
│            │                      │                      │                   │
│            │   Liveness Check     │   Liveness Check     │                   │
│            │◄────────────────────►│◄────────────────────►│  (REN only)       │
│            │                      │                      │                   │
│            │   Geolocation +      │                      │                   │
│            │   VPN Check          │                      │  (REN only)       │
│            │◄────────────────────►│                      │                   │
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
│            │     PHASE 3: LOCK DOCUMENTS                 │                   │
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
│            │     PHASE 4: PAYMENT                        │                   │
│  ══════════╪══════════════════════╪══════════════════════╪═══════════════    │
│            │                      │                      │                   │
│            │   Shows total fee    │                      │                   │
│            │◄─────────────────────│                      │                   │
│            │   + payment options  │                      │                   │
│            │                      │                      │                   │
│            │   REN: Card/GCash    │                      │                   │
│            │   IEN: Card/QR/Cash  │                      │                   │
│            │                      │                      │                   │
│            │   Pays ONCE          │                      │                   │
│            │─────────────────────►│                      │                   │
│            │                      │                      │                   │
│            │                      │   Payment confirmed  │                   │
│            │                      │─────────────────────►│                   │
│            │                      │                      │                   │
│  ══════════╪══════════════════════╪══════════════════════╪═══════════════    │
│            │     PHASE 5: SIGNING                        │                   │
│  ══════════╪══════════════════════╪══════════════════════╪═══════════════    │
│            │                      │                      │                   │
│            │   Signs all docs     │                      │                   │
│            │─────────────────────►│                      │                   │
│            │                      │                      │                   │
│            │                      │  (Witness signs      │                   │
│            │                      │   if required)       │                   │
│            │                      │                      │                   │
│            │                      │   ENP notarizes &    │                   │
│            │                      │◄─────────────────────│                   │
│            │                      │   signs all docs     │                   │
│            │                      │                      │                   │
│  ══════════╪══════════════════════╪══════════════════════╪═══════════════    │
│            │     PHASE 6: COMPLETION                     │                   │
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

## Document Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   DOCUMENT STATES IN A SESSION                                  │
│                                                                 │
│   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌───────┐ │
│   │UPLOADED│──►│REVIEWED│──►│APPROVED│──►│ LOCKED │──►│ SIGNED│ │
│   └────────┘   └────────┘   └────────┘   └────────┘   └───────┘ │
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
│   ─────────────────────────────────────────────────────────────  │
│                                                                 │
│   DOCUMENT TYPES (examples):                                    │
│                                                                 │
│    • Jurat                                                      │
│      → Signer swears content is true                            │
│                                                                 │
│    • Acknowledgement                                            │
│      → Signer acknowledges signing voluntarily                  │
│                                                                 │
│    • Certified Copy                                             │
│      → ENP certifies copy matches original                      │
│                                                                 │
│    • Oath/Affirmation                                           │
│      → Verbal pledge administered by ENP                        │
│                                                                 │
│    • Signature Witnessing                                       │
│      → ENP witnesses signature only                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Checks (REN Only)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   BEFORE JOINING A REN SESSION                                  │
│                                                                 │
│   Principal must pass these checks:                             │
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
└─────────────────────────────────────────────────────────────────┘
```

### Why These Checks?

| Check       | Reason                                                        |
| ----------- | ------------------------------------------------------------- |
| Liveness    | Prevent impersonation / fraud                                 |
| Geolocation | Philippine notarization law requires presence in PH territory |
| VPN         | VPN can spoof location, undermining geolocation check         |

---

## Messaging → Session Upgrade (ENP-Initiated)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   SCENARIO: Client messages ENP with questions                  │
│                                                                 │
│   Sometimes a client just has a quick question via chat.        │
│   But if it gets complicated, ENP can invite them to a          │
│   formal session directly from the conversation.                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   CLIENT                         SYSTEM                         ENP         │
│      │                              │                            │          │
│      │   Sends message              │                            │          │
│      │─────────────────────────────►│                            │          │
│      │                              │   Receives message         │          │
│      │                              │───────────────────────────►│          │
│      │                              │                            │          │
│      │                              │   ENP replies              │          │
│      │                              │◄───────────────────────────│          │
│      │   Receives reply             │                            │          │
│      │◄─────────────────────────────│                            │          │
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
│      │                              │   ┌────────────────────┐   │          │
│      │                              │   │ What type?         │   │          │
│      │                              │   │                    │   │          │
│      │                              │   │ ○ Consultation     │   │          │
│      │                              │   │ ○ Notarization     │   │          │
│      │                              │   │                    │   │          │
│      │                              │   │ REN / IEN?         │   │          │
│      │                              │   │                    │   │          │
│      │                              │   │ Suggested time?    │   │          │
│      │                              │   │ [____________]     │   │          │
│      │                              │   │                    │   │          │
│      │                              │   │ [Send Invite]      │   │          │
│      │                              │   └────────────────────┘   │          │
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
│      │                              │   (skips normal booking    │          │
│      │                              │    flow since ENP already  │          │
│      │                              │    initiated)              │          │
│      │                              │                            │          │
└──────┴──────────────────────────────┴────────────────────────────┴──────────┘
```

### Key Points

- **ENP-initiated** — ENP sends the invite, so no need for ENP to "accept" again
- **Pre-filled details** — ENP sets session type, REN/IEN, and suggested time
- **Client can counter** — Client can accept or suggest a different time
- **Streamlined** — Skips the "find ENP" step since they're already talking
- **Context preserved** — Chat history is linked to the session for reference

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

| Step             | Client Action                                                 | ENP Action                                                             |
| ---------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1. Onboard       | Sign up → KYC                                                 | Sign up → KYC → Set consultation rates → Set default notarization fees |
| 2. Book          | Choose type → Find ENP → Pick slot → Submit                   | — (or ENP invites from chat)                                           |
| 3. Review        | Wait for response                                             | Accept / Reject / Reschedule                                           |
| 4. Pay (Consult) | Pay upfront                                                   | —                                                                      |
| 5. Session       | Join → Upload/review docs → Approve → Pay (after lock) → Sign | Join → Upload/review docs → Assign fees → Lock docs → Notarize         |
| 6. Complete      | Receive: docs (with seal + cert) + recording + OR             | Record in Notarial Book                                                |

---

## Open Questions

1. **Witness flow** — How do witnesses join? Invited by client or ENP?
2. **Cancellation policy** — What happens if client/ENP cancels?
3. **Rescheduling limits** — How many times can a session be rescheduled?
4. **Embassy/Consular list** — Do we need a predefined list of valid embassy/consular locations?
5. **Cash payment tracking** — For IEN cash payments, how does ENP confirm receipt in the system?
6. **Document rejection** — Can ENP reject a document? What happens then?
7. **Unlock documents** — Can ENP unlock documents after locking? (probably requires re-approval)

---

_This document is a living draft. Please update as decisions are made._
