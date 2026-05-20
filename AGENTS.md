# AGENTS.md — Pijat On-Demand

## Monorepo structure

npm workspaces monorepo under `apps/`. No `packages/*` used yet.

```
apps/web/           Next.js 14 App Router — admin dashboard + API backend
apps/user/          Expo 54 (expo-router) — user mobile app
apps/therapist/     Expo 54 (expo-router) — therapist mobile app
supabase/schema.sql Full DB schema, RLS, triggers, seed data
```

## Commands

| Task | Command |
|---|---|
| Web admin (port 3000) | `npm run web` |
| User app | `npm run mobile:user` |
| Therapist app | `npm run mobile:therapist` |
| Lint (web only) | `cd apps/web && npm run lint` |

No typecheck, test, or formatter scripts configured. No pre-commit hooks.

## Key architecture

- **Web**: Next.js App Router with Route Handlers (`src/app/api/`), Supabase SSR auth via middleware (`src/middleware.ts`), dark-mode-first CSS variables + TailwindCSS.
- **Supabase clients**: Web uses `@supabase/ssr` (browser + server + admin clients in `src/lib/supabase/`). Mobile apps use `@supabase/supabase-js` directly with **hardcoded** URL/anon key in `lib/supabase.ts`.
- **Mobile**: Expo Router file-based routing. Zustand for state, React Query for API calls. Inter font loaded via `@expo-google-fonts/inter`.
- **Therapist app uses**: `GestureHandlerRootView` wrapper, Notifee for push notifications, custom alert system via Zustand store.
- **Realtime**: Supabase Realtime (not WebSocket). Order status polling every 3–5 seconds as fallback.
- **Payments**: Mock Midtrans Core API (not Snap). In-app payment instructions (no WebView).
- **Matching**: Broadcast system — all eligible therapists notified (radius 3km, gender match, rating >= 4.5, wallet >= 15k). First to accept via atomic Supabase update wins. No Redis, no queue.
- **i18n**: `LanguageContext` in web app, partial BI/EN support.
- **Tier system**: Therapist auto-promotion on order completion based on monthly order count + revenue. Commission rate varies by tier.
- **Privacy Shield**: Customer address auto-hidden after order completion/cancellation. Customer name masked in reviews.

## Database

All schema + RLS + triggers + seed data in `supabase/schema.sql`. Run in Supabase SQL Editor to bootstrap.

Key tables: `users`, `therapists`, `therapist_locations`, `services`, `orders`, `order_logs`, `transactions`, `vouchers`, `voucher_usages`, `notifications`, `user_topups`, `user_withdrawals`.

Enums: `user_role`, `order_status` (pending → accepted → on_the_way → in_progress → completed / cancelled / rejected), `payment_status`, `therapist_status`, `voucher_type`, `voucher_category`.

## Setup

1. Create Supabase project, run `supabase/schema.sql`
2. Copy `apps/web/.env.local.example` → `apps/web/.env.local`, fill Supabase + Midtrans + JWT values
3. `npm install`
4. `npm run web` (port 3000)

Mobile apps use hardcoded Supabase creds — no env setup needed.

## Design system

- **Palette**: Primary navy (#1E1B4B), secondary orange (#F97316), emerald success, amber warning, red danger, sky blue info.
- **Web CSS**: CSS variables (`--background`, `--card`, `--primary`, etc.) with `.light` override class. `tailwind.config.js` maps these vars to Tailwind theme tokens (`bg-card`, `text-text-primary`). Utility classes: `.glass-card`, `.btn-primary`, `.input-field`, `.badge-*`.
- **Mobile**: NativeWind, custom alert system, premium gradients, card-based layout with rounded corners (20–30px).

## Known quirks

- Therapist app has multiple fix scripts (`fix.js` through `fix4.js`, `fix_gradients.js`, etc.) in its root — cleanup candidates.
- Scratch files in root `scratch/`, `apps/web/scratch/` — ephemeral development scripts.
- `progress-develop.md` is the dev log — readable for context on recent changes.
