import { describe, it, expect } from 'vitest';
import { buildImpactGraph } from '../src/services/impactGraphBuilder.js';

const makeFile = (filename, status = 'modified') => ({
  filename, status, additions: 10, deletions: 5, patch: ''
});

const makeSnippet = (path, content = '') => ({ path, content });

describe('impactGraphBuilder', () => {
  describe('buildImpactGraph', () => {
    it('returns correct structure', () => {
      const files = [makeFile('src/app.js')];
      const snippets = [makeSnippet('src/app.js', 'const x = 1;')];
      const result = buildImpactGraph(files, snippets);
      expect(result).toHaveProperty('mermaidDSL');
      expect(result).toHaveProperty('stats');
      expect(result.stats).toHaveProperty('directChanges');
      expect(result.stats).toHaveProperty('rippleAffected');
      expect(result.stats).toHaveProperty('connections');
    });

    it('handles empty files', () => {
      const result = buildImpactGraph([], []);
      expect(result.stats.directChanges).toBe(0);
      expect(result.mermaidDSL).toContain('No file changes');
    });

    it('handles null files', () => {
      const result = buildImpactGraph(null, []);
      expect(result.stats.directChanges).toBe(0);
    });

    it('counts direct changes correctly', () => {
      const files = [
        makeFile('src/a.js'),
        makeFile('src/b.js'),
        makeFile('src/c.js', 'added')
      ];
      const result = buildImpactGraph(files, []);
      expect(result.stats.directChanges).toBe(3);
    });

    it('counts file statuses', () => {
      const files = [
        makeFile('src/a.js', 'added'),
        makeFile('src/b.js', 'modified'),
        makeFile('src/c.js', 'removed'),
        makeFile('src/d.js', 'renamed')
      ];
      const result = buildImpactGraph(files, []);
      expect(result.stats.addedFiles).toBe(1);
      expect(result.stats.modifiedFiles).toBe(1);
      expect(result.stats.deletedFiles).toBe(1);
      expect(result.stats.renamedFiles).toBe(1);
    });

    it('generates mermaid DSL with graph header', () => {
      const files = [makeFile('src/app.js')];
      const result = buildImpactGraph(files, []);
      expect(result.mermaidDSL).toContain('graph LR');
    });

    it('creates subgraphs by directory', () => {
      const files = [
        makeFile('src/auth/login.js'),
        makeFile('src/auth/logout.js'),
        makeFile('src/utils/format.js')
      ];
      const result = buildImpactGraph(files, []);
      expect(result.mermaidDSL).toContain('src/auth');
      expect(result.mermaidDSL).toContain('src/utils');
    });

    it('applies correct styles for file statuses', () => {
      const files = [
        makeFile('src/new.js', 'added'),
        makeFile('src/old.js', 'removed')
      ];
      const result = buildImpactGraph(files, []);
      expect(result.mermaidDSL).toContain('#22c55e'); // green for added
      expect(result.mermaidDSL).toContain('#ef4444'); // red for removed
    });

    it('detects import connections between changed files', () => {
      const files = [
        makeFile('src/app.js'),
        makeFile('src/utils.js')
      ];
      const snippets = [
        makeSnippet('src/app.js', "import { format } from './utils.js';"),
        makeSnippet('src/utils.js', 'export const format = () => {};')
      ];
      const result = buildImpactGraph(files, snippets);
      expect(result.stats.connections).toBeGreaterThanOrEqual(1);
      expect(result.mermaidDSL).toContain('-->');
    });

    it('detects ripple effect (unchanged file importing changed file)', () => {
      const files = [
        makeFile('src/utils.js')
      ];
      const snippets = [
        makeSnippet('src/utils.js', 'export const format = () => {};'),
        makeSnippet('src/app.js', "import { format } from './utils.js';")
      ];
      const result = buildImpactGraph(files, snippets);
      expect(result.stats.rippleAffected).toBeGreaterThanOrEqual(1);
    });

    it('includes ripple class definition in DSL', () => {
      const files = [makeFile('src/app.js')];
      const result = buildImpactGraph(files, []);
      expect(result.mermaidDSL).toContain('classDef ripple');
    });

    it('handles single file change', () => {
      const files = [makeFile('index.js')];
      const result = buildImpactGraph(files, []);
      expect(result.stats.directChanges).toBe(1);
      expect(result.mermaidDSL).toContain('index.js');
    });
  });
});
