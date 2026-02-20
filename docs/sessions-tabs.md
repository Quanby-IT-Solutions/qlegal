# Sessions page: Ongoing vs Upcoming vs Past

This doc explains when meetings and appointments appear in each tab.

## Tabs and data sources

| Tab       | Component                 | Data source |
|----------|---------------------------|-------------|
| **Ongoing**  | `MeetingsListSection`     | `getUserMeetingsWithDocumentStats` (meetings where you are an **ACCEPTED** participant) |
| **Upcoming** | `ActiveNotarizationsSection` | Same list **plus** `getUpcomingAppointments` (your PENDING/CONFIRMED appointments) |
| **Past**     | `HistoryNotarizationsSection` | Historical / completed sessions |

## When something shows in **Ongoing**

- The item is a **meeting** (row in `meeting` table with a linked appointment).
- You are an **ACCEPTED** participant on that meeting’s appointment (`appointment_participant.status = 'ACCEPTED'`).
- **Date filter:** meeting’s `createdAt` is **today** (same calendar day).
- **Status filter:** appointment status is not COMPLETED or CANCELLED.

So: **Ongoing = “today’s” meetings you’re accepted into** (ready to Start / Join).

## When something shows in **Upcoming**

- **From meetings:** Same source as Ongoing, but the date filter is **today or in the future** (not “today only”). So meetings that are today or later and not fully signed appear here as well.
- **From appointments:** `getUpcomingAppointments` returns appointments where:
  - You are a participant (any status),
  - `appointmentDate >= now`,
  - Status is **PENDING** or **CONFIRMED**.

So: **Upcoming = today + future meetings you’re in, plus your pending/confirmed appointments** (including ones that don’t have a meeting yet).

## Why the same meeting can appear in both

- If a meeting’s date is **today**, it can appear in **Ongoing** (today-only filter) and also in **Upcoming** (today-or-future). That’s intentional: Ongoing is “ready to run now,” Upcoming is “scheduled for now or later.”

## Principal vs ENP

- **Principal (who booked):** They become a participant with status **PENDING**. When the **ENP accepts** the booking, the backend sets all PENDING participants to **ACCEPTED**. After that, the principal sees the meeting in **Ongoing** (if it’s today) and **Upcoming** like the ENP.
- **ENP:** They are the appointment owner and HOST, already ACCEPTED. They see the meeting as soon as it’s created (on confirm for REN).
- **Title:** The list shows a **role-aware title**. For the principal, it’s the appointment title (e.g. “Notarization with [ENP name]”). For the ENP, it’s “Notarization with [principal name]” so the ENP doesn’t see “with myself.”

## If the principal doesn’t see the meeting after the ENP accepts

- Confirm the principal’s participant row was set to **ACCEPTED** when the ENP confirmed (see `confirmAppointment` in `features/appointments/api/appointments.router.ts`).
- The meeting is only created for **remote (REN)** appointments on confirm. **In-person (IEN)** appointments don’t get a meeting row, so they won’t appear in the video Sessions list.
- The principal may need to **refresh** the Sessions page or wait for the next refetch to see the new meeting.
