# CODEZERO

CODEZERO is a team-based murder mystery classroom web application designed for high school 2nd graders.

## Tech Stack

- Next.js App Router + TypeScript
- Supabase (Auth, PostgreSQL, Realtime, Storage-ready)
- Tailwind CSS + Shadcn-style UI components
- React Query

## Run Locally

1. Copy env file:

```bash
cp .env.example .env.local
```

2. Fill `.env.local` with your Supabase values.
3. Start the app:

```bash
npm install
npm run dev
```

## Static Export

This project is configured for static export via `output: "export"`.

```bash
npm run export
```

The exported app is generated to `/out` with `out/index.html` as the entry file.

## Core Routes

- `/admin`: teacher login and game control panel
- `/play`: student game room without login
- `/`: landing page and route selection

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
