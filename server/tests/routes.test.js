import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external services before importing the router
vi.mock('../src/services/githubService.js', () => ({
  parseGithubUrl: vi.fn((url) => {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) throw new Error('Invalid GitHub URL');
    return { owner: match[1], repo: match[2] };
  }),
  parseGithubPrOrIssueUrl: vi.fn(),
  getRepoMetadata: vi.fn().mockResolvedValue({
    name: 'test-repo',
    owner: 'test-user',
    description: 'Test',
    language: 'JavaScript',
    stars: 50,
    defaultBranch: 'main',
    topics: []
  }),
  getRelevantCodeFiles: vi.fn().mockResolvedValue({
    files: [{ path: 'src/index.js' }, { path: 'package.json' }],
    branch: 'main'
  }),
  getCodeSnippets: vi.fn().mockResolvedValue([
    { path: 'src/index.js', content: 'const app = express();\napp.listen(3000);' },
    { path: 'package.json', content: '{"name":"test","dependencies":{"express":"4.18.2"}}' }
  ]),
  getSecurityScanFiles: vi.fn().mockResolvedValue({
    files: [
      { path: 'src/index.js' },
      { path: 'src/auth.js' },
      { path: 'package.json' }
    ],
    branch: 'main',
    totalRelevantFiles: 3
  }),
  getSecurityCodeSnippets: vi.fn().mockResolvedValue([
    { path: 'src/index.js', content: 'const app = express();\neval(userInput);\napp.listen(3000);' },
    { path: 'src/auth.js', content: 'const password = "supersecretpassword1234";\nconst url = "http://api.example.com";' },
    { path: 'package.json', content: '{"name":"test","dependencies":{"lodash":"4.17.15","express":"4.18.1"}}' }
  ]),
  getRecentCommits: vi.fn().mockResolvedValue([]),
  getCompare: vi.fn(),
  getRepoTree: vi.fn().mockResolvedValue([]),
  getCodeSnippetsAtRef: vi.fn(),
  getPRDetails: vi.fn(),
  getIssueDetails: vi.fn(),
  getArchitectureCodeFiles: vi.fn().mockResolvedValue({ files: [], branch: 'main' }),
  getArchitectureSnippets: vi.fn().mockResolvedValue([])
}));

vi.mock('../src/services/groqService.js', () => ({
  generateCodeOverview: vi.fn(),
  generateCodeExplanation: vi.fn(),
  generateLearningGuide: vi.fn(),
  streamCodeAnalysis: vi.fn(),
  streamChatResponse: vi.fn(),
  streamEvolutionAnalysis: vi.fn(),
  streamArchitectureAnalysis: vi.fn(),
  streamPRAnalysis: vi.fn(),
  streamIssueAnalysis: vi.fn(),
  streamReadmeGeneration: vi.fn(),
  streamPromptGeneration: vi.fn(),
  streamSecurityAnalysis: vi.fn().mockResolvedValue({
    [Symbol.asyncIterator]: async function* () {
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: '## Security Analysis\n' } };
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'No critical issues.' } };
    }
  })
}));

// Now import express and the router
import express from 'express';
import { analyzeRepoRoute } from '../src/routes/analyze.js';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api', analyzeRepoRoute);
  return app;
};

// Helper to make requests and collect SSE stream
const collectSSE = (res) => {
  return new Promise((resolve, reject) => {
    let data = '';
    res.on('data', chunk => { data += chunk.toString(); });
    res.on('end', () => {
      const events = data
        .split('\n')
        .filter(line => line.startsWith('data: '))
        .map(line => {
          try { return JSON.parse(line.slice(6)); }
          catch { return null; }
        })
        .filter(Boolean);
      resolve(events);
    });
    res.on('error', reject);
  });
};

describe('API Routes', () => {
  describe('POST /api/security-scan', () => {
    it('returns 400 without repoUrl', async () => {
      const app = createApp();
      const http = await import('http');
      const server = http.createServer(app);

      await new Promise(resolve => server.listen(0, resolve));
      const port = server.address().port;

      try {
        const res = await fetch(`http://localhost:${port}/api/security-scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('repoUrl is required');
      } finally {
        server.close();
      }
    });

    it('streams correct SSE event sequence for security scan', async () => {
      const app = createApp();
      const http = await import('http');
      const server = http.createServer(app);

      await new Promise(resolve => server.listen(0, resolve));
      const port = server.address().port;

      try {
        const res = await fetch(`http://localhost:${port}/api/security-scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl: 'https://github.com/test-user/test-repo' })
        });
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe('text/event-stream');

        const text = await res.text();
        const events = text
          .split('\n')
          .filter(line => line.startsWith('data: '))
          .map(line => { try { return JSON.parse(line.slice(6)); } catch { return null; } })
          .filter(Boolean);

        // Check event sequence
        const types = events.map(e => e.type);
        expect(types).toContain('metadata');
        expect(types).toContain('prescan_results');
        expect(types).toContain('dependency_results');
        expect(types).toContain('score');
        expect(types).toContain('analysis_chunk');
        expect(types).toContain('complete');

        // metadata should be first
        expect(types[0]).toBe('metadata');

        // complete should be last
        expect(types[types.length - 1]).toBe('complete');

        // prescan_results before dependency_results
        expect(types.indexOf('prescan_results')).toBeLessThan(types.indexOf('dependency_results'));

        // score before analysis_chunk
        expect(types.indexOf('score')).toBeLessThan(types.indexOf('analysis_chunk'));
      } finally {
        server.close();
      }
    });

    it('detects secrets in scan results', async () => {
      const app = createApp();
      const http = await import('http');
      const server = http.createServer(app);

      await new Promise(resolve => server.listen(0, resolve));
      const port = server.address().port;

      try {
        const res = await fetch(`http://localhost:${port}/api/security-scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl: 'https://github.com/test-user/test-repo' })
        });

        const text = await res.text();
        const events = text
          .split('\n')
          .filter(line => line.startsWith('data: '))
          .map(line => { try { return JSON.parse(line.slice(6)); } catch { return null; } })
          .filter(Boolean);

        const prescan = events.find(e => e.type === 'prescan_results');
        expect(prescan).toBeDefined();
        expect(prescan.secrets.findings.length).toBeGreaterThan(0);

        // Should find eval usage and hardcoded password from mock data
        const evalFinding = prescan.secrets.findings.find(f => f.id === 'eval-usage');
        expect(evalFinding).toBeDefined();

        const passwordFinding = prescan.secrets.findings.find(f => f.id === 'password-assignment');
        expect(passwordFinding).toBeDefined();
      } finally {
        server.close();
      }
    });

    it('detects dependency vulnerabilities', async () => {
      const app = createApp();
      const http = await import('http');
      const server = http.createServer(app);

      await new Promise(resolve => server.listen(0, resolve));
      const port = server.address().port;

      try {
        const res = await fetch(`http://localhost:${port}/api/security-scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl: 'https://github.com/test-user/test-repo' })
        });

        const text = await res.text();
        const events = text
          .split('\n')
          .filter(line => line.startsWith('data: '))
          .map(line => { try { return JSON.parse(line.slice(6)); } catch { return null; } })
          .filter(Boolean);

        const deps = events.find(e => e.type === 'dependency_results');
        expect(deps).toBeDefined();
        // Should find lodash 4.17.15 vulnerability
        const lodashVuln = deps.dependencies.vulnerabilities.find(v => v.package === 'lodash');
        expect(lodashVuln).toBeDefined();
      } finally {
        server.close();
      }
    });

    it('returns valid security score', async () => {
      const app = createApp();
      const http = await import('http');
      const server = http.createServer(app);

      await new Promise(resolve => server.listen(0, resolve));
      const port = server.address().port;

      try {
        const res = await fetch(`http://localhost:${port}/api/security-scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl: 'https://github.com/test-user/test-repo' })
        });

        const text = await res.text();
        const events = text
          .split('\n')
          .filter(line => line.startsWith('data: '))
          .map(line => { try { return JSON.parse(line.slice(6)); } catch { return null; } })
          .filter(Boolean);

        const score = events.find(e => e.type === 'score');
        expect(score).toBeDefined();
        expect(score.score).toBeGreaterThanOrEqual(0);
        expect(score.score).toBeLessThanOrEqual(100);
        expect(['A', 'B', 'C', 'D', 'F']).toContain(score.grade);
        expect(score.breakdown).toBeDefined();
      } finally {
        server.close();
      }
    });
  });

  describe('URL parsing', () => {
    it('rejects invalid GitHub URLs', async () => {
      const app = createApp();
      const http = await import('http');
      const server = http.createServer(app);

      await new Promise(resolve => server.listen(0, resolve));
      const port = server.address().port;

      try {
        const res = await fetch(`http://localhost:${port}/api/security-scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl: 'not-a-url' })
        });
        expect(res.status).toBe(400);
      } finally {
        server.close();
      }
    });
  });
});
