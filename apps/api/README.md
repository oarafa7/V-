# VITAL API

Hono + TypeScript backend (Drizzle ORM → Postgres). All routes are versioned
under `/api/v1`; auth and the Paymob webhook are the only public endpoints.

## Run it locally (no cloud credentials needed)

The API runs fully offline in **local mode** — with Supabase and Paymob unset it
uses locally-signed JWTs, writes lab PDFs to disk, and disables live payments.
(Local mode is refused when `NODE_ENV=production`.)

```bash
# 1. A local Postgres, e.g.
#    createdb vital   (or: docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres)
cp .env.example .env            # set DATABASE_URL to your local Postgres

pnpm install
pnpm db:migrate                 # apply schema
pnpm db:seed                    # plans, categories, content defaults
pnpm dev                        # → http://localhost:3000
```

You'll see a `LOCAL DEV MODE` banner on boot.

### Local auth & subscription

- **Sign up** `POST /api/v1/auth/signup` `{ email, password, full_name, phone, accepted_terms }`
  → returns `{ access_token }` (a local JWT). Use it as `Authorization: Bearer <token>`.
- **Log in** `POST /api/v1/auth/login` `{ email, password }` — in local mode the
  password is **not** verified; any password logs an existing user in.
- **Grant a subscription** (biomarker/score routes are gated):
  `POST /api/v1/payments/dev-activate` (authed) → activates a 1-year subscription
  on the first active plan. This endpoint only exists in local mode.

What degrades locally: the original-PDF viewer (no signed URLs) and live Paymob
checkout. Lab **parsing** still works — it reads the uploaded bytes directly.

## Production

Set `NODE_ENV=production` and provide all Supabase + Paymob variables
(see `.env.example`). The env schema fails fast if any are missing, so the
server never starts half-configured.
