# Find a Lawyer Feature

This feature allows users to browse and connect with verified Electronic Notary Public (ENP) professionals, and book appointments with them.

## Overview

The "Find a Lawyer" page displays all users with the ENP role (lawyers/signers) in an easy-to-browse interface with search capabilities and appointment booking functionality.

## User Roles

- **ENP (Electronic Notary Public)** - Lawyers/Signers who appear on this page
- **PRINCIPAL** - Clients/Requesters who can search for lawyers and book appointments
- **Witness** - Witnesses for notarization
- **ENA** - Authorized Representatives of the Supreme Court
- **ENF** - Quanby Sign administrators
- **REM** - Remote Electronic (Online Signing)
- **EIN** - In-Person signing

## File Structure

```
features/lawyers/
├── api/
│   ├── index.ts                        # API exports
│   ├── appointments.router.ts         # tRPC router for appointments
│   ├── appointments.schema.ts         # Appointment validation schemas
│   ├── lawyers.router.ts              # tRPC router for lawyers
│   └── lawyers.schema.ts              # Lawyer validation schemas
└── components/
    ├── index.ts                        # Component exports
    ├── appointment-booking-dialog.tsx # Appointment booking modal
    ├── lawyer-card.tsx                # Individual lawyer card component
    └── lawyers-page.tsx               # Main lawyers listing page

services/drizzle/schema/
├── appointments.ts                     # Appointments table schema

app/(site)/find-a-lawyer/
└── page.tsx                            # Route page
```

## Appointment Booking System

### Database Schema

The appointments table includes:

- `clientId` - User who books the appointment (PRINCIPAL)
- `lawyerId` - Lawyer (ENP) with whom appointment is booked
- `type` - DOCUMENT_SIGNING or CONSULTATION
- `status` - PENDING, CONFIRMED, CANCELLED, or COMPLETED
- `appointmentDate` - Date and time of appointment
- `duration` - Duration in minutes (default: 60)
- `notes` - Optional notes from client
- `location` - For in-person appointments
- `meetingLink` - For remote appointments
- `cancelReason` - Reason for cancellation

### Appointment Types

1. **DOCUMENT_SIGNING** - For notarizing and signing documents
2. **CONSULTATION** - For general legal consultation

### Appointment Status Flow

1. **PENDING** - Initial state when client books appointment
2. **CONFIRMED** - Lawyer confirms the appointment
3. **CANCELLED** - Either party cancels (with reason)
4. **COMPLETED** - Appointment finished successfully

## API Endpoints

### Lawyers Endpoints

#### `lawyers.getLawyers`

- **Type**: Public Query
- **Purpose**: Fetch all lawyers with optional search filtering
- **Input**:
  - `query` (optional): Search term for name, email, or phone
  - `limit` (optional): Number of results (default: 50, max: 100)
  - `offset` (optional): Pagination offset (default: 0)
- **Returns**: Array of lawyer profiles

#### `lawyers.getLawyerById`

- **Type**: Public Query
- **Purpose**: Fetch a specific lawyer by ID
- **Input**: `lawyerId` (required)
- **Returns**: Lawyer profile or null

#### `lawyers.getLawyersCount`

- **Type**: Public Query
- **Purpose**: Get total count of lawyers
- **Returns**: Number of lawyers

### Appointments Endpoints

#### `appointments.createAppointment`

- **Type**: Protected Mutation
- **Purpose**: Book new appointment with a lawyer
- **Input**:
  - `lawyerId` (required)
  - `type` (required): DOCUMENT_SIGNING or CONSULTATION
  - `appointmentDate` (required): Date object
  - `duration` (optional): Minutes (default: 60)
  - `notes` (optional): Additional information
  - `location` (optional): Physical location
  - `meetingLink` (optional): Online meeting link
- **Returns**: Created appointment

#### `appointments.getMyAppointments`

- **Type**: Protected Query
- **Purpose**: Get user's appointments (both as client and lawyer)
- **Input**:
  - `status` (optional): Filter by status
  - `type` (optional): Filter by type
  - `lawyerId` (optional): Filter by lawyer
  - `limit` (optional): Results limit (default: 20)
  - `offset` (optional): Pagination offset
- **Returns**: Array of appointments with client/lawyer details

#### `appointments.getAppointmentById`

- **Type**: Protected Query
- **Purpose**: Get specific appointment details
- **Input**: `appointmentId` (required)
- **Returns**: Appointment with full details

#### `appointments.confirmAppointment`

- **Type**: Protected Mutation (Lawyer only)
- **Purpose**: Confirm a pending appointment
- **Input**:
  - `appointmentId` (required)
  - `meetingLink` (optional): Add/update meeting link
- **Returns**: Updated appointment

#### `appointments.cancelAppointment`

- **Type**: Protected Mutation
- **Purpose**: Cancel an appointment
- **Input**:
  - `appointmentId` (required)
  - `cancelReason` (required)
- **Returns**: Updated appointment

#### `appointments.getUpcomingAppointments`

- **Type**: Protected Query
- **Purpose**: Get upcoming appointments for current user
- **Returns**: Next 10 upcoming appointments

## Features

### Lawyer Directory

- ✅ Search lawyers by name, email, or phone number
- ✅ Grid and list view modes
- ✅ Verified badge for email-verified lawyers
- ✅ Contact via email directly
- ✅ Responsive design
- ✅ Loading skeletons
- ✅ Empty state handling
- ✅ Real-time search filtering

### Appointment Booking

- ✅ Book appointments directly from lawyer cards
- ✅ Choose appointment type (Signing or Consultation)
- ✅ Date picker with future dates only
- ✅ Time selection
- ✅ Duration options (30 min - 2 hours)
- ✅ Optional location for in-person meetings
- ✅ Optional notes field
- ✅ Real-time validation
- ✅ Success/error notifications

## Usage

### For Clients (PRINCIPAL Role)

1. Navigate to `/find-a-lawyer`
2. Browse or search for lawyers
3. Click "Book" button on lawyer card
4. Fill in appointment details:
   - Select appointment type
   - Choose date and time
   - Set duration
   - Add location (if in-person)
   - Add any notes
5. Submit to create appointment
6. Wait for lawyer to confirm

### For Lawyers (ENP Role)

1. Receive appointment requests
2. Review appointment details
3. Confirm or decline appointments
4. Add meeting link for online appointments
5. Manage upcoming appointments

## Technical Details

- **Framework**: Next.js 14+ with App Router
- **API**: tRPC for type-safe API calls
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: Shadcn UI components with Tailwind CSS
- **Authentication**: NextAuth.js
- **Validation**: Zod schemas
- **Notifications**: Sonner for toast messages

## Database Migration

After adding the appointments feature, run the database migration:

```bash
pnpm db:generate
pnpm db:migrate
```

This will create the appointments table with all necessary columns and relationships.

## Future Enhancements

- [ ] Email notifications for appointments
- [ ] Calendar integration (Google Calendar, Outlook)
- [ ] Appointment reminders
- [ ] Reschedule functionality
- [ ] Lawyer availability calendar
- [ ] Rating and review system after completed appointments
- [ ] Video call integration
- [ ] Payment processing for consultations
- [ ] Recurring appointments
- [ ] Appointment history and analytics
- [ ] Advanced filtering (by location, expertise, availability)
- [ ] Lawyer profile pages with detailed information
- [ ] Direct messaging functionality
- [ ] Favorite/saved lawyers list
