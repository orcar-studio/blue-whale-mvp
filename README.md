# Blue Whale MVP

Blue Whale is a YC-style validation MVP for travel sponsorship demand. It is not a finished SaaS marketplace. The experiment asks whether creators with real trip dates will express intent for specific sponsorship offers, and whether local businesses respond to that warm intent through Blue Whale.

## What This Version Tests

- Creators browse sponsorship-like offers after entering destination, dates, and a social profile.
- Interest on a specific offer creates an operator outreach queue item.
- Businesses do not directly chat with creators by default.
- Blue Whale operators can update outreach status and enter proposals on behalf of businesses.
- Returning creators can check offer statuses and received proposals with nickname/password lookup.

## Stack

- Vite
- React
- TypeScript
- localStorage mock database with seed data
- Supabase-ready schema in `supabase/schema.sql`
- Deployable to GitHub Pages or Vercel

## Local Run

```bash
bun install
bun run dev
```

The project also works with npm in a normal Node environment.

## Verification

```bash
bun run typecheck
bun run lint
bun run build
```

## Main Routes / Screens

- Home: creator-first Jeju sponsorship prompt.
- Creator flow: destination, dates, social profile, optional contact, nickname/password.
- Sponsorship market: requestable offers for the creator destination.
- Returning creator: `Check My Application`.
- Business: lightweight seeded-offer lookup.
- Operator View: internal concierge queue and proposal entry.

## Demo Credentials

Creator lookup:

- Nickname: `family-shorts`, password: `demo1234`
- Nickname: `ari-reels`, password: `demo1234`
- Nickname: `jeju-blogger`, password: `demo1234`

Business lookup:

- Login ID: `jeju-car`, password: `demo1234`
- Login ID: `gogi-guksu`, password: `demo1234`
- Login ID: `aewol-villa`, password: `demo1234`
- Login ID: `seoul-car`, password: `demo1234`
- Login ID: `busan-car`, password: `demo1234`

## Data Model

The MVP is application/offer-first, not auth-first:

- `creator_applications`
- `creator_social_accounts`
- `business_offers`
- `creator_offer_preferences`
- `business_proposals`
- `operator_tasks`

For production, use `password_hash` instead of the mock `password` column and add real operator authentication.

## Deployment

GitHub Pages is configured through Vite base path support:

```bash
GITHUB_PAGES=true bun run build
```

For `orcar-studio/blue-whale-mvp`, publish `dist` to the `gh-pages` branch:

```text
https://orcar-studio.github.io/blue-whale-mvp/
```

This deploy target is separate from other Orcar services and projects.

## Optional Environment

No environment variables are required for the localStorage MVP. `.env.example` is included for future production wiring.
