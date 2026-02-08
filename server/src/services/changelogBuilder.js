// Changelog Builder — parses commits into structured changelog sections
// and detects breaking changes from diff data

// Conventional commit type mapping
const COMMIT_TYPES = {
  feat: { label: 'Features', emoji: '🚀', order: 0 },
  fix: { label: 'Bug Fixes', emoji: '🐛', order: 1 },
  refactor: { label: 'Refactoring', emoji: '🔧', order: 2 },
  perf: { label: 'Performance', emoji: '⚡', order: 3 },
  docs: { label: 'Documentation', emoji: '📚', order: 4 },
  test: { label: 'Tests', emoji: '🧪', order: 5 },
  ci: { label: 'CI/CD', emoji: '🔄', order: 6 },
  chore: { label: 'Chores', emoji: '🏗️', order: 7 },
  style: { label: 'Style', emoji: '🎨', order: 8 },
  build: { label: 'Build', emoji: '📦', order: 9 }
};

// Keyword fallback for non-conventional commits
const KEYWORD_MAP = [
  { keywords: ['add', 'new', 'feature', 'implement', 'introduce', 'support'], type: 'feat' },
  { keywords: ['fix', 'bug', 'patch', 'resolve', 'correct', 'repair', 'issue'], type: 'fix' },
  { keywords: ['refactor', 'restructure', 'reorganize', 'clean', 'simplify', 'extract'], type: 'refactor' },
  { keywords: ['perf', 'performance', 'optimize', 'speed', 'fast', 'cache'], type: 'perf' },
  { keywords: ['doc', 'readme', 'comment', 'jsdoc', 'changelog', 'license'], type: 'docs' },
  { keywords: ['test', 'spec', 'coverage', 'assert', 'mock', 'jest', 'vitest'], type: 'test' },
  { keywords: ['ci', 'pipeline', 'workflow', 'deploy', 'github actions', 'docker'], type: 'ci' },
  { keywords: ['chore', 'deps', 'dependency', 'upgrade', 'bump', 'update', 'version'], type: 'chore' }
];

/**
 * Parse a commit message into type + scope + description
 * Handles: "feat(auth): add login", "fix: resolve crash", "add new feature"
 */
const parseCommitMessage = (message) => {
  // Try conventional commit format: type(scope): description
  const conventionalMatch = message.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)/);
  if (conventionalMatch) {
    const [, type, scope, breaking, description] = conventionalMatch;
    const normalizedType = type.toLowerCase();
    return {
      type: COMMIT_TYPES[normalizedType] ? normalizedType : 'other',
      scope: scope || null,
      description: description.trim(),
      isBreaking: !!breaking || /BREAKING[\s-]CHANGE/i.test(message),
      isConventional: true
    };
  }

  // Fallback: keyword detection
  const lowerMessage = message.toLowerCase();
  for (const { keywords, type } of KEYWORD_MAP) {
    if (keywords.some(kw => lowerMessage.includes(kw))) {
      return {
        type,
        scope: null,
        description: message.trim(),
        isBreaking: /break|BREAKING[\s-]CHANGE/i.test(message),
        isConventional: false
      };
    }
  }

  return {
    type: 'other',
    scope: null,
    description: message.trim(),
    isBreaking: false,
    isConventional: false
  };
};

/**
 * Detect potential breaking changes from file diffs
 */
export const detectBreakingChanges = (files) => {
  const breakingChanges = [];

  for (const file of files) {
    const patch = file.patch || '';
    const filename = file.filename;

    // Deleted files are always potentially breaking
    if (file.status === 'removed') {
      breakingChanges.push({
        file: filename,
        type: 'file-deleted',
        description: `File "${filename}" was deleted`,
        severity: 'high'
      });
      continue;
    }

    // Renamed files can break imports
    if (file.status === 'renamed') {
      breakingChanges.push({
        file: filename,
        type: 'file-renamed',
        description: `File was renamed to "${filename}"`,
        severity: 'medium'
      });
    }

    if (!patch) continue;

    const deletedLines = patch.split('\n')
      .filter(line => line.startsWith('-') && !line.startsWith('---'))
      .map(line => line.substring(1).trim());

    // Detect removed exports (JS/TS)
    for (const line of deletedLines) {
      if (/^export\s+(default\s+)?(function|class|const|let|var|interface|type)\s+(\w+)/.test(line)) {
        const match = line.match(/^export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type)\s+(\w+)/);
        if (match) {
          breakingChanges.push({
            file: filename,
            type: 'export-removed',
            description: `Exported symbol "${match[1]}" was removed from ${filename}`,
            severity: 'high'
          });
        }
      }

      // Detect removed API routes
      if (/\.(get|post|put|patch|delete|route)\s*\(\s*['"`]/.test(line)) {
        const routeMatch = line.match(/\.(get|post|put|patch|delete|route)\s*\(\s*['"`]([^'"`]+)/);
        if (routeMatch) {
          breakingChanges.push({
            file: filename,
            type: 'route-removed',
            description: `${routeMatch[1].toUpperCase()} ${routeMatch[2]} endpoint removed in ${filename}`,
            severity: 'high'
          });
        }
      }

      // Detect removed Python function/class defs
      if (/^def\s+\w+|^class\s+\w+/.test(line)) {
        const defMatch = line.match(/^(def|class)\s+(\w+)/);
        if (defMatch) {
          breakingChanges.push({
            file: filename,
            type: 'definition-removed',
            description: `${defMatch[1] === 'class' ? 'Class' : 'Function'} "${defMatch[2]}" removed from ${filename}`,
            severity: 'medium'
          });
        }
      }
    }

    // Detect package.json major version bumps
    if (filename === 'package.json' || filename.endsWith('/package.json')) {
      const addedLines = patch.split('\n')
        .filter(line => line.startsWith('+') && !line.startsWith('+++'));

      for (const line of addedLines) {
        const versionMatch = line.match(/"version"\s*:\s*"(\d+)\./);
        if (versionMatch) {
          // Check if the deleted version had a different major
          const oldVersionLine = deletedLines.find(l => /"version"/.test(l));
          if (oldVersionLine) {
            const oldMatch = oldVersionLine.match(/"version"\s*:\s*"(\d+)\./);
            if (oldMatch && oldMatch[1] !== versionMatch[1]) {
              breakingChanges.push({
                file: filename,
                type: 'major-version-bump',
                description: `Major version bumped from v${oldMatch[1]}.x to v${versionMatch[1]}.x`,
                severity: 'high'
              });
            }
          }
        }
      }
    }
  }

  // Deduplicate
  const seen = new Set();
  return breakingChanges.filter(bc => {
    const key = `${bc.type}:${bc.file}:${bc.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Build a structured changelog from commits and file data
 */
export const buildChangelog = (commits, files, compareData) => {
  // Parse all commits
  const parsed = commits.map(commit => ({
    ...commit,
    parsed: parseCommitMessage(commit.message)
  }));

  // Group by type
  const sections = {};
  for (const commit of parsed) {
    const type = commit.parsed.type;
    if (!sections[type]) {
      const typeInfo = COMMIT_TYPES[type] || { label: 'Other Changes', emoji: '📝', order: 99 };
      sections[type] = {
        type,
        label: typeInfo.label,
        emoji: typeInfo.emoji,
        order: typeInfo.order,
        items: []
      };
    }
    sections[type].items.push({
      message: commit.parsed.description,
      scope: commit.parsed.scope,
      author: commit.author,
      sha: commit.shortSha || commit.sha?.substring(0, 7),
      date: commit.date,
      isBreaking: commit.parsed.isBreaking,
      isConventional: commit.parsed.isConventional
    });
  }

  // Sort sections by order
  const sortedSections = Object.values(sections).sort((a, b) => a.order - b.order);

  // Detect breaking changes from diffs
  const breakingChanges = detectBreakingChanges(files);

  // Also include commits marked as breaking
  for (const commit of parsed) {
    if (commit.parsed.isBreaking) {
      breakingChanges.push({
        file: null,
        type: 'commit-breaking',
        description: commit.parsed.description,
        severity: 'high'
      });
    }
  }

  // Compute highlights
  const fileChangeCounts = {};
  for (const file of files) {
    fileChangeCounts[file.filename] = (file.additions || 0) + (file.deletions || 0);
  }
  const mostChangedFile = Object.entries(fileChangeCounts)
    .sort(([, a], [, b]) => b - a)[0];

  const authorCounts = {};
  for (const commit of commits) {
    authorCounts[commit.author] = (authorCounts[commit.author] || 0) + 1;
  }
  const topContributor = Object.entries(authorCounts)
    .sort(([, a], [, b]) => b - a)[0];

  const highlights = {
    mostChangedFile: mostChangedFile ? { name: mostChangedFile[0], changes: mostChangedFile[1] } : null,
    topContributor: topContributor ? { name: topContributor[0], commits: topContributor[1] } : null,
    totalCommits: commits.length,
    totalFiles: files.length,
    additions: compareData.additions,
    deletions: compareData.deletions,
    conventionalCommitRatio: parsed.filter(p => p.parsed.isConventional).length / Math.max(parsed.length, 1)
  };

  return { sections: sortedSections, breakingChanges, highlights };
};

/**
 * Generate a markdown changelog string from the structured data
 */
export const changelogToMarkdown = (changelog) => {
  let md = '# Changelog\n\n';

  // Breaking changes first
  if (changelog.breakingChanges.length > 0) {
    md += '## ⚠️ Breaking Changes\n\n';
    for (const bc of changelog.breakingChanges) {
      md += `- **${bc.type}**: ${bc.description}\n`;
    }
    md += '\n';
  }

  // Sections
  for (const section of changelog.sections) {
    md += `## ${section.emoji} ${section.label}\n\n`;
    for (const item of section.items) {
      const scope = item.scope ? `**${item.scope}:** ` : '';
      const breaking = item.isBreaking ? ' ⚠️' : '';
      md += `- ${scope}${item.message}${breaking} (${item.sha} by ${item.author})\n`;
    }
    md += '\n';
  }

  // Highlights
  if (changelog.highlights) {
    md += `---\n\n`;
    md += `**Stats:** ${changelog.highlights.totalCommits} commits, ${changelog.highlights.totalFiles} files, `;
    md += `+${changelog.highlights.additions}/-${changelog.highlights.deletions}\n`;
    if (changelog.highlights.topContributor) {
      md += `**Top contributor:** ${changelog.highlights.topContributor.name} (${changelog.highlights.topContributor.commits} commits)\n`;
    }
  }

  return md;
};
