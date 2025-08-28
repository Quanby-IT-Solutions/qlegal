# Quanby Sign

Send, sign, and track documents securely with role‑based access for every stakeholder. Approvals, guided eSigning, and an audit‑ready history—all in one place.

**Built with:** Next.js 15 • tRPC • Prisma • NextAuth • Supabase

## Features

| Feature                     | Short description                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Secure Access & Roles       | Protect sensitive documents with role‑based access for individuals, businesses, legal teams, regulators, and admins. |
| Envelopes & Recipients      | Package documents, assign who needs to sign, approve, view, or be CC’d, and send in one go.                          |
| Guided eSigning             | Simple, step‑by‑step signing experience that’s fast and error‑free.                                                  |
| Approvals & Reviews         | Get approvals before signatures are finalized with clear decision tracking.                                          |
| Smart Notifications         | Automatic email updates keep signers and approvers on schedule.                                                      |
| Document Storage & Delivery | Upload once, deliver securely, and access both unsigned and signed copies anytime.                                   |
| Identity Verification (KYC) | Capture ID details quickly with OCR to speed up verification.                                                        |
| Audit‑Ready History         | Every key action is logged for compliance and peace of mind.                                                         |
| Progress Dashboards         | Track envelope status and recipient progress at a glance.                                                            |
| Account Management          | Manage user details and preferences in a few clicks.                                                                 |

## Quick Start

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Setup environment**

   ```bash
   cp .env.example .env
   # Configure your .env file with Supabase, email, and API keys
   ```

3. **Setup database**

   ```bash
   pnpm db:generate
   pnpm db:migrate:dev
   ```

4. **Start development**
   ```bash
   pnpm dev
   ```

## 🏗️ Project Structure & House Rules

> **IMPORTANT:** Follow these conventions for consistent codebase

### Directory Rules

```
app/                  # ❌ ONLY Next.js reserved files (pages, layouts, routes)
├── (routes)/         # ✅ Route groups and page.tsx files only
├── api/              # ✅ API routes only
└── globals.css       # ✅ Global styles only

features/             # ✅ ALL your business logic goes here
├── [feature-name]/
│   ├── api/          # ✅ tRPC routers, schemas, hooks
│   ├── components/   # ✅ Feature-specific UI components
│   ├── lib/          # ✅ Feature-specific UI components
│   ├── server/       # ✅ Server actions, DB operations
│   └── utils/        # ✅ Feature utilities

core/                 # ✅ Shared/reusable code
├── components/       # ✅ Shared UI components
├── context/          # ✅ Shared UI components
├── hooks/            # ✅ Shared React hooks
├── lib/              # ✅ Shared utilities
└── middleware/       # ✅ Shared utilities

services/             # ✅ External service integrations
├── email/            # ✅ Email service
├── next-auth/        # ✅ NextAuth setup
├── prisma/           # ✅ Database schema
├── supabase/         # ✅ Supabase client
└── trpc/             # ✅ tRPC setup
```

### File Naming Conventions

- **Components**: kebab-case (`user-profile.tsx`)
- **Files**: kebab-case (`user-profile.utils.ts`)
- **Folders**: kebab-case (`user-management/`)
- **tRPC files**: `feature-name.router.ts`, `feature-name.schema.ts`, `feature-name.hooks.ts`

## Scripts

```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm db:push          # Push database changes
pnpm db:generate      # Generate Prisma client
pnpm db:studio        # Open database GUI
pnpm check            # Check code quality and lint
```

## Docker (Production Only)

```bash
docker-compose up --build    # Deploy production
docker-compose down          # Stop production
```

## Contributing

1. Follow the **project structure rules** above
2. Keep features isolated in their own `/features/[name]/` folder
3. Use TypeScript everywhere
4. Run `pnpm check` before committing
5. Update `.env.example` and `env.js` when adding environment variables
