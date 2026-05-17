import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const submissionRoot = path.join(root, "submission");
const directories = [
  "document",
  "media",
  "media/image",
  "media/movie",
  "media/sound",
  "program",
  "source",
];

async function ensureDirectories() {
  for (const directory of directories) {
    await fs.mkdir(path.join(submissionRoot, directory), { recursive: true });
  }
}

async function writeGuide() {
  const guidePath = path.join(submissionRoot, "README.txt");
  const text = [
    "JIGSAW Submission Layout",
    "",
    "1) Build static export: npm run export",
    "2) Copy build output from /out into /submission/program",
    "3) Copy full source code (except node_modules/.next/out) into /submission/source",
    "4) Put research report and screenshots in /submission/document",
    "5) Put static media assets in /submission/media",
    "",
    "Entry file requirement:",
    "- /submission/program/index.html",
  ].join("\n");
  await fs.writeFile(guidePath, text, "utf8");
}

await ensureDirectories();
await writeGuide();

console.log("Submission skeleton created at ./submission");
