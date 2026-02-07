import { describe, it, expect, vi } from 'vitest';
import { auditDependencies } from '../src/services/dependencyAuditor.js';

// Mock axios to avoid real API calls in tests
vi.mock('axios', () => ({
  default: {
    post: vi.fn().mockRejectedValue(new Error('API mocked out')),
  }
}));

const snippet = (path, content) => ({
  path,
  content: typeof content === 'object' ? JSON.stringify(content) : content
});

describe('dependencyAuditor', () => {
  describe('auditDependencies', () => {
    it('returns correct structure with no manifest files', async () => {
      const snippets = [
        snippet('src/index.js', 'const x = 1;')
      ];
      const result = await auditDependencies(snippets);
      expect(result).toHaveProperty('manifests');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('vulnerabilities');
      expect(result).toHaveProperty('summary');
      expect(result.summary.totalDependencies).toBe(0);
      expect(result.summary.vulnerableDependencies).toBe(0);
    });

    it('parses package.json dependencies', async () => {
      const pkg = {
        name: 'test-app',
        dependencies: {
          express: '^4.18.2',
          lodash: '4.17.15'
        },
        devDependencies: {
          jest: '^29.0.0'
        }
      };
      const snippets = [snippet('package.json', pkg)];
      const result = await auditDependencies(snippets);
      expect(result.manifests).toHaveLength(1);
      expect(result.manifests[0].ecosystem).toBe('npm');
      expect(result.dependencies.length).toBe(3);
      expect(result.dependencies.find(d => d.name === 'express')).toBeDefined();
      expect(result.dependencies.find(d => d.name === 'lodash')).toBeDefined();
      expect(result.dependencies.find(d => d.name === 'jest')).toBeDefined();
    });

    it('detects vulnerable lodash version from known CVEs', async () => {
      const pkg = {
        dependencies: {
          lodash: '4.17.15'
        }
      };
      const snippets = [snippet('package.json', pkg)];
      const result = await auditDependencies(snippets);
      const lodashVuln = result.vulnerabilities.find(v => v.package === 'lodash');
      expect(lodashVuln).toBeDefined();
      expect(lodashVuln.severity).toBe('critical');
      expect(lodashVuln.fixedVersion).toBe('4.17.21');
    });

    it('does NOT flag lodash 4.17.21 (patched)', async () => {
      const pkg = {
        dependencies: {
          lodash: '4.17.21'
        }
      };
      const snippets = [snippet('package.json', pkg)];
      const result = await auditDependencies(snippets);
      const lodashVuln = result.vulnerabilities.find(v => v.package === 'lodash');
      expect(lodashVuln).toBeUndefined();
    });

    it('detects vulnerable minimist', async () => {
      const pkg = { dependencies: { minimist: '1.2.5' } };
      const snippets = [snippet('package.json', pkg)];
      const result = await auditDependencies(snippets);
      const vuln = result.vulnerabilities.find(v => v.package === 'minimist');
      expect(vuln).toBeDefined();
      expect(vuln.severity).toBe('critical');
    });

    it('detects vulnerable express version', async () => {
      const pkg = { dependencies: { express: '4.18.1' } };
      const snippets = [snippet('package.json', pkg)];
      const result = await auditDependencies(snippets);
      const vuln = result.vulnerabilities.find(v => v.package === 'express');
      expect(vuln).toBeDefined();
      expect(vuln.fixedVersion).toBe('4.19.2');
    });

    it('detects vulnerable jsonwebtoken', async () => {
      const pkg = { dependencies: { jsonwebtoken: '8.5.1' } };
      const snippets = [snippet('package.json', pkg)];
      const result = await auditDependencies(snippets);
      const vuln = result.vulnerabilities.find(v => v.package === 'jsonwebtoken');
      expect(vuln).toBeDefined();
    });

    it('detects vulnerable axios version', async () => {
      const pkg = { dependencies: { axios: '1.5.0' } };
      const snippets = [snippet('package.json', pkg)];
      const result = await auditDependencies(snippets);
      const vuln = result.vulnerabilities.find(v => v.package === 'axios');
      expect(vuln).toBeDefined();
    });

    it('parses requirements.txt', async () => {
      const content = 'flask==2.0.1\nrequests>=2.25.0\n# comment\nnumpy';
      const snippets = [snippet('requirements.txt', content)];
      const result = await auditDependencies(snippets);
      expect(result.manifests).toHaveLength(1);
      expect(result.manifests[0].ecosystem).toBe('pypi');
      expect(result.dependencies.length).toBeGreaterThanOrEqual(2);
    });

    it('parses go.mod', async () => {
      const content = `module github.com/example/app

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/lib/pq v1.10.9
)`;
      const snippets = [snippet('go.mod', content)];
      const result = await auditDependencies(snippets);
      expect(result.manifests).toHaveLength(1);
      expect(result.manifests[0].ecosystem).toBe('go');
      expect(result.dependencies.length).toBeGreaterThanOrEqual(2);
    });

    it('parses nested package.json (not in node_modules)', async () => {
      const pkg = { dependencies: { react: '^18.0.0' } };
      const snippets = [snippet('frontend/package.json', pkg)];
      const result = await auditDependencies(snippets);
      expect(result.manifests).toHaveLength(1);
      expect(result.dependencies.length).toBe(1);
    });

    it('skips node_modules package.json', async () => {
      const pkg = { dependencies: { lodash: '4.17.15' } };
      const snippets = [snippet('node_modules/something/package.json', pkg)];
      const result = await auditDependencies(snippets);
      expect(result.manifests).toHaveLength(0);
      expect(result.dependencies).toHaveLength(0);
    });

    it('handles multiple manifest files', async () => {
      const pkg = { dependencies: { express: '4.18.2' } };
      const reqTxt = 'flask==2.0.1';
      const snippets = [
        snippet('package.json', pkg),
        snippet('requirements.txt', reqTxt)
      ];
      const result = await auditDependencies(snippets);
      expect(result.manifests).toHaveLength(2);
      expect(result.summary.ecosystems).toContain('npm');
      expect(result.summary.ecosystems).toContain('pypi');
    });

    it('computes summary severity counts correctly', async () => {
      const pkg = {
        dependencies: {
          lodash: '4.17.15',       // critical
          'node-fetch': '2.6.0',   // high
          express: '4.18.1',       // medium
        }
      };
      const snippets = [snippet('package.json', pkg)];
      const result = await auditDependencies(snippets);
      expect(result.summary.vulnerableDependencies).toBeGreaterThanOrEqual(3);
      expect(result.summary.critical).toBeGreaterThanOrEqual(1);
      expect(result.summary.high).toBeGreaterThanOrEqual(1);
    });

    it('handles empty snippets', async () => {
      const result = await auditDependencies([]);
      expect(result.manifests).toHaveLength(0);
      expect(result.vulnerabilities).toHaveLength(0);
      expect(result.summary.totalDependencies).toBe(0);
    });

    it('handles malformed package.json gracefully', async () => {
      const snippets = [snippet('package.json', 'not valid json {{{')];
      const result = await auditDependencies(snippets);
      expect(result.manifests).toHaveLength(0);
    });

    it('handles package.json with caret/tilde versions', async () => {
      const pkg = { dependencies: { lodash: '^4.17.15', minimist: '~1.2.5' } };
      const snippets = [snippet('package.json', pkg)];
      const result = await auditDependencies(snippets);
      // Both should be detected as vulnerable
      expect(result.vulnerabilities.length).toBeGreaterThanOrEqual(2);
    });

    it('vulnerability has correct shape', async () => {
      const pkg = { dependencies: { lodash: '4.17.15' } };
      const snippets = [snippet('package.json', pkg)];
      const result = await auditDependencies(snippets);
      const vuln = result.vulnerabilities[0];
      expect(vuln).toHaveProperty('package');
      expect(vuln).toHaveProperty('version');
      expect(vuln).toHaveProperty('severity');
      expect(vuln).toHaveProperty('ghsaId');
      expect(vuln).toHaveProperty('summary');
      expect(vuln).toHaveProperty('fixedVersion');
      expect(vuln).toHaveProperty('file');
    });
  });
});
