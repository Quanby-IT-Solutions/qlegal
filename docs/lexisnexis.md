# LexisNexis Integration

This document describes LexisNexis in the context of Quanby Sign and how it may be used for legal research, identity verification, or compliance.

## Overview

- **LexisNexis** provides legal and regulatory research, risk and identity solutions, and compliance tools used by law firms, notaries, and enterprises.
- **Typical use cases in notary/e-signing platforms:**
  - **Identity verification (IDV/KYC):** Verify signer identity (e.g. LexisNexis Risk Solutions).
  - **Legal research:** Access to primary law, case law, and secondary sources for ENPs or legal teams.
  - **Compliance and due diligence:** Sanctions screening, PEP checks, or regulatory compliance.

## Who uses LexisNexis in Quanby Sign?

- **ENPs (Electronic Notaries Public):** May use identity or compliance services when notarizing.
- **Admins / legal teams:** May use legal research or compliance tools.
- **Principals / signers:** Typically only indirectly (e.g. identity checks run by the ENP).

Restrict access to LexisNexis-backed features by role (e.g. ENP, ADMIN) as with other privileged integrations (Doconchain, Supreme Court).

## Integration options

| Area              | Description |
|-------------------|-------------|
| Identity / KYC    | Integrate LexisNexis IDV or risk APIs for signer verification before or during notarization. |
| Legal research    | Link to LexisNexis research (e.g. deep links or API) for ENP/legal users. |
| Compliance        | Use LexisNexis risk/compliance APIs for sanctions, PEP, or AML checks if required. |

## API / configuration (placeholder)

When you have concrete endpoints, keys, or flows:

- **Base URL / environment:** (e.g. sandbox vs production).
- **Authentication:** API key, OAuth, or other (store in env, never in code).
- **Required env vars:** e.g. `LEXISNEXIS_API_KEY`, `LEXISNEXIS_BASE_URL` — add to `.env.example` and `env.js` when used.
- **Rate limits and retries:** Document any limits and recommended retry/backoff.

## Security and compliance

- Treat LexisNexis API keys and tokens as secrets; use server-side only (e.g. tRPC procedures or server actions).
- Log usage for audit (who ran a check, when, outcome) without storing sensitive PII longer than needed.
- Align with LexisNexis terms of use and any data residency or retention requirements.

## Suggestions for the legal system (Quanby Sign)

Simple additions or revisions to consider when integrating LexisNexis or tightening the legal/notary side of the platform:

1. **Pre-notarization identity check (optional step)**  
   Add an optional “Verify identity” step in the session flow (e.g. before or after document upload) that calls LexisNexis IDV and records the result (e.g. verified / not verified) in the audit log or notarial record, without blocking the session if the feature is off or the check is skipped.

2. **Sanctions / PEP check before confirming appointment**  
   When an ENP confirms a booking (or before the first remote session with a principal), run a configurable sanctions/PEP check via LexisNexis and store a simple outcome (e.g. “clear” / “flag”) and timestamp. Keep the logic behind a feature flag or admin setting so it can be turned on when the org is ready.

3. **Legal research shortcut for ENPs**  
   Add a “Research” or “Look up” link or embedded widget (e.g. in the ENP dashboard or session context) that opens LexisNexis (or a deep link) so ENPs can quickly look up rules, forms, or case law without leaving the app. No API required for a first version—just a configurable URL and optional role check.

4. **Audit log fields for LexisNexis usage**  
   Extend the existing audit/action log to include optional fields such as: “LexisNexis check type” (e.g. IDV, sanctions), “outcome” (e.g. pass/fail/flagged), and “reference ID” if the provider returns one. That keeps the legal system’s use of LexisNexis traceable and reviewable.

5. **Configurable “legal compliance” section in settings**  
   Add a small “Legal & compliance” (or “Integrations – Legal”) section in admin/settings where admins can enable/disable LexisNexis-backed checks (IDV, sanctions, etc.), set which roles can run them, and optionally store a “last run” or “next review” date for simple oversight.

6. **Principal-facing consent for identity checks**  
   If LexisNexis IDV or similar checks are used on the principal, add a short consent step (e.g. checkbox or one sentence) before the check runs, and record consent and timestamp in the audit log. This keeps the legal system aligned with common data-privacy and consent expectations.

## References

- [LexisNexis](https://www.lexisnexis.com/)
- [LexisNexis Risk Solutions](https://risk.lexisnexis.com/) (identity, fraud, compliance)
