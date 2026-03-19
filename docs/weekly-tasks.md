# Weekly tasks

## Week of Mar 10–16, 2026

### Done

- **Credit usage (sub-org admin)**
  - Fixed sub-org credits “used” showing 0: derive used from total − remaining when API omits `used_credits`; prefer `total_credits` / `initial_credits` for total allocated.
  - Made credits card responsive (stack on small screens, row on sm+).
  - Invalidate credits query after transfer so the card refetches.

- **Chat area**
  - Refactored the chat area.
