# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # Biome linting (biome check)
npm run format       # Biome auto-format (biome format --write)
npm run db:types     # Regenerate Supabase TypeScript types into src/types/supabase.ts
```

No test runner is configured.

## Tech Stack

- **Next.js 16** (App Router, React Compiler enabled) with **React 19** and **TypeScript 5** (strict)
- **Supabase** for auth, database (PostgreSQL), and real-time
- **Tailwind CSS 4** + **Radix UI** primitives for components
- **Biome** for linting/formatting (not ESLint/Prettier)
- **Zustand** for global state, **SWR** for data fetching, **react-hook-form** + **Zod** for forms
- Path alias: `@/*` maps to `./src/*`

## Architecture

### Multi-Tenancy

Two-tier auth system with separate user tables:
- **Global admin** routes at root (`/login`, `/tenants`, `/modules`, `/templates`) — uses `global_users` table
- **Tenant** routes under `/t/[tenant]/...` — uses `tenant_users` table scoped to that tenant
- Middleware (`src/middleware.ts`) handles route protection and passes tenant slug via `x-tenant-slug` header
- Tenant membership verification happens in the tenant layout, not middleware

### Data Layer Pattern

Three-layer pattern for all domain entities (customers, services, specialists, branches, appointments, workstations):

1. **Service class** (`src/lib/services/[entity].ts`) — Supabase queries, exported as singleton
2. **SWR hook** (`src/hooks/supabase/use-[entity].ts`) — wraps service with SWR caching, returns `{ data, isLoading, error, mutate }`
3. **Components** (`src/components/[entity]/`) — consume hooks, use UI primitives from `src/components/ui/`

### State Management

- **Auth**: Zustand store (`src/lib/stores/auth-store.ts`) with localStorage persistence — `useAuthStore()` provides `user`, `tenant`, `isGlobalAdmin`, `isTenantUser`
- **Server data**: SWR hooks with `revalidateOnFocus: false`, configured in `src/providers/swr-provider.tsx`
- **Forms**: react-hook-form with `zodResolver`

### Key Directories

- `src/app/(root)/` — admin console pages (tenants, modules, templates)
- `src/app/t/[tenant]/` — tenant-scoped pages (dashboard, customers, services, etc.)
- `src/app/api/` — API route handlers
- `src/components/ui/` — Radix + Tailwind base components (shadcn-style)
- `src/components/shared/` — layout components (sidebar, header)
- `src/components/tenant/` — tenant layout components
- `src/lib/supabase/` — client (`createBrowserSB`), server (`createServerSB`), service, and admin Supabase clients
- `src/providers/` — React context providers (theme, SWR, tenant, auth)
- `src/types/supabase.ts` — auto-generated DB types (from `npm run db:types`)

### Environment Variables

Required in `.env`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Conventions

- Biome enforces 2-space indentation, organized imports, and recommended React/Next.js lint rules
- Client components must have `"use client"` directive
- All Supabase queries should go through service classes, not directly in components
- Always filter by `tenant_id` in tenant-scoped queries
- Toast notifications use Sonner: `import { toast } from "sonner"`
- Code comments in the codebase are in Spanish
