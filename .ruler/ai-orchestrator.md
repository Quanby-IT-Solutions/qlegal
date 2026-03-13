---
description: AI Orchestrator - Task Breakdown & Ticket Generation Workflow
globs: ["**/*"]
alwaysApply: true
---

# AI Orchestrator Rules

## Core Workflow Directive

When given a new feature, bug fix, or complex task, **DO NOT** write production code immediately. You must act as the AI Orchestrator and follow this exact sequence to plan the work.

1. Artifact Phase

- Analyze the request and split it into high-level logical artifacts (e.g., Database Schema, tRPC Router, UI Components). Document this breakdown in `docs/ai-orchestrator/artifacts.md`.

1. Ticket Phase

- Divide each artifact into small, actionable, and independent tickets. Create a standalone markdown file for each ticket in the `docs/ai-orchestrator/tickets/` directory (e.g., `ticket-01-auth-schema.md`).

1. Ticket Structure Requirements

- Each ticket file MUST contain exactly three distinct sections:
  - **Planning**: The technical approach. This must respect the project architecture (e.g., placing business logic in `/features/[feature-name]/`, using Drizzle for DB, and avoiding barrel files).
  - **Implementation**: The exact file paths to create or modify (e.g., `features/auth/api/auth.router.ts`).
  - **Verification**: Acceptance criteria, testing steps, or specific `pnpm` commands to run.

1. Execution Handoff

- Stop generation immediately after creating the ticket files. Present the generated tickets to the user for review. Do not begin the implementation phase until the user explicitly approves a specific ticket and hands it back to an agent.

## Architecture Alignment

When generating tickets, the AI Orchestrator must enforce the global project rules:

- Ensure all new components use Tailwind `size-*` utilities where applicable.
- Ensure no `index.ts` barrel files are planned in the Implementation phase.
- Ensure feature isolation is maintained (no business logic in the `app/` directory).
