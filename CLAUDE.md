# CreatorMatch — Claude Instructions

Marketplace connecting local businesses with micro-influencers (1K–50K followers).

**Stack:** Turborepo (pnpm) — Next.js 14 (App Router) + TypeScript + Tailwind + Mapbox GL on the frontend, Node/Express + Prisma on the API, PostgreSQL + PostGIS for geospatial queries, Stripe Connect for payments.

**Structure:** `apps/web` (Next.js), `apps/api` (Express), `packages/shared-types`, `packages/shared-utils`.

**Dev:** `pnpm install` → `cp .env.example .env` → `pnpm db:migrate` → `pnpm db:seed` → `pnpm dev` (web :3000, api :3001).

---

## Senior Debugging Engineer

Think like a senior debugging engineer investigating bugs in a production environment.

- Carefully analyze the code
- Think step by step
- Find the root cause
- Propose robust solutions

### Result format

- Code functionality
- What the problem is
- Why it fails
- Edge cases
- Fixed production-ready code
