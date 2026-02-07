// Pass 1: Regex-based secret detection and vulnerability pattern scanning
// No AI, no network calls — runs instantly on code snippets

const SECRET_PATTERNS = [
  {
    id: 'aws-access-key',
    name: 'AWS Access Key ID',
    severity: 'critical',
    regex: /(?:^|[^A-Za-z0-9/+=])((AKIA|ASIA)[A-Z0-9]{16})(?:[^A-Za-z0-9/+=]|$)/g,
    category: 'cloud-credentials'
  },
  {
    id: 'aws-secret-key',
    name: 'AWS Secret Access Key',
    severity: 'critical',
    regex: /(?:aws_secret_access_key|aws_secret_key|secret_key)\s*[=:]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/gi,
    category: 'cloud-credentials'
  },
  {
    id: 'github-token',
    name: 'GitHub Token',
    severity: 'critical',
    regex: /(?:^|[^A-Za-z0-9_])(gh[pousr]_[A-Za-z0-9_]{36,255})/g,
    category: 'api-token'
  },
  {
    id: 'github-fine-grained',
    name: 'GitHub Fine-Grained PAT',
    severity: 'critical',
    regex: /(?:^|[^A-Za-z0-9_])(github_pat_[A-Za-z0-9_]{22,255})/g,
    category: 'api-token'
  },
  {
    id: 'generic-api-key',
    name: 'Generic API Key',
    severity: 'high',
    regex: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[=:]\s*['"]([A-Za-z0-9_\-]{20,})['"]/gi,
    category: 'api-token'
  },
  {
    id: 'private-key',
    name: 'Private Key',
    severity: 'critical',
    regex: /-----BEGIN\s+(RSA|EC|DSA|OPENSSH|PGP)\s+PRIVATE\s+KEY-----/g,
    category: 'cryptographic-key'
  },
  {
    id: 'jwt-token',
    name: 'JWT Token',
    severity: 'high',
    regex: /(?:^|[^A-Za-z0-9_.])(eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/g,
    category: 'auth-token'
  },
  {
    id: 'database-url',
    name: 'Database Connection String',
    severity: 'critical',
    regex: /(?:mongodb|postgres|mysql|redis|amqp):\/\/[^\s'"]+:[^\s'"]+@[^\s'"]+/gi,
    category: 'connection-string'
  },
  {
    id: 'slack-token',
    name: 'Slack Token',
    severity: 'high',
    regex: /xox[bpors]-[A-Za-z0-9-]{10,}/g,
    category: 'api-token'
  },
  {
    id: 'stripe-key',
    name: 'Stripe API Key',
    severity: 'critical',
    regex: /(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{20,}/g,
    category: 'payment'
  },
  {
    id: 'google-api-key',
    name: 'Google API Key',
    severity: 'high',
    regex: /AIza[0-9A-Za-z_-]{35}/g,
    category: 'api-token'
  },
  {
    id: 'password-assignment',
    name: 'Hardcoded Password',
    severity: 'high',
    regex: /(?:password|passwd|pwd)\s*[=:]\s*['"]([^'"]{8,})['"]/gi,
    category: 'credential'
  }
];

const VULN_PATTERNS = [
  {
    id: 'eval-usage',
    name: 'eval() Usage',
    severity: 'high',
    regex: /\beval\s*\(/g,
    category: 'code-injection',
    owasp: 'A03:2021-Injection'
  },
  {
    id: 'innerhtml-usage',
    name: 'innerHTML Assignment',
    severity: 'medium',
    regex: /\.innerHTML\s*=/g,
    category: 'xss',
    owasp: 'A03:2021-Injection'
  },
  {
    id: 'dangerouslysetinnerhtml',
    name: 'dangerouslySetInnerHTML',
    severity: 'medium',
    regex: /dangerouslySetInnerHTML/g,
    category: 'xss',
    owasp: 'A03:2021-Injection'
  },
  {
    id: 'sql-string-concat',
    name: 'SQL String Concatenation',
    severity: 'high',
    regex: /(?:query|execute|exec)\s*\(\s*['"`]?\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b[^)]*\+/gi,
    category: 'sql-injection',
    owasp: 'A03:2021-Injection'
  },
  {
    id: 'cors-wildcard',
    name: 'CORS Wildcard Origin',
    severity: 'medium',
    regex: /Access-Control-Allow-Origin.*?['"]\s*\*/g,
    category: 'misconfiguration',
    owasp: 'A05:2021-Security Misconfiguration'
  },
  {
    id: 'http-no-tls',
    name: 'HTTP Without TLS',
    severity: 'medium',
    regex: /['"]http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)[^'"]+['"]/g,
    category: 'transport-security',
    owasp: 'A02:2021-Cryptographic Failures'
  },
  {
    id: 'console-log-sensitive',
    name: 'Logging Sensitive Data',
    severity: 'low',
    regex: /console\.\w+\s*\(.*(?:password|secret|token|key|credential)/gi,
    category: 'data-exposure',
    owasp: 'A09:2021-Security Logging Failures'
  },
  {
    id: 'exec-usage',
    name: 'Command Execution',
    severity: 'high',
    regex: /(?:child_process|exec|execSync|spawn|spawnSync)\s*\(/g,
    category: 'code-injection',
    owasp: 'A03:2021-Injection'
  }
];

// Files to skip (test files, examples, docs)
const SKIP_PATTERNS = [
  /\.test\./i, /\.spec\./i, /test\//i, /tests\//i, /spec\//i,
  /\.example$/i, /\.sample$/i, /\.md$/i, /README/i,
  /node_modules\//i, /vendor\//i, /dist\//i, /build\//i
];

const shouldSkipFile = (filePath) => {
  return SKIP_PATTERNS.some(p => p.test(filePath));
};

// Redact a secret match: show first 4 and last 4 chars
const redactMatch = (match) => {
  if (match.length <= 10) return '***';
  return match.substring(0, 4) + '***' + match.substring(match.length - 4);
};

// Find the line number for a match index in content
const getLineNumber = (content, matchIndex) => {
  const lines = content.substring(0, matchIndex).split('\n');
  return lines.length;
};

export const scanForSecrets = (codeSnippets) => {
  const findings = [];

  for (const snippet of codeSnippets) {
    if (shouldSkipFile(snippet.path)) continue;

    const content = typeof snippet.content === 'string' ? snippet.content : String(snippet.content);

    // Scan for secrets
    for (const pattern of SECRET_PATTERNS) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match;

      while ((match = regex.exec(content)) !== null) {
        const matchedText = match[1] || match[0];
        findings.push({
          type: 'secret',
          id: pattern.id,
          name: pattern.name,
          severity: pattern.severity,
          category: pattern.category,
          file: snippet.path,
          line: getLineNumber(content, match.index),
          match: redactMatch(matchedText),
          owasp: null
        });
      }
    }

    // Scan for vulnerability patterns
    for (const pattern of VULN_PATTERNS) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match;

      while ((match = regex.exec(content)) !== null) {
        findings.push({
          type: 'vulnerability',
          id: pattern.id,
          name: pattern.name,
          severity: pattern.severity,
          category: pattern.category,
          file: snippet.path,
          line: getLineNumber(content, match.index),
          match: match[0].substring(0, 50),
          owasp: pattern.owasp
        });
      }
    }
  }

  // Deduplicate (same pattern + file + line)
  const seen = new Set();
  const dedupedFindings = findings.filter(f => {
    const key = `${f.id}:${f.file}:${f.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Build summary
  const summary = {
    totalFindings: dedupedFindings.length,
    critical: dedupedFindings.filter(f => f.severity === 'critical').length,
    high: dedupedFindings.filter(f => f.severity === 'high').length,
    medium: dedupedFindings.filter(f => f.severity === 'medium').length,
    low: dedupedFindings.filter(f => f.severity === 'low').length,
    secretsFound: dedupedFindings.filter(f => f.type === 'secret').length,
    vulnPatternsFound: dedupedFindings.filter(f => f.type === 'vulnerability').length,
    filesScanned: codeSnippets.length,
    categoryCounts: {}
  };

  for (const f of dedupedFindings) {
    summary.categoryCounts[f.category] = (summary.categoryCounts[f.category] || 0) + 1;
  }

  return { findings: dedupedFindings, summary };
};
