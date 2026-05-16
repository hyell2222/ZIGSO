# School Lunch Rush

**School Lunch Rush** (CODEZERO) is a cooperative English classroom game for high school students. Teams work as cafeteria crews: ingredient experts deduce supplies from English hints, then combine them to complete lunch menus and submit a tray.

## Tech Stack

- Next.js App Router + TypeScript
- Supabase (Auth, PostgreSQL, Realtime)
- Tailwind CSS + Shadcn-style UI components
- React Query

## Database

Apply the schema on a **clean** Supabase project (or after backing up existing data):

1. Open the Supabase SQL Editor.
2. Run the full script in [`supabase/schema.sql`](supabase/schema.sql).

Core tables:

| Table | Purpose |
|-------|---------|
| `lessons` | Teacher-authored scenario (`scenario_pack` JSON) |
| `sessions` | Live play (`join_code`, `phase`) |
| `teams` | Acquired ingredients, completed menus, tray submission |
| `players` | Nickname, team, `assigned_ingredient_id` |

Game phases: `waiting` → `briefing` → `investigation` → `final_report` → `session_end`.

## Run Locally

1. Copy env file:

```bash
cp .env.example .env.local
```

2. Fill `.env.local` with your Supabase (and optional AI) values.
3. Apply `supabase/schema.sql` if the database is new.
4. Start the app:

```bash
npm install
npm run dev
```

## Static Export

For **submission** (plain `out/` folder, no server), use `npm run export`. This sets `STATIC_EXPORT=1` so Next.js outputs a static site to `/out`.

**Vercel / any host that should run API routes** (e.g. AI scenario generation at `/api/ai/generate-scenario-pack`): use the default `npm run build` **without** `STATIC_EXPORT`. Do not set `STATIC_EXPORT` in the hosting environment.

```bash
npm run export
```

The exported app is generated to `/out` with `out/index.html` as the entry file.

## Core Routes

- `/login/`, `/signup/`: teacher authentication
- `/cases/`, `/cases/new/`, `/cases/edit/`: lesson authoring (School Lunch Rush scenario)
- `/cases/sandbox/`: teacher-only flow preview (`?case=<lesson id>`)
- `/sessions/`: live session host dashboard (`?session=<session id>`)
- `/reports/`: session list and team progress (`?session=` for detail)
- `/play/`, `/play/session/`: student join by code (no login)
- `/`: landing

## API (server)

| Route | Purpose |
|-------|---------|
| `POST /api/ai/generate-scenario-pack` | AI draft for menus, ingredients, and cooking steps |

## Submission Folder Support

Initialize required submission folders:

```bash
npm run submission:init
```

It creates:

- `submission/document`
- `submission/media/image`
- `submission/media/movie`
- `submission/media/sound`
- `submission/program`
- `submission/source`

Recommended submission process:

1. Run `npm run export`
2. Copy `/out/*` to `submission/program`
3. Copy source (exclude `node_modules`, `.next`, `out`) to `submission/source`
4. Put report/screenshots in `submission/document`
5. Put media assets in `submission/media`

See also [`SUBMISSION_GUIDE.md`](SUBMISSION_GUIDE.md).
