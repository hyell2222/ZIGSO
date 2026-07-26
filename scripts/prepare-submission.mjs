import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const submissionDir = path.join(rootDir, 'submission');
const programDir = path.join(submissionDir, 'program');
const sourceDir = path.join(submissionDir, 'source');
const documentDir = path.join(submissionDir, 'document');
const mediaDir = path.join(submissionDir, 'media');

console.log('=== ZIGSO Submission Layout Preparation ===');

// 1. Build static export
console.log('\n[1/5] Building static export...');
try {
  execSync('cmd /c npm run export', { stdio: 'inherit' });
} catch (e) {
  console.log('Fallback to vite build...');
  execSync('npx vite build', { stdio: 'inherit' });
}

// Ensure dist exists
if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist after build!');
  process.exit(1);
}

// Function to copy directory recursively
function copyDirSync(src, dest, filterFn = null) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (filterFn && !filterFn(srcPath, entry)) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath, filterFn);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Clean directory contents
function emptyDirSync(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

// 2. Copy build output from /dist into /submission/program
console.log('\n[2/5] Copying build output from /dist to /submission/program...');
emptyDirSync(programDir);
copyDirSync(distDir, programDir);

if (fs.existsSync(path.join(programDir, 'index.html'))) {
  console.log('  ✓ Entry file verified: /submission/program/index.html');
} else {
  console.error('  ✗ Missing entry file: /submission/program/index.html');
}

// 3. Copy full source code into /submission/source (excluding unnecessary files)
console.log('\n[3/5] Copying full source code to /submission/source...');
emptyDirSync(sourceDir);

const excludeFromSource = new Set([
  'node_modules',
  '.vite',
  'dist',
  '.git',
  '.vscode',
  'submission',
  'scripts',
  'README.md',
  'README.txt',
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  '.DS_Store',
  'Thumbs.db',
  'coverage',
  '.cache'
]);

function sourceFilter(srcPath, entry) {
  const relPath = path.relative(rootDir, srcPath);
  const topLevel = relPath.split(path.sep)[0];
  const baseName = entry.name;

  if (excludeFromSource.has(topLevel) || excludeFromSource.has(baseName)) {
    return false;
  }
  // Exclude env files, log files, cache files, and readme files
  if (baseName.startsWith('.env') || baseName.endsWith('.log') || /^readme(\..*)?$/i.test(baseName)) {
    return false;
  }
  return true;
}

copyDirSync(rootDir, sourceDir, sourceFilter);
console.log('  ✓ Source code copied (excluding node_modules, .vite, dist, README files, etc.)');

// Cleanup any unnecessary readme files in /submission
const submissionReadme = path.join(submissionDir, 'README.txt');
if (fs.existsSync(submissionReadme)) {
  fs.unlinkSync(submissionReadme);
  console.log('\n[Cleanup] Removed unnecessary submission/README.txt');
}

console.log('\n=== ZIGSO Submission Layout Completed Successfully! ===');
