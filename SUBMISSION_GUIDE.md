# Zigso Submission Guide

The competition requires this structure:

- `/document`
- `/media`
- `/media/image`
- `/media/movie`
- `/media/sound`
- `/program`
- `/source`

For this repository, use the generated `submission/` folder.

## 1) Initialize folders

```bash
npm run submission:init
```

## 2) Export the web app

`npm run export` runs a **static** build (submission용 `out/`). This is the same step as before; it does not use the Vercel/server build.

```bash
npm run export
```

Copy all files from `out/` into `submission/program/`.
Make sure `submission/program/index.html` exists.

## 3) Copy source code

Copy the full repository into `submission/source/`, excluding:

- `node_modules`
- `.next`
- `out`

## 4) Add report and screenshots

Put research report and key-screen screenshots into `submission/document/`.

## 5) Add media assets

Put images/video/audio assets into:

- `submission/media/image`
- `submission/media/movie`
- `submission/media/sound`
