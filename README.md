# Jigsaw

**Jigsaw** is a teacher tool for running jigsaw cooperative group activities in the classroom. Teachers design activities, host live sessions with join codes, and track group progress through expert-group and home-group phases.

The repository ships with one built-in game template example — **Textbook Reading: Save Our Planet** (vocabulary jigsaw from a textbook passage). The data model and editor target that template; additional game types can follow the same `activity_pack` structure.

## Tech Stack

- Next.js App Router + TypeScript
- Supabase (Auth, PostgreSQL, Realtime)
- Tailwind CSS + Shadcn-style UI components
- React Query

## Database

Apply the schema on a **clean** Supabase project (or after backing up existing data):

1. Open the Supabase SQL Editor.
2. Run the full script in [`supabase/schema.sql`](supabase/schema.sql).

**Existing projects (v2 → v3):** add new columns if missing:

```sql
alter table players add column if not exists word_cards jsonb not null default '[]'::jsonb;
alter table groups add column if not exists worksheet_placements jsonb not null default '[]'::jsonb;
```

Core tables:

| Table | Purpose |
|-------|---------|
| `activities` | Teacher-authored activity (`activity_pack` JSON) |
| `sessions` | Live play (`join_code`, `phase`, `status`) |
| `groups` | Shared worksheet placements, activity completion |
| `players` | Nickname, group, role, personal `word_cards` inventory |

Session phases: `waiting` → `overview` → `expert_group` → `home_group` → `results`.

Session `status`: `active` | `ended` (set to `ended` when the session reaches `results`).

## Activity pack model (v3)

Gameplay content lives under [`lib/activity-pack/`](lib/activity-pack/). An `activity_pack` (`ActivityPack`, version 3) includes:

- **`roles` / `items`** — vocabulary answers and staged clues for expert groups
- **`homeWorksheet`** — shared home-group worksheet:
  - **`summaryPassage`** — full summary text with `{{slot_id}}` placeholders for blanks
  - **`slots[]`** — each blank links an `itemId` to an `ownerRoleId` (that student's screen)

### Play flow

1. **Expert group** — Students with the same role solve 5-stage clues and earn **word cards** into personal inventory.
2. **Home group** — The team sees one **shared worksheet** (`summaryPassage`) in the center. Each student has blanks on their screen for their role's words, but **cannot place their own word into their own blank**. Teammates must place cards into each other's active slots (jigsaw teaching).
3. **Submit** — When all blanks are filled, the group submits the completed worksheet.

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
| `POST /api/ai/generate-activity-pack` | AI draft for roles, clues, and shared worksheet (`homeWorksheet`) |

Request body supports `contentLanguage` (`ko` | `en`) for title, description, clues, and summary passage.

## Example activity pack

See [`lib/activity-pack/sample-pack.json`](lib/activity-pack/sample-pack.json) for the **Textbook Reading: Save Our Planet** sample `activity_pack` (v3).

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
