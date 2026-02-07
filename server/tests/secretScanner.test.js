import { describe, it, expect } from 'vitest';
import { scanForSecrets } from '../src/services/secretScanner.js';

// Helper to create a code snippet
const snippet = (path, content) => ({ path, content });

describe('secretScanner', () => {
  describe('scanForSecrets', () => {
    it('returns empty findings for clean code', () => {
      const snippets = [
        snippet('src/index.js', 'const app = express();\napp.listen(3000);')
      ];
      const result = scanForSecrets(snippets);
      expect(result.findings).toHaveLength(0);
      expect(result.summary.totalFindings).toBe(0);
    });

    it('returns correct summary structure', () => {
      const result = scanForSecrets([snippet('src/app.js', 'const x = 1;')]);
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('totalFindings');
      expect(result.summary).toHaveProperty('critical');
      expect(result.summary).toHaveProperty('high');
      expect(result.summary).toHaveProperty('medium');
      expect(result.summary).toHaveProperty('low');
      expect(result.summary).toHaveProperty('secretsFound');
      expect(result.summary).toHaveProperty('vulnPatternsFound');
      expect(result.summary).toHaveProperty('filesScanned');
      expect(result.summary).toHaveProperty('categoryCounts');
    });

    it('counts filesScanned correctly', () => {
      const snippets = [
        snippet('a.js', 'const a = 1;'),
        snippet('b.js', 'const b = 2;'),
        snippet('c.js', 'const c = 3;')
      ];
      const result = scanForSecrets(snippets);
      expect(result.summary.filesScanned).toBe(3);
    });

    // --- Secret detection tests ---

    it('detects AWS access key', () => {
      const snippets = [
        snippet('src/config.js', 'const key = "AKIAIOSFODNN7EXAMPLE";')
      ];
      const result = scanForSecrets(snippets);
      expect(result.findings.length).toBeGreaterThanOrEqual(1);
      const awsFinding = result.findings.find(f => f.id === 'aws-access-key');
      expect(awsFinding).toBeDefined();
      expect(awsFinding.severity).toBe('critical');
      expect(awsFinding.category).toBe('cloud-credentials');
      expect(awsFinding.file).toBe('src/config.js');
    });

    it('detects AWS secret access key', () => {
      const snippets = [
        snippet('src/config.js', 'aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY0"')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'aws-secret-key');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('critical');
    });

    it('detects GitHub personal access token', () => {
      const snippets = [
        snippet('src/api.js', 'const token = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'github-token');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('critical');
    });

    it('detects GitHub fine-grained PAT', () => {
      const snippets = [
        snippet('src/api.js', 'const token = "github_pat_ABCDEFGHIJKLMNOPQRSTUV";')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'github-fine-grained');
      expect(finding).toBeDefined();
    });

    it('detects generic API keys', () => {
      const snippets = [
        snippet('src/service.js', 'const api_key = "sk_abcdefghijklmnopqrstuvwxyz";')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'generic-api-key');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('high');
    });

    it('detects private keys', () => {
      const snippets = [
        snippet('certs/key.pem', '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQ...')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'private-key');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('critical');
    });

    it('detects JWT tokens', () => {
      const snippets = [
        snippet('src/auth.js', 'const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'jwt-token');
      expect(finding).toBeDefined();
    });

    it('detects database connection strings', () => {
      const snippets = [
        snippet('src/db.js', 'const url = "mongodb://admin:password123@mongodb.example.com:27017/mydb";')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'database-url');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('critical');
    });

    it('detects Slack tokens', () => {
      const snippets = [
        snippet('src/slack.js', 'const token = "xoxb-1234567890-abcdefghij";')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'slack-token');
      expect(finding).toBeDefined();
    });

    it('detects Stripe keys', () => {
      const snippets = [
        snippet('src/payment.js', 'const key = "sk_test_FAKEFAKEFAKEFAKEFAKEFAKE1234";')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'stripe-key');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('critical');
    });

    it('detects Google API keys', () => {
      const snippets = [
        snippet('src/maps.js', 'const key = "AIzaSyA1234567890abcdefghijklmnopqrstuv";')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'google-api-key');
      expect(finding).toBeDefined();
    });

    it('detects hardcoded passwords', () => {
      const snippets = [
        snippet('src/config.js', 'const password = "supersecretpassword123";')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'password-assignment');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('high');
    });

    // --- Vulnerability pattern tests ---

    it('detects eval() usage', () => {
      const snippets = [
        snippet('src/handler.js', 'const result = eval(userInput);')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'eval-usage');
      expect(finding).toBeDefined();
      expect(finding.owasp).toBe('A03:2021-Injection');
    });

    it('detects innerHTML assignment', () => {
      const snippets = [
        snippet('src/ui.js', 'element.innerHTML = userContent;')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'innerhtml-usage');
      expect(finding).toBeDefined();
    });

    it('detects dangerouslySetInnerHTML', () => {
      const snippets = [
        snippet('src/Component.jsx', '<div dangerouslySetInnerHTML={{ __html: content }} />')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'dangerouslysetinnerhtml');
      expect(finding).toBeDefined();
    });

    it('detects SQL string concatenation', () => {
      const snippets = [
        snippet('src/db.js', 'db.query("SELECT * FROM users WHERE id=" + userId);')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'sql-string-concat');
      expect(finding).toBeDefined();
    });

    it('detects CORS wildcard', () => {
      const snippets = [
        snippet('src/server.js', "headers['Access-Control-Allow-Origin'] = '*';")
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'cors-wildcard');
      expect(finding).toBeDefined();
    });

    it('detects HTTP without TLS (not localhost)', () => {
      const snippets = [
        snippet('src/api.js', 'const url = "http://api.example.com/data";')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'http-no-tls');
      expect(finding).toBeDefined();
    });

    it('does NOT flag http://localhost', () => {
      const snippets = [
        snippet('src/dev.js', 'const url = "http://localhost:3000/api";')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'http-no-tls');
      expect(finding).toBeUndefined();
    });

    it('does NOT flag http://127.0.0.1', () => {
      const snippets = [
        snippet('src/dev.js', 'const url = "http://127.0.0.1:8080/api";')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'http-no-tls');
      expect(finding).toBeUndefined();
    });

    it('detects command execution', () => {
      const snippets = [
        snippet('src/util.js', 'const { exec } = require("child_process");\nexec("ls -la");')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'exec-usage');
      expect(finding).toBeDefined();
    });

    // --- File skipping ---

    it('skips test files', () => {
      const snippets = [
        snippet('src/auth.test.js', 'const password = "testpassword1234";')
      ];
      const result = scanForSecrets(snippets);
      expect(result.findings).toHaveLength(0);
    });

    it('skips spec files', () => {
      const snippets = [
        snippet('spec/auth.spec.js', 'const password = "testpassword1234";')
      ];
      const result = scanForSecrets(snippets);
      expect(result.findings).toHaveLength(0);
    });

    it('skips markdown files', () => {
      const snippets = [
        snippet('docs/setup.md', 'api_key = "sk_abcdefghijklmnopqrstuvwxyz"')
      ];
      const result = scanForSecrets(snippets);
      expect(result.findings).toHaveLength(0);
    });

    it('skips node_modules', () => {
      const snippets = [
        snippet('node_modules/lib/index.js', 'eval(code);')
      ];
      const result = scanForSecrets(snippets);
      expect(result.findings).toHaveLength(0);
    });

    // --- Deduplication ---

    it('deduplicates same finding on same line', () => {
      const snippets = [
        snippet('src/config.js', 'const password = "supersecretpassword123";'),
        snippet('src/config.js', 'const password = "supersecretpassword123";')
      ];
      const result = scanForSecrets(snippets);
      const pwdFindings = result.findings.filter(f => f.id === 'password-assignment');
      expect(pwdFindings).toHaveLength(1);
    });

    // --- Redaction ---

    it('redacts secret matches in output', () => {
      const snippets = [
        snippet('src/config.js', 'const key = "AKIAIOSFODNN7EXAMPLE";')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'aws-access-key');
      expect(finding).toBeDefined();
      expect(finding.match).toContain('***');
      expect(finding.match).not.toBe('AKIAIOSFODNN7EXAMPLE');
    });

    // --- Line numbers ---

    it('reports correct line numbers', () => {
      const snippets = [
        snippet('src/config.js', 'line1\nline2\nconst password = "mysecretpassword1234";\nline4')
      ];
      const result = scanForSecrets(snippets);
      const finding = result.findings.find(f => f.id === 'password-assignment');
      expect(finding).toBeDefined();
      expect(finding.line).toBe(3);
    });

    // --- Summary counts ---

    it('counts severity levels correctly', () => {
      const snippets = [
        snippet('src/app.js', [
          'const key = "AKIAIOSFODNN7EXAMPLE";',       // critical (aws)
          'const password = "mysecretpassword1234";',   // high (password)
          'element.innerHTML = data;',                   // medium (innerHTML)
          'console.log("token:", secretToken);'          // low (logging)
        ].join('\n'))
      ];
      const result = scanForSecrets(snippets);
      expect(result.summary.critical).toBeGreaterThanOrEqual(1);
      expect(result.summary.high).toBeGreaterThanOrEqual(1);
      expect(result.summary.medium).toBeGreaterThanOrEqual(1);
      expect(result.summary.low).toBeGreaterThanOrEqual(1);
    });

    // --- Multiple files ---

    it('scans across multiple files', () => {
      const snippets = [
        snippet('src/config.js', 'const password = "mysecretpassword1234";'),
        snippet('src/api.js', 'eval(userInput);'),
        snippet('src/server.js', 'const url = "http://api.example.com/data";')
      ];
      const result = scanForSecrets(snippets);
      expect(result.findings.length).toBeGreaterThanOrEqual(3);
      const files = [...new Set(result.findings.map(f => f.file))];
      expect(files.length).toBeGreaterThanOrEqual(2);
    });

    // --- Empty / edge cases ---

    it('handles empty snippets array', () => {
      const result = scanForSecrets([]);
      expect(result.findings).toHaveLength(0);
      expect(result.summary.totalFindings).toBe(0);
      expect(result.summary.filesScanned).toBe(0);
    });

    it('handles snippet with empty content', () => {
      const result = scanForSecrets([snippet('src/empty.js', '')]);
      expect(result.findings).toHaveLength(0);
    });

    it('handles non-string content gracefully', () => {
      const result = scanForSecrets([snippet('package.json', { name: 'test' })]);
      expect(result.findings).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });
});
