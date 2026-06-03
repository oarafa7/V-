# VITAL — Preventive Health Intelligence Platform

> Know your body. Before it fails you.

VITAL is a subscription-based preventive health platform for the Egyptian
market. Users get comprehensive biomarker testing through partner labs and a
mobile-first app that stores, visualizes, and explains their health data over
time.

This repository contains the **Phase 1** build: onboarding, subscriptions &
payments, the biomarker library, categorization, and biomarker detail pages.

## Monorepo layout

```
vital/
├── apps/
│   ├── mobile/          # Expo (React Native) app — Expo Router, NativeWind, Zustand
│   └── api/             # Hono backend — Drizzle ORM + Supabase Postgres, Paymob
├── packages/
│   └── shared/          # Shared types, Zod schemas, biomarker dataset, status logic
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Tech stack

| Layer     | Choice |
|-----------|--------|
| Mobile    | Expo + Expo Router, NativeWind (Tailwind), Zustand, React Hook Form + Zod, Reanimated, react-native-svg, react-native-webview |
| Backend   | Node + TypeScript, Hono, Drizzle ORM, Supabase (Postgres + Auth + Storage), Paymob |
| Shared    | TypeScript types, Zod validation, canonical biomarker dataset (89 markers / 8 categories) |

## Getting started

```bash
pnpm install

# Backend
cp apps/api/.env.example apps/api/.env      # fill in Supabase + Paymob creds
pnpm db:migrate                              # apply migrations
pnpm db:seed                                 # seed categories, 89 biomarkers, plans
pnpm dev:api                                 # http://localhost:3000

# Mobile
cp apps/mobile/.env.example apps/mobile/.env # point EXPO_PUBLIC_API_URL at the API
pnpm dev:mobile                              # Expo — open in Expo Go (iOS/Android)
```

## Useful scripts (root)

| Command | What it does |
|---------|--------------|
| `pnpm typecheck` | `tsc --noEmit` across all packages |
| `pnpm db:generate` | Generate a new Drizzle migration from the schema |
| `pnpm db:migrate` | Apply migrations to the database |
| `pnpm db:seed` | Seed categories, biomarkers, and plans (idempotent) |
| `pnpm dev:api` / `pnpm dev:mobile` | Run backend / mobile in dev |

## Architecture notes

- **Auth** wraps Supabase Auth. The API mirrors each user into its own `users`
  table (keyed by the Supabase auth id) and verifies the Bearer JWT on every
  protected route.
- **Subscriptions** are gated by `requireActiveSubscription` middleware — no
  active, non-expired subscription means no biomarker data.
- **Payments** use Paymob (cards, Vodafone Cash, Fawry, Meeza). The flow creates
  a pending subscription, opens the Paymob iframe in a WebView, and activates the
  subscription only after an HMAC-verified success webhook.
- **Biomarker status** (`optimal` / `suboptimal` / `alert` / `untested`) is
  computed by a single shared `classifyBiomarker` so the client and server never
  disagree.
- **The biomarker dataset** (89 markers across 8 categories, with optimal +
  normal + physiologically-plausible ranges and plain-language copy) lives in
  `packages/shared/src/data` and is the single source of truth for both the API
  seed and the mobile constants.

## API surface (v1)

All under `/api/v1`. Auth and the Paymob webhook are public; everything else
needs a Bearer token, and biomarker data additionally needs an active
subscription.

```
auth:           POST /auth/signup · /auth/login · /auth/logout · /auth/reset-password
users:          GET/PUT /users/me · PUT /users/me/health-profile · PUT /users/me/goals
subscriptions:  GET /subscription-plans · GET /subscriptions/me
payments:       POST /payments/initiate · POST /payments/webhook
biomarkers:     GET /biomarkers · GET /biomarkers/:id · GET /biomarker-categories
results:        GET /results/me · GET /results/me/:biomarkerId · POST /results · DELETE /results/:id
```

## Phase 1 status

- [x] Onboarding: signup, multi-step health profile, goals
- [x] Subscriptions: plans, Paymob checkout (WebView), confirmation, guard
- [x] Biomarker library: 89 markers, search, category + status filters, sort, grid/list
- [x] Categorization: category overview cards, category detail, status classification, progress rings
- [x] Biomarker detail: dual-mode range bar, history chart, explanatory sections, manual result entry
- [x] `tsc --noEmit` passes across all packages
- [x] Reproducible DB migration committed

Out of scope (future phases): AI coaching, composite health scores, lab API
import, push notifications, enterprise dashboards, imaging, genetics, supplement
store.
