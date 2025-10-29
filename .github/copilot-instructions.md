## Quick orientation for AI coding agents

This project is a Vite + React + TypeScript single-page app (shadcn-ui + Tailwind). Below are focused facts and examples that help you be productive immediately.

1. Architecture & routing

- Routing is declared in `src/App.tsx` (React Router v6). Pages live in `src/pages/*` (e.g. `Auth`, `Dashboard`, `RoleSelection`, `Profile`). Add new routes there and keep the catch-all `*` Route at the end.
- State + data fetching: uses `@tanstack/react-query` (QueryClient in `src/App.tsx`). Keep cache keys stable and prefer react-query for server state.

2. Build / dev / lint commands

- Install: `npm i`
- Dev: `npm run dev` (Vite dev server; configured in `vite.config.ts` to run on port 8080 and host `::`)
- Build: `npm run build` (production)
- Dev build (non-prod mode): `npm run build:dev`
- Preview production build: `npm run preview`
- Lint: `npm run lint`

3. Important file locations / patterns

- Supabase client (generated): `src/integrations/supabase/client.ts` — do NOT edit; it imports `./types`. Use it via: `import { supabase } from "@/integrations/supabase/client"`.
- Supabase migrations & edge functions: `supabase/migrations/` and `supabase/functions/` (server-side SQL and server functions live here).
- UI primitives (shadcn-style) are under `src/components/ui/` — prefer these building blocks for consistent theming.
- Reusable helpers: `src/lib/utils.ts` contains `cn` (tailwind merge + clsx) — use it instead of manual class merging.

4. Conventions & project-specific rules (discoverable)

- Import alias: `@` → `./src` (see `vite.config.ts`). Use `@/` for imports throughout the codebase.
- Auth flow: uses Supabase auth. Example: `src/pages/Auth.tsx` restricts sign-ups to `@sjsu.edu` emails and redirects to `/role-selection` on sign-up or `/dashboard` on sign-in.
- Role priority: Dashboard contains explicit logic that advisors should never see the student role in the UI. See `src/pages/Dashboard.tsx` and `src/components/RoleBadge.tsx` for role/status conventions (`student`, `advisor`, `admin` and `active|pending|denied`). Preserve this logic when changing role displays or checks.
- Routes used by the app: `/`, `/auth`, `/role-selection`, `/dashboard`, `/profile`, `/admin`, `/pending-advisors`, `/planner`, `/transcript`, `/messages`, `/pending-approvals`.

5. Integrations & env

- Supabase env keys expected: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. The client uses localStorage for auth persistence.
- `lovable-tagger` plugin runs in development (configured in `vite.config.ts`); don't remove unless you intend to stop Lovable integration.

6. Patterns & examples to follow

- Data fetching: use `supabase.from(...).select(...)` inside async functions and wrap server state in react-query where appropriate. Example: `src/pages/Dashboard.tsx` fetches `profiles` and `user_roles` after checking `supabase.auth.getUser()`.
- UI composition: use the `Card`, `Button`, `Input`, and other components from `src/components/ui/*` for consistent spacing and theming (see `Auth.tsx` for a complete example of form layout and toasts).
- Error / toast UX: use `useToast()` hook from `src/hooks/use-toast.ts` to surface errors. Tests and fixes should keep messages consistent for UX.

7. Small but critical notes

- The Supabase client file is marked "automatically generated" — changes will be overwritten. Edit the source generation pipeline if you need to change types or client options.
- Port & host: dev server runs on port `8080` (Vite config); CI/dev tooling may assume this.
- When editing auth / role flows, keep backward-compatible behavior for existing users (role priority & redirects).

8. Where to look for more context

- App wiring: `src/App.tsx`
- Auth flows: `src/pages/Auth.tsx` and `src/integrations/supabase/client.ts`
- Role rules & UI: `src/pages/Dashboard.tsx` and `src/components/RoleBadge.tsx`
- Utilities: `src/lib/utils.ts` and `src/hooks/use-toast.ts`
- Backend migrations & functions: `supabase/migrations/` and `supabase/functions/`

If anything in these sections looks incomplete or you want me to expand a section (for example, add concrete code snippets for common edits), tell me which areas to iterate on and I will update this file.
