import { describe, it, expect } from 'vitest';
import { buildSecurityPrompt, computeSecurityScore } from '../src/services/securityPromptBuilder.js';

const makePrescanResults = (overrides = {}) => ({
  findings: [],
  summary: {
    totalFindings: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    secretsFound: 0,
    vulnPatternsFound: 0,
    filesScanned: 10,
    categoryCounts: {},
    ...overrides
  }
});

const makeDepResults = (overrides = {}) => ({
  manifests: [],
  dependencies: [],
  vulnerabilities: [],
  summary: {
    totalDependencies: 0,
    vulnerableDependencies: 0,
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    ecosystems: [],
    ...overrides
  }
});

const makeMetadata = (overrides = {}) => ({
  name: 'test-repo',
  owner: 'test-user',
  description: 'A test repository',
  language: 'JavaScript',
  stars: 100,
  ...overrides
});

describe('securityPromptBuilder', () => {
  describe('computeSecurityScore', () => {
    it('returns 100/A for clean repo', () => {
      const prescan = makePrescanResults();
      const deps = makeDepResults();
      const score = computeSecurityScore(prescan, deps);
      expect(score.numericScore).toBe(100);
      expect(score.grade).toBe('A');
    });

    it('deducts 20 per critical secret finding', () => {
      const prescan = makePrescanResults({ critical: 2 });
      const deps = makeDepResults();
      const score = computeSecurityScore(prescan, deps);
      expect(score.numericScore).toBe(60);
      expect(score.grade).toBe('D');
    });

    it('deducts 10 per high secret finding', () => {
      const prescan = makePrescanResults({ high: 3 });
      const deps = makeDepResults();
      const score = computeSecurityScore(prescan, deps);
      expect(score.numericScore).toBe(70);
      expect(score.grade).toBe('C');
    });

    it('deducts 5 per medium secret finding', () => {
      const prescan = makePrescanResults({ medium: 4 });
      const deps = makeDepResults();
      const score = computeSecurityScore(prescan, deps);
      expect(score.numericScore).toBe(80);
      expect(score.grade).toBe('B');
    });

    it('deducts 2 per low secret finding', () => {
      const prescan = makePrescanResults({ low: 5 });
      const deps = makeDepResults();
      const score = computeSecurityScore(prescan, deps);
      expect(score.numericScore).toBe(90);
      expect(score.grade).toBe('A');
    });

    it('deducts for dependency vulnerabilities', () => {
      const prescan = makePrescanResults();
      const deps = makeDepResults({ critical: 1, high: 2, moderate: 1 });
      const score = computeSecurityScore(prescan, deps);
      // 100 - 15 - 16 - 4 = 65 → grade D (50-69)
      expect(score.numericScore).toBe(65);
      expect(score.grade).toBe('D');
    });

    it('combines secret and dep deductions', () => {
      const prescan = makePrescanResults({ critical: 1, high: 1 });
      const deps = makeDepResults({ critical: 1 });
      const score = computeSecurityScore(prescan, deps);
      // 100 - 20 - 10 - 15 = 55
      expect(score.numericScore).toBe(55);
      expect(score.grade).toBe('D');
    });

    it('never goes below 0', () => {
      const prescan = makePrescanResults({ critical: 10 });
      const deps = makeDepResults({ critical: 10 });
      const score = computeSecurityScore(prescan, deps);
      expect(score.numericScore).toBe(0);
      expect(score.grade).toBe('F');
    });

    it('grades F for score below 50', () => {
      const prescan = makePrescanResults({ critical: 3 });
      const deps = makeDepResults();
      const score = computeSecurityScore(prescan, deps);
      // 100 - 60 = 40
      expect(score.numericScore).toBe(40);
      expect(score.grade).toBe('F');
    });

    it('returns breakdown information', () => {
      const prescan = makePrescanResults({ critical: 1, totalFindings: 1 });
      const deps = makeDepResults({ high: 1, vulnerableDependencies: 1 });
      const score = computeSecurityScore(prescan, deps);
      expect(score.breakdown).toBeDefined();
      expect(score.breakdown.secretsDeduction).toBe(20);
      expect(score.breakdown.dependenciesDeduction).toBe(8);
      expect(score.breakdown.totalFindings).toBe(2);
    });

    // Grade boundary tests
    it('grades A for score 90', () => {
      const prescan = makePrescanResults({ low: 5 });
      const score = computeSecurityScore(prescan, makeDepResults());
      expect(score.grade).toBe('A');
    });

    it('grades B for score 80-89', () => {
      const prescan = makePrescanResults({ medium: 4 }); // 100 - 20 = 80
      const score = computeSecurityScore(prescan, makeDepResults());
      expect(score.grade).toBe('B');
    });

    it('grades C for score 70-79', () => {
      const prescan = makePrescanResults({ high: 3 }); // 100 - 30 = 70
      const score = computeSecurityScore(prescan, makeDepResults());
      expect(score.grade).toBe('C');
    });

    it('grades D for score 50-69', () => {
      const prescan = makePrescanResults({ critical: 2 }); // 100 - 40 = 60
      const score = computeSecurityScore(prescan, makeDepResults());
      expect(score.grade).toBe('D');
    });
  });

  describe('buildSecurityPrompt', () => {
    it('returns systemPrompt and userPrompt', () => {
      const result = buildSecurityPrompt(
        makeMetadata(),
        [{ path: 'src/index.js', content: 'const x = 1;' }],
        makePrescanResults(),
        makeDepResults()
      );
      expect(result).toHaveProperty('systemPrompt');
      expect(result).toHaveProperty('userPrompt');
      expect(typeof result.systemPrompt).toBe('string');
      expect(typeof result.userPrompt).toBe('string');
    });

    it('includes repo name in prompt', () => {
      const result = buildSecurityPrompt(
        makeMetadata({ name: 'my-special-repo' }),
        [{ path: 'src/index.js', content: 'const x = 1;' }],
        makePrescanResults(),
        makeDepResults()
      );
      expect(result.userPrompt).toContain('my-special-repo');
    });

    it('includes prescan findings in prompt', () => {
      const prescan = makePrescanResults({ totalFindings: 3, critical: 1 });
      prescan.findings = [
        { severity: 'critical', name: 'AWS Key', file: 'config.js', line: 5, owasp: null }
      ];
      const result = buildSecurityPrompt(
        makeMetadata(),
        [{ path: 'src/index.js', content: 'code' }],
        prescan,
        makeDepResults()
      );
      expect(result.userPrompt).toContain('AWS Key');
      expect(result.userPrompt).toContain('config.js');
    });

    it('includes dependency vulnerability info in prompt', () => {
      const deps = makeDepResults({ vulnerableDependencies: 1 });
      deps.vulnerabilities = [
        { severity: 'critical', package: 'lodash', version: '4.17.15', summary: 'Prototype Pollution', fixedVersion: '4.17.21' }
      ];
      const result = buildSecurityPrompt(
        makeMetadata(),
        [{ path: 'src/index.js', content: 'code' }],
        makePrescanResults(),
        deps
      );
      expect(result.userPrompt).toContain('lodash');
      expect(result.userPrompt).toContain('Prototype Pollution');
    });

    it('includes code snippets in prompt', () => {
      const snippets = [
        { path: 'src/auth/login.js', content: 'function login(user, pass) {}' },
        { path: 'src/index.js', content: 'app.listen(3000)' }
      ];
      const result = buildSecurityPrompt(
        makeMetadata(),
        snippets,
        makePrescanResults(),
        makeDepResults()
      );
      expect(result.userPrompt).toContain('src/auth/login.js');
      expect(result.userPrompt).toContain('function login');
    });

    it('prioritizes security-relevant files', () => {
      const snippets = [
        { path: 'src/utils/format.js', content: 'format code' },
        { path: 'src/auth/middleware.js', content: 'auth middleware code' },
        { path: 'src/config/database.js', content: 'db config code' }
      ];
      const result = buildSecurityPrompt(
        makeMetadata(),
        snippets,
        makePrescanResults(),
        makeDepResults()
      );
      // auth/middleware should appear before utils/format in the prompt
      const authIdx = result.userPrompt.indexOf('auth/middleware.js');
      const utilIdx = result.userPrompt.indexOf('utils/format.js');
      expect(authIdx).toBeLessThan(utilIdx);
    });

    it('includes OWASP assessment request', () => {
      const result = buildSecurityPrompt(
        makeMetadata(),
        [{ path: 'src/index.js', content: 'code' }],
        makePrescanResults(),
        makeDepResults()
      );
      expect(result.userPrompt).toContain('OWASP');
    });

    it('handles empty code snippets', () => {
      const result = buildSecurityPrompt(
        makeMetadata(),
        [],
        makePrescanResults(),
        makeDepResults()
      );
      expect(result.systemPrompt).toBeTruthy();
      expect(result.userPrompt).toBeTruthy();
    });

    it('limits number of snippets included', () => {
      const snippets = Array.from({ length: 50 }, (_, i) => ({
        path: `src/file${i}.js`,
        content: `const x${i} = ${i};`
      }));
      const result = buildSecurityPrompt(
        makeMetadata(),
        snippets,
        makePrescanResults(),
        makeDepResults()
      );
      // Should include max 20 files
      const fileMatches = result.userPrompt.match(/## src\/file\d+\.js/g) || [];
      expect(fileMatches.length).toBeLessThanOrEqual(20);
    });
  });
});
