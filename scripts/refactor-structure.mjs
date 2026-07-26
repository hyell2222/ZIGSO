import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');

console.log('=== ZIGSO Source Code Structural Refactoring ===');

// Mapping of file moves: relative from src/
const moveMapping = {
  // components/play subfolders
  'components/play/base-score-guide-modal.tsx': 'components/play/modals/base-score-guide-modal.tsx',
  'components/play/guide-info-modal.tsx': 'components/play/modals/guide-info-modal.tsx',
  'components/play/guide-modal-scope.tsx': 'components/play/modals/guide-modal-scope.tsx',
  'components/play/play-join-modal.tsx': 'components/play/modals/play-join-modal.tsx',
  'components/play/play-resume-modal.tsx': 'components/play/modals/play-resume-modal.tsx',
  'components/play/stad-improvement-modal.tsx': 'components/play/modals/stad-improvement-modal.tsx',
  'components/play/test-score-guide-modal.tsx': 'components/play/modals/test-score-guide-modal.tsx',

  'components/play/expert-group-panel.tsx': 'components/play/panels/expert-group-panel.tsx',
  'components/play/home-group-panel.tsx': 'components/play/panels/home-group-panel.tsx',
  'components/play/overview-phase-panel.tsx': 'components/play/panels/overview-phase-panel.tsx',
  'components/play/results-phase-panel.tsx': 'components/play/panels/results-phase-panel.tsx',
  'components/play/student-join-page.tsx': 'components/play/panels/student-join-page.tsx',

  'components/play/individual-quiz-panel.tsx': 'components/play/quiz/individual-quiz-panel.tsx',
  'components/play/practice-question-card.tsx': 'components/play/quiz/practice-question-card.tsx',
  'components/play/quiz-question-list.tsx': 'components/play/quiz/quiz-question-list.tsx',
  'components/play/quiz-submit-summary.tsx': 'components/play/quiz/quiz-submit-summary.tsx',
  'components/play/play-question-support.tsx': 'components/play/quiz/play-question-support.tsx',

  'components/play/base-score-practice-table.tsx': 'components/play/stad/base-score-practice-table.tsx',
  'components/play/score-guide-help-button.tsx': 'components/play/stad/score-guide-help-button.tsx',
  'components/play/score-tile.tsx': 'components/play/stad/score-tile.tsx',
  'components/play/stad-improvement-table.tsx': 'components/play/stad/stad-improvement-table.tsx',
  'components/play/student-results-summary.tsx': 'components/play/stad/student-results-summary.tsx',

  'components/play/play-atmosphere.tsx': 'components/play/shell/play-atmosphere.tsx',
  'components/play/play-header-group-place.tsx': 'components/play/shell/play-header-group-place.tsx',
  'components/play/play-join-form.tsx': 'components/play/shell/play-join-form.tsx',
  'components/play/play-phase-shell.tsx': 'components/play/shell/play-phase-shell.tsx',
  'components/play/play-session-shell.tsx': 'components/play/shell/play-session-shell.tsx',
  'components/play/play-student-top-banner.tsx': 'components/play/shell/play-student-student-top-banner.tsx' === false ? '' : 'components/play/shell/play-student-top-banner.tsx',

  // components/activity styles
  'components/activity/activity-layout-chrome.ts': 'lib/theme/activity-layout-chrome.ts',
  'components/activity/activity-layout-typography.ts': 'lib/theme/activity-layout-typography.ts',

  // lib organization
  'lib/types.ts': 'types/index.ts',
  'lib/activity-phases.ts': 'lib/activity-pack/activity-phases.ts',
  'lib/play-resume.ts': 'lib/play/play-resume.ts'
};

// Map old import path prefix -> new import path prefix
const importPathMap = [];
for (const [oldRel, newRel] of Object.entries(moveMapping)) {
  const oldPathNoExt = oldRel.replace(/\.(tsx|ts)$/, '');
  const newPathNoExt = newRel.replace(/\.(tsx|ts)$/, '');
  importPathMap.push({
    oldImport: `@/${oldPathNoExt}`,
    newImport: `@/${newPathNoExt}`
  });
}

// Perform file moves
console.log('\n[1/3] Moving files...');
for (const [oldRel, newRel] of Object.entries(moveMapping)) {
  const oldFullPath = path.join(srcDir, oldRel);
  const newFullPath = path.join(srcDir, newRel);

  if (fs.existsSync(oldFullPath)) {
    fs.mkdirSync(path.dirname(newFullPath), { recursive: true });
    fs.renameSync(oldFullPath, newFullPath);
    console.log(`  ✓ Moved ${oldRel} -> ${newRel}`);
  } else {
    console.warn(`  ! File not found: ${oldRel}`);
  }
}

// Helper to recursively list all files in src
function getAllSrcFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(getAllSrcFiles(fullPath));
    } else if (/\.(tsx|ts|js|jsx|css)$/.test(item.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

// Update imports across all files in src/
console.log('\n[2/3] Updating import paths across src/...');
const allFiles = getAllSrcFiles(srcDir);
let updatedCount = 0;

for (const filePath of allFiles) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  for (const { oldImport, newImport } of importPathMap) {
    if (content.includes(oldImport)) {
      // Escape for regex replacement
      const escapedOld = oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match `@/path` when followed by `"`, `'`, `/`, or end of line
      const regex = new RegExp(`${escapedOld}(?=['"/]|$)`, 'g');
      content = content.replace(regex, newImport);
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    updatedCount++;
    console.log(`  ✓ Updated imports in ${path.relative(rootDir, filePath)}`);
  }
}

// Compatibility barrel files to ensure no third-party or legacy paths break
console.log('\n[3/3] Creating backward-compatibility re-exports...');

// src/lib/types.ts -> re-exports @/types
fs.writeFileSync(path.join(srcDir, 'lib/types.ts'), `export * from '@/types';\n`, 'utf-8');
// src/lib/activity-phases.ts -> re-exports @/lib/activity-pack/activity-phases
fs.writeFileSync(path.join(srcDir, 'lib/activity-phases.ts'), `export * from './activity-pack/activity-phases';\n`, 'utf-8');
// src/lib/play-resume.ts -> re-exports @/lib/play/play-resume
fs.writeFileSync(path.join(srcDir, 'lib/play-resume.ts'), `export * from './play/play-resume';\n`, 'utf-8');

console.log(`\n=== Refactoring Complete! Updated imports in ${updatedCount} files. ===`);
