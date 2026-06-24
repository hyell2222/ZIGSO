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
    "ZIGSO Submission Layout",
    "",
    "1) Build static export: npm run export",
    "2) Copy build output from /dist into /submission/program",
    "3) Copy full source code (except node_modules/.vite/dist) into /submission/source",
    "4) Put research report and screenshots in /submission/document",
    "5) Put static media assets in /submission/media",
    "",
    "Entry file requirement:",
    "- /submission/program/index.html",
  ].join("\n");
  await fs.writeFile(guidePath, text, "utf8");
}

async function copyDir(src, dest, exclude = []) {
  await fs.mkdir(dest, { recursive: true });
  let entries;
  try {
    entries = await fs.readdir(src, { withFileTypes: true });
  } catch (err) {
    if (err.code === "EPERM" || err.code === "EACCES") {
      console.warn(`Warning: Permission denied for reading directory "${src}". Skipping...`);
      return;
    }
    throw err;
  }

  for (const entry of entries) {
    if (exclude.includes(entry.name)) {
      continue;
    }
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    try {
      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath, exclude);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    } catch (err) {
      if (err.code === "EPERM" || err.code === "EACCES") {
        console.warn(`Warning: Permission denied for copying "${srcPath}". Skipping...`);
      } else {
        throw err;
      }
    }
  }
}

async function cleanAndCopySource() {
  const sourceDest = path.join(submissionRoot, "source");
  // Clean target source folder first to avoid dirty files
  await fs.rm(sourceDest, { recursive: true, force: true });
  await fs.mkdir(sourceDest, { recursive: true });

  const excludeList = [
    "node_modules",
    "dist",
    ".git",
    ".vscode",
    "submission",
    ".env",
    ".env.local",
    "tsconfig.tsbuildinfo",
    "scratch-test.mjs",
  ];

  await copyDir(root, sourceDest, excludeList);
  console.log("Source code successfully copied to ./submission/source (excluding node_modules, dist, secrets, and caches).");
}

await ensureDirectories();
await writeGuide();
await cleanAndCopySource();

console.log("Submission skeleton created at ./submission");
