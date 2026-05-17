# Jigsaw

**Jigsaw** is a teacher tool for running jigsaw cooperative group activities in the classroom. Teachers design activities, host live sessions with join codes, and track group progress through expert-group and home-group phases.

The repository ships with one built-in game template example — **School Lunch Rush** (cooperative English cafeteria activity). The data model and editor target that template; additional game types can follow the same `activity_pack` structure.

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
| `activities` | Teacher-authored activity (`activity_pack` JSON) |
| `sessions` | Live play (`join_code`, `phase`, `status`) |
| `groups` | Acquired items, completed tasks, activity completion |
| `players` | Nickname, group, `assigned_role_id` |

Session phases: `waiting` → `overview` → `expert_group` → `home_group` → `results`.

Session `status`: `active` | `ended` (set to `ended` when the session reaches `results`).

## Activity pack model

Gameplay content lives under [`lib/activity-pack/`](lib/activity-pack/). An `activity_pack` (`ActivityPack`) includes:

- **`items`** — answers and staged hints for expert groups (`groupHint` for the home group)
- **`tasks`** — home-group assignments with `itemIds` and ordered **`steps`**
- **`actionCards`** — sentence pool students combine during the group phase

The editor and AI generator use generic names (`item`, `task`, `step`); the **School Lunch Rush** sample maps them to ingredients, menus, and cooking steps.

## Run Locally

1. Copy env file:

```bash
cp .env.example .env.local
```

2. Fill `.env.local` with your Supabase (and optional OpenAI) values.
3. Apply `supabase/schema.sql` if the database is new.
4. Start the app:

```bash
npm install
npm run dev
```

## Static Export

For **submission** (plain `out/` folder, no server), use `npm run export`. This sets `STATIC_EXPORT=1` so Next.js outputs a static site to `/out`.

**Vercel / any host that should run API routes** (e.g. AI activity pack generation at `/api/ai/generate-activity-pack`): use the default `npm run build` **without** `STATIC_EXPORT`. Do not set `STATIC_EXPORT` in the hosting environment.

```bash
npm run export
```

The exported app is generated to `/out` with `out/index.html` as the entry file.

## Core Routes

- `/login/`, `/signup/`: teacher authentication
- `/activities/`, `/activities/new/`, `/activities/edit/`: activity authoring
- `/activities/sandbox/`: teacher-only flow preview (`?activity=<activity id>`)
- `/sessions/`: live session host dashboard (`?session=<session id>`)
- `/reports/`: session list and group progress (`?session=` for detail)
- `/play/`, `/play/session/`: student join by code (no login)
- `/`: landing

## API (server)

| Route | Purpose |
|-------|---------|
| `POST /api/ai/generate-activity-pack` | AI draft for items, tasks, and step sentences (School Lunch Rush template) |

Request body supports `contentLanguage` (`ko` | `en`) for title, description, hints, and steps.

## Example activity pack

See [`lib/activity-pack/sample-pack.json`](lib/activity-pack/sample-pack.json) for the **School Lunch Rush** sample `activity_pack`.

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
