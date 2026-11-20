# Coy Discover · SDE Intern Assignment — Part B

A privacy-first swipe-based discovery demo built with **Next.js (App Router), TypeScript, Tailwind CSS, Motion, Drizzle ORM and SQLite**. This is a standalone project, not an integration with Coy's production code.

## Features

- Mobile-first **Discover** tab with illustrated cards, touch/mouse drag gestures, swipe directions, keyboard arrow keys, and Like/Pass buttons.
- A deliberately **blank Home** tab and a separate **Matches** view.
- **30 mock candidate profiles** and one simulated current user, with bios, ages, locations, local illustrated photo placeholders and interests.
- **10 pre-seeded incoming likes** so reciprocal likes can be demonstrated immediately.
- Mutually liking a candidate shows an **“It's a match!”** celebration.
- Previously swiped profiles are permanently removed from the feed; an empty state appears once exhausted.
- Swipes and matches persist in local SQLite, including across reloads and server restarts.
- Private incoming likes are never exposed by the feed or matches endpoints.

## Requirements

- Node.js 22.13+ (Node.js 24 also supported)
- npm
- Local filesystem write access for SQLite (required for persistent deployments)

## Quick start

```bash
npm install
cp .env.example .env
mkdir -p data
npm run db:push
npm run db:seed
npm run dev
```

Go to http://localhost:3000. The seeded current user is `id=1`. The database path defaults to `./data/coy.sqlite` in `.env`.

**Important:** `npm run db:seed` **deletes existing swipes and matches**, resetting the demo to its original 30 candidates and 10 private incoming likes. Do not reseed if you need to preserve progress.

## API contract

| Endpoint | Request | Result |
|---|---|---|
| `GET /feed` | — | `{ "profiles": Profile[] }` not yet swiped by user 1 |
| `POST /swipe` | `{ "targetId": 2, "direction": "like" }` | `{ "matched": boolean, "match"?: Profile }` |
| `GET /matches` | — | `{ "matches": Profile[] }` mutual matches only |

Invalid swipe payload → `400`; unknown profile → `404`; repeated swipe → `409`. Passing a profile does **not** create a match. The match profile is returned only when a reciprocal like is confirmed.

Example:

```bash
curl http://localhost:3000/feed
curl -X POST http://localhost:3000/swipe \
  -H 'Content-Type: application/json' \
  -d '{"targetId":2,"direction":"like"}'
curl http://localhost:3000/matches
```

## Testing

```bash
npm run test             # Isolated matching tests; does not touch demo database
npm run lint
npm run build
npm run dev              # In a separate terminal
npm run smoke            # Read-only feed/matches + invalid write checks
```

The matching tests cover one-sided likes, reciprocal likes, sorted unique match pairs, passing, repeat requests, invalid users, and on-disk SQLite persistence. The smoke script does not consume candidate profiles.

### Manual acceptance checks

1. Swipe one candidate left, reload, and confirm they don't reappear.
2. Swipe right on one of the pre-liked candidates (IDs 2, 5, 8, 11, 14, 17, 20, 23, 26, 29); the match celebration should appear.
3. Select Matches and verify only mutual matches are listed.
4. Verify gestures on a phone or browser mobile simulator, and buttons/arrow keys on desktop.
5. Swipe through all remaining profiles; verify the empty state and persistent matches after restarting.

## Database and privacy

Schema: `users`, `interests`, `user_interests`, `swipes`, `matches`. The matching service records a swipe and creates a match in a **single SQLite transaction**, with database-level unique constraints protecting against duplicate swipes and matches. Match pairs are stored in sorted order.

**Privacy boundary:** `GET /feed` returns only public profile fields; the existence of pre-seeded likes is not returned. `GET /matches` reads only stored mutual matches. The browser does not decide whether a match happened.

This is a **single-user demo**, as explicitly permitted by the assignment. It has no production authentication or authorization and must not be deployed as a real multi-user dating service without those controls.

## Deployment

A hosted deployment is optional for local evaluation but helpful for reviewers. SQLite requires a **persistent writable disk/volume**. Do not deploy this build to a stateless/serverless host with an ephemeral SQLite file and assume data will persist. Configure the database path to the persistent disk, apply the schema, and seed exactly once. See `.env.example`.

## Submission

1. Run `npm run test && npm run lint && npm run build` on your machine.
2. Commit source files and the locally generated `package-lock.json`; never commit `.env`, `node_modules/`, `.next/`, or `data/*.sqlite*`.
3. Push to a **public GitHub repository** and ensure the README instructions work from a fresh clone.
4. Include a demo screenshot or short walkthrough in the repository (optional but helpful).
5. Submit the repository URL with Part A's two feature suggestions, as specified in the assignment.

## Folder map

```text
src/app/                  # Page, styles, and 3 API route handlers
src/components/           # Discover and Matches views
src/db/                   # SQLite setup and Drizzle tables
src/lib/swipe-service.ts  # Transactional matching logic
scripts/                  # Seed profiles and smoke checks
tests/                    # Isolated matching tests
public/profiles/          # Local illustrated placeholder images
```
