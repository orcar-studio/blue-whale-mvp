# Blue Whale MVP

Blue Whale is a simple English web MVP for travel sponsorship matching. It is intentionally not a login/dashboard SaaS: creators apply with trip details and social links, businesses register sponsorship offers, and Blue Whale mediates proposals.

## Stack

- Vite
- React
- TypeScript
- localStorage mock database with Jeju seed data
- Optional Vercel API function for OpenAI-powered business descriptions
- Supabase-ready SQL schema in `supabase/schema.sql`

## Install

```bash
bun install
```

The project also has a standard `package.json`, so `npm install` works in a normal Node/npm environment.

## Environment

Copy `.env.example` if you want optional AI generation:

```bash
cp .env.example .env
```

`OPENAI_API_KEY` is optional. If it is missing, the app uses a template fallback for `Generate Description`.

## Local Run

```bash
bun run dev
```

Then open the local URL printed by Vite.

## Verification

```bash
bun run typecheck
bun run lint
bun run build
```

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. For production, store passwords as hashes in `password_hash` and do not use the mock `password` column.
5. Replace the localStorage repository in `src/storage.ts` with Supabase queries using the same table names.

The MVP keeps the data model application/offer-first:

- `creator_applications`
- `creator_social_accounts`
- `business_offers`
- `creator_offer_preferences`
- `business_proposals`

## Deploy to Vercel

1. Import the repository in Vercel.
2. Use the default Vite settings:
   - Build command: `bun run build` or `npm run build`
   - Output directory: `dist`
3. Add `OPENAI_API_KEY` only if you want AI-powered description generation.
4. Deploy.

The app works without Supabase because it includes a localStorage mock/seed fallback for demos.

## Deploy to GitHub Pages

For the `orcar-studio/blue-whale-mvp` repo, build with `GITHUB_PAGES=true` and publish the `dist` directory to the `gh-pages` branch:

```text
https://orcar-studio.github.io/blue-whale-mvp/
```

The Vite base path is set in `vite.config.ts` when `GITHUB_PAGES=true`. The current demo is deployed separately from existing services through a dedicated GitHub repo and Pages branch.

## Demo Lookup Credentials

Creator applications:

- Nickname: `ari-reels`, password: `demo1234`
- Nickname: `family-shorts`, password: `demo1234`
- Nickname: `jeju-blogger`, password: `demo1234`

Business offers:

- Login ID: `jeju-car`, password: `demo1234`
- Login ID: `ocean-stay`, password: `demo1234`
- Login ID: `aewol-villa`, password: `demo1234`
- Login ID: `forest-stay`, password: `demo1234`
- Login ID: `udo-ebike`, password: `demo1234`
- Login ID: `aewol-cafe`, password: `demo1234`
- Login ID: `halla-photo`, password: `demo1234`
- Login ID: `jeju-beauty`, password: `demo1234`
- Login ID: `seoul-car`, password: `demo1234`
- Login ID: `bukchon-stay`, password: `demo1234`
- Login ID: `hongdae-hotel`, password: `demo1234`
- Login ID: `seongsu-skin`, password: `demo1234`
- Login ID: `busan-car`, password: `demo1234`
- Login ID: `haeundae-hotel`, password: `demo1234`
- Login ID: `gwangalli-stay`, password: `demo1234`
- Login ID: `suyeong-beauty`, password: `demo1234`

## Demo Flows

- Creator: home -> apply -> choose Jeju -> dates -> preference categories -> social link -> optional contact -> nickname/password -> sponsorship market.
- Returning creator: home -> `Check My Application` -> `Browse Sponsorship Market`.
- Business: `For Businesses` -> register offer -> optional generated description -> contact -> ID/password -> summary.
- Returning business: business home -> `Check My Offer` -> view interested creators -> write proposal -> submitted proposal status.
