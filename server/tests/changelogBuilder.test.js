import { describe, it, expect } from 'vitest';
import { buildChangelog, detectBreakingChanges, changelogToMarkdown } from '../src/services/changelogBuilder.js';

const makeCommit = (message, author = 'alice', sha = 'abc1234') => ({
  sha,
  shortSha: sha.substring(0, 7),
  message,
  author,
  date: '2024-01-15T10:00:00Z'
});

const makeFile = (filename, status = 'modified', additions = 10, deletions = 5, patch = '') => ({
  filename, status, additions, deletions, patch
});

const makeCompareData = (additions = 100, deletions = 50) => ({
  additions, deletions
});

describe('changelogBuilder', () => {
  describe('buildChangelog', () => {
    it('returns correct structure', () => {
      const commits = [makeCommit('feat: add login')];
      const files = [makeFile('src/auth.js')];
      const result = buildChangelog(commits, files, makeCompareData());
      expect(result).toHaveProperty('sections');
      expect(result).toHaveProperty('breakingChanges');
      expect(result).toHaveProperty('highlights');
    });

    it('groups conventional commits by type', () => {
      const commits = [
        makeCommit('feat: add login'),
        makeCommit('feat(auth): add logout'),
        makeCommit('fix: resolve crash'),
        makeCommit('docs: update README')
      ];
      const result = buildChangelog(commits, [], makeCompareData());
      const featSection = result.sections.find(s => s.type === 'feat');
      const fixSection = result.sections.find(s => s.type === 'fix');
      const docsSection = result.sections.find(s => s.type === 'docs');
      expect(featSection.items).toHaveLength(2);
      expect(fixSection.items).toHaveLength(1);
      expect(docsSection.items).toHaveLength(1);
    });

    it('handles non-conventional commits with keyword fallback', () => {
      const commits = [
        makeCommit('add new search feature'),
        makeCommit('fix the login bug')
      ];
      const result = buildChangelog(commits, [], makeCompareData());
      const featSection = result.sections.find(s => s.type === 'feat');
      const fixSection = result.sections.find(s => s.type === 'fix');
      expect(featSection).toBeDefined();
      expect(fixSection).toBeDefined();
    });

    it('classifies unrecognized commits as other', () => {
      const commits = [makeCommit('tweak the config values')];
      const result = buildChangelog(commits, [], makeCompareData());
      const otherSection = result.sections.find(s => s.type === 'other');
      expect(otherSection).toBeDefined();
      expect(otherSection.items).toHaveLength(1);
    });

    it('sections are sorted by order', () => {
      const commits = [
        makeCommit('docs: update readme'),
        makeCommit('feat: new feature'),
        makeCommit('fix: bug fix')
      ];
      const result = buildChangelog(commits, [], makeCompareData());
      const types = result.sections.map(s => s.type);
      expect(types.indexOf('feat')).toBeLessThan(types.indexOf('fix'));
      expect(types.indexOf('fix')).toBeLessThan(types.indexOf('docs'));
    });

    it('detects breaking changes from commits with !', () => {
      const commits = [makeCommit('feat!: rewrite API')];
      const result = buildChangelog(commits, [], makeCompareData());
      expect(result.breakingChanges.length).toBeGreaterThanOrEqual(1);
      const bc = result.breakingChanges.find(b => b.type === 'commit-breaking');
      expect(bc).toBeDefined();
    });

    it('computes highlights correctly', () => {
      const commits = [
        makeCommit('feat: thing', 'alice', 'aaa1111'),
        makeCommit('fix: bug', 'alice', 'bbb2222'),
        makeCommit('docs: readme', 'bob', 'ccc3333')
      ];
      const files = [
        makeFile('src/big.js', 'modified', 100, 50),
        makeFile('src/small.js', 'modified', 5, 2)
      ];
      const result = buildChangelog(commits, files, makeCompareData());
      expect(result.highlights.mostChangedFile.name).toBe('src/big.js');
      expect(result.highlights.topContributor.name).toBe('alice');
      expect(result.highlights.totalCommits).toBe(3);
    });

    it('computes conventionalCommitRatio', () => {
      const commits = [
        makeCommit('feat: conventional'),
        makeCommit('fix: also conventional'),
        makeCommit('random non-conventional')
      ];
      const result = buildChangelog(commits, [], makeCompareData());
      expect(result.highlights.conventionalCommitRatio).toBeCloseTo(2 / 3, 1);
    });

    it('handles empty commits', () => {
      const result = buildChangelog([], [], makeCompareData());
      expect(result.sections).toHaveLength(0);
      expect(result.breakingChanges).toHaveLength(0);
    });

    it('includes scope in parsed commit', () => {
      const commits = [makeCommit('feat(auth): add oauth')];
      const result = buildChangelog(commits, [], makeCompareData());
      const featSection = result.sections.find(s => s.type === 'feat');
      expect(featSection.items[0].scope).toBe('auth');
    });
  });

  describe('detectBreakingChanges', () => {
    it('detects deleted files', () => {
      const files = [makeFile('src/old.js', 'removed')];
      const result = detectBreakingChanges(files);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('file-deleted');
      expect(result[0].severity).toBe('high');
    });

    it('detects renamed files', () => {
      const files = [makeFile('src/new-name.js', 'renamed')];
      const result = detectBreakingChanges(files);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('file-renamed');
      expect(result[0].severity).toBe('medium');
    });

    it('detects removed exports', () => {
      const patch = `-export function login() {\n+// removed\n`;
      const files = [makeFile('src/auth.js', 'modified', 1, 1, patch)];
      const result = detectBreakingChanges(files);
      const exportRemoved = result.find(r => r.type === 'export-removed');
      expect(exportRemoved).toBeDefined();
      expect(exportRemoved.description).toContain('login');
    });

    it('detects removed API routes', () => {
      const patch = `-.get('/api/users', handler)\n+// route removed\n`;
      const files = [makeFile('src/routes.js', 'modified', 1, 1, patch)];
      const result = detectBreakingChanges(files);
      const routeRemoved = result.find(r => r.type === 'route-removed');
      expect(routeRemoved).toBeDefined();
    });

    it('detects removed Python defs', () => {
      const patch = `-def old_function():\n+# removed\n`;
      const files = [makeFile('app/utils.py', 'modified', 1, 1, patch)];
      const result = detectBreakingChanges(files);
      const defRemoved = result.find(r => r.type === 'definition-removed');
      expect(defRemoved).toBeDefined();
      expect(defRemoved.description).toContain('old_function');
    });

    it('detects major version bumps', () => {
      const patch = `-  "version": "1.5.0",\n+  "version": "2.0.0",\n`;
      const files = [makeFile('package.json', 'modified', 1, 1, patch)];
      const result = detectBreakingChanges(files);
      const versionBump = result.find(r => r.type === 'major-version-bump');
      expect(versionBump).toBeDefined();
      expect(versionBump.description).toContain('v1');
      expect(versionBump.description).toContain('v2');
    });

    it('does NOT flag minor version bumps', () => {
      const patch = `-  "version": "1.5.0",\n+  "version": "1.6.0",\n`;
      const files = [makeFile('package.json', 'modified', 1, 1, patch)];
      const result = detectBreakingChanges(files);
      const versionBump = result.find(r => r.type === 'major-version-bump');
      expect(versionBump).toBeUndefined();
    });

    it('deduplicates findings', () => {
      const files = [
        makeFile('src/old.js', 'removed'),
        makeFile('src/old.js', 'removed')
      ];
      const result = detectBreakingChanges(files);
      expect(result).toHaveLength(1);
    });

    it('returns empty for clean modifications', () => {
      const patch = `+const x = 1;\n`;
      const files = [makeFile('src/app.js', 'modified', 1, 0, patch)];
      const result = detectBreakingChanges(files);
      expect(result).toHaveLength(0);
    });
  });

  describe('changelogToMarkdown', () => {
    it('generates valid markdown', () => {
      const changelog = buildChangelog(
        [makeCommit('feat: add login'), makeCommit('fix: resolve crash')],
        [],
        makeCompareData()
      );
      const md = changelogToMarkdown(changelog);
      expect(md).toContain('# Changelog');
      expect(md).toContain('Features');
      expect(md).toContain('Bug Fixes');
      expect(md).toContain('add login');
    });

    it('includes breaking changes section when present', () => {
      const changelog = {
        sections: [],
        breakingChanges: [{ type: 'file-deleted', description: 'old.js deleted' }],
        highlights: { totalCommits: 0, totalFiles: 0, additions: 0, deletions: 0 }
      };
      const md = changelogToMarkdown(changelog);
      expect(md).toContain('Breaking Changes');
      expect(md).toContain('old.js deleted');
    });
  });
});
