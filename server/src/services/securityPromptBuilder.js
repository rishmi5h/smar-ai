// Builds the AI prompt for Pass 3 (deep security analysis)
// Also computes the security score from Pass 1 + Pass 2 results

// Keywords that indicate security-relevant files — sort these to the top
const SECURITY_KEYWORDS = [
  'auth', 'login', 'session', 'middleware', 'config', 'env',
  'password', 'token', 'api', 'route', 'controller', 'guard',
  'permission', 'role', 'secret', 'crypto', 'hash', 'sanitize',
  'validate', 'cors', 'helmet', 'csrf', 'security'
];

const prioritizeSecurityFiles = (codeSnippets) => {
  return [...codeSnippets].sort((a, b) => {
    const aScore = SECURITY_KEYWORDS.filter(kw => a.path.toLowerCase().includes(kw)).length;
    const bScore = SECURITY_KEYWORDS.filter(kw => b.path.toLowerCase().includes(kw)).length;
    return bScore - aScore;
  });
};

export const buildSecurityPrompt = (metadata, codeSnippets, prescanResults, depAuditResults) => {
  // Prioritize security-relevant files
  const prioritized = prioritizeSecurityFiles(codeSnippets);

  const snippetText = prioritized
    .slice(0, 20)
    .map(s => {
      const contentStr = typeof s.content === 'string' ? s.content : String(s.content);
      return `## ${s.path}\n\`\`\`\n${contentStr.substring(0, 2000)}\n\`\`\``;
    })
    .join('\n\n');

  // Summarize prescan findings for AI context
  const prescanSummary = prescanResults.findings.length > 0
    ? prescanResults.findings.slice(0, 20).map(f =>
        `- [${f.severity.toUpperCase()}] ${f.name} in ${f.file}:${f.line}${f.owasp ? ` (${f.owasp})` : ''}`
      ).join('\n')
    : 'No secrets or vulnerability patterns detected by automated scan.';

  const depSummary = depAuditResults.vulnerabilities.length > 0
    ? depAuditResults.vulnerabilities.map(v =>
        `- [${v.severity.toUpperCase()}] ${v.package}@${v.version}: ${v.summary} (fix: ${v.fixedVersion})`
      ).join('\n')
    : 'No known dependency vulnerabilities found.';

  const systemPrompt = `You are smar-ai, an expert security auditor specializing in application security. You analyze codebases for vulnerabilities following OWASP Top 10 2021 guidelines. You are thorough, specific, and provide actionable remediation advice with code examples. You are powered by Groq.`;

  const userPrompt = `Perform a deep security audit of the "${metadata.name}" repository.

## Automated Pre-Scan Results

### Secrets & Pattern Detection (Pass 1)
Found ${prescanResults.summary.totalFindings} issues (${prescanResults.summary.critical} critical, ${prescanResults.summary.high} high, ${prescanResults.summary.medium} medium, ${prescanResults.summary.low} low):
${prescanSummary}

### Dependency Vulnerabilities (Pass 2)
${depAuditResults.summary.totalDependencies} dependencies scanned, ${depAuditResults.summary.vulnerableDependencies} vulnerable:
${depSummary}

## Repository Context
**Language:** ${metadata.language || 'Unknown'}
**Description:** ${metadata.description || 'No description'}

## Code Files
${snippetText}

## Analysis Required

Validate the automated findings above, then provide a deep analysis covering:

### 1. OWASP Top 10 Assessment
For each applicable OWASP category (A01-A10), assess the risk level and cite specific file:line references.

### 2. Authentication & Authorization
- Session management issues
- Missing auth checks on routes
- Privilege escalation vectors
- Token handling flaws

### 3. Input Validation & Sanitization
- Unvalidated user input paths
- Missing output encoding
- Deserialization risks

### 4. Data Exposure
- Sensitive data in logs or responses
- Error messages leaking internal details
- Debug endpoints exposed

### 5. Configuration Security
- Default credentials
- Debug mode in production
- Missing security headers (HSTS, CSP, etc.)
- CORS misconfiguration

### 6. Top 5 Remediation Priorities
Rank the 5 most critical issues. For each, provide:
- What the issue is
- Where it exists (file:line)
- A specific code fix or recommendation

### 7. Overall Security Assessment
Summarize the security posture and biggest risks in 2-3 sentences.

Format your response in clean markdown with clear headers. Be specific and reference actual file names.`;

  return { systemPrompt, userPrompt };
};

export const computeSecurityScore = (prescanResults, depAuditResults) => {
  let score = 100;

  // Deductions for secrets and vulnerability patterns
  const secretDeduction =
    prescanResults.summary.critical * 20 +
    prescanResults.summary.high * 10 +
    prescanResults.summary.medium * 5 +
    prescanResults.summary.low * 2;

  // Deductions for vulnerable dependencies
  const depDeduction =
    depAuditResults.summary.critical * 15 +
    depAuditResults.summary.high * 8 +
    depAuditResults.summary.moderate * 4 +
    depAuditResults.summary.low * 2;

  score -= secretDeduction;
  score -= depDeduction;
  score = Math.max(0, Math.min(100, score));

  const grade =
    score >= 90 ? 'A' :
    score >= 80 ? 'B' :
    score >= 70 ? 'C' :
    score >= 50 ? 'D' : 'F';

  return {
    numericScore: score,
    grade,
    breakdown: {
      secretsDeduction: secretDeduction,
      dependenciesDeduction: depDeduction,
      totalFindings: prescanResults.summary.totalFindings + depAuditResults.summary.vulnerableDependencies
    }
  };
};
