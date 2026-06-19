# Zigso

**Zigso** is a teacher tool for running zigso cooperative group activities in the classroom. Teachers design activities, host live sessions with join codes, and track group progress through expert-group, home-group, and individual-quiz phases.

The repository ships with one built-in activity example — **Textbook Reading: Save Our Planet**. Experts master a passage segment, the home group solves a shared multiple-choice quiz, and each student takes an individual multiple-choice quiz. The data model and editor target that flow; additional topics follow the same `activity_pack` structure.

## Tech Stack

- Next.js App Router + TypeScript
- Supabase (Auth, PostgreSQL, Realtime)
- Tailwind CSS + Shadcn-style UI components
- React Query

## Database

Apply the schema on a **clean** Supabase project (or after backing up existing data):

1. Open the Supabase SQL Editor.
2. Run the full script in [`supabase/schema.sql`](supabase/schema.sql).

**Existing projects:** run the single upgrade script [`supabase/migrations/001_jigsaw_stad_upgrade.sql`](supabase/migrations/001_jigsaw_stad_upgrade.sql) in the Supabase SQL Editor (idempotent, safe to re-run).

Core tables:

| Table | Purpose |
|-------|---------|
| `activities` | Teacher-authored activity (`activity_pack` JSON) |
| `sessions` | Live play (`join_code`, `phase`, `status`) |
| `groups` | Home-group (STAD team) membership |
| `players` | Nickname, group, role, `base_score` (practice average), `practice_results`, formative-test `individual_quiz_answers` |

Session phases: `waiting` → `overview` → `expert_group` → `home_group` → `individual_quiz` → `results`.

Session `status`: `active` | `ended` (set to `ended` when the session reaches `results`).

## Activity pack model (v5)

Gameplay content lives under [`lib/activity-pack/`](lib/activity-pack/). An `activity_pack` (`ActivityPack`, version 5) includes:

- **`roles`** — each role has a **`segment`**, **`practiceQuestions[]`** (expert phase, with `hints[]` + `explanation`), and **`testQuestions[]`** (formative test, one attempt). Role count defines group size.

Each `QuizQuestion` is `{ id, prompt, choices[], correctIndex, hints?, explanation? }` — all questions are multiple-choice.

### Play flow (STAD)

1. **Expert group** — Master the segment, then solve **all practice questions** for the role (each: up to 3 attempts, hints, reveal). Per-question score = `100 / 70 / 40 / 10` (−30 per wrong). **Base score** = rounded average of those scores.
2. **Home group** — Explain to teammates; view **every member's segment and all practice questions** (with answers). Read-only, teacher-paced.
3. **Individual formative test** — Answer **all test questions** from every role **once** (no retries). **Test score** = `round(correct ÷ total × 100)`.
4. **Results (STAD)** — Improvement points from `diff = testScore − baseScore`. **Team score** = average of members' improvement points.

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

**Vercel / any host that should run API routes** (e.g. AI question generation at `/api/ai/generate-role-questions`): use the default `npm run build` **without** `STATIC_EXPORT`. Do not set `STATIC_EXPORT` in the hosting environment.

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
| `POST /api/ai/generate-role-questions` | AI-generated practice or test questions for one learning-content segment |

Request body: `segment`, `kind` (`practice` | `test`), optional `activityTitle`, `questionCount`, `contentLanguage` (`ko` | `en`).

## Example activity pack

See [`lib/activity-pack/sample-pack.json`](lib/activity-pack/sample-pack.json) for the **별과 우주** sample `activity_pack` (v5, 역할별 무관한 주제·긴 지문).

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
