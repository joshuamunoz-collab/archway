\# CLAUDE.md — Archway



\## Overview

Archway is a property management web app for ~50 rental properties in St. Louis City, MO.

Many are Section 8 with HAP subsidy + tenant copay. Four owning entities, each with

checking + money market accounts. PM charges 10% of collected rent.



\*\*Read SPEC.md for the complete feature specification, database schema, and build order.\*\*



\## Tech Stack

\- Next.js 15 (App Router, Server Components by default)

\- TypeScript (strict mode)

\- Tailwind CSS + shadcn/ui for ALL UI components

\- PostgreSQL via Supabase

\- Prisma ORM for ALL database queries

\- Supabase Auth (email/password)

\- Supabase Storage for file uploads

\- Recharts for charts

\- TanStack Table + shadcn for data tables

\- PapaParse for CSV import

\- SheetJS (xlsx) for Excel export

\- @react-pdf/renderer for PDF reports

\- @dnd-kit for kanban drag-and-drop



\## Design Principles

\- Clean, minimal, modern. Stessa's dashboard feel meets Julie Zhuo's design philosophy.

\- Progressive disclosure: dashboard → property detail → deep detail.

\- 5-second rule: user answers their core question in 5 seconds.

\- Semantic color ONLY: red=fix now, yellow=watch, green=good. Most UI is neutral.

\- Tables should feel familiar to spreadsheet users (sort, filter, search, export).

\- One primary action per screen.



\## Color Palette

\- Background: #FAFAFA, Cards: #FFFFFF with shadow-sm

\- Text: #1A1A1A primary, #6B7280 secondary

\- Accent: #2563EB (blue-600)

\- Status: #10B981 occupied, #EF4444 vacant, #F97316 rehab, #F59E0B pending

\- Font: Inter



\## Code Conventions

\- Server Components by default. Add 'use client' only when needed.

\- Prisma for ALL database access. Never raw SQL in components.

\- API routes in app/api/ for mutations.

\- Named exports for components.

\- File names: kebab-case. Component names: PascalCase.

\- Keep components small and focused. One component per file.

\- Use early returns for cleaner code.

\- All financial amounts: DECIMAL(10,2) in DB, number in TypeScript.

\- Always log mutations to activity\_log table.



\## Key Domain Rules

\- Properties have STATUS: occupied, vacant, rehab, pending\_inspection, pending\_packet

\- When status → vacant: set vacant\_since = today. When → occupied: clear it.

\- Rent = HAP (gov subsidy) + tenant copay. Always tracked separately.

\- PM fee = 10% of collected rent (configurable per entity).

\- PM bill marked "Paid" → auto-create expense records from line items.

\- Vacancy insurance risk: 30d=yellow, 45d=orange, 60d=red.

\- Tasks not acknowledged in 48hrs → auto-escalate on dashboard.

\- All properties are in St. Louis City (not County).



\## File Structure

\- app/ — Next.js pages and API routes

\- components/ui/ — shadcn/ui base components

\- components/dashboard/ — Dashboard-specific components

\- components/property/ — Property detail tab components

\- components/shared/ — Reusable (StatusBadge, VacancyCountdown, EntityFilter, etc.)

\- lib/ — DB client, utilities, calculations, export functions

\- types/ — Shared TypeScript types

\- prisma/ — Schema and migrations

\- public/templates/ — Downloadable CSV templates



\## Commands

\- npm run dev — Start dev server

\- npx prisma migrate dev — Run migrations

\- npx prisma generate — Regenerate Prisma client

\- npx prisma studio — Visual DB browser

\- npm run build — Production build

\- npm run lint — ESLint



\## Current Sprint

Check SPEC.md Section 8 "Build Order" for the current sprint and task list.

