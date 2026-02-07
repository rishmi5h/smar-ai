// Pass 2: Dependency vulnerability auditing
// Parses manifest files and checks against known CVE databases

import axios from 'axios';

// Well-known CVEs as fallback when API calls fail
const KNOWN_VULNERABILITIES = [
  { package: 'lodash', vulnerableRange: '<4.17.21', severity: 'critical', summary: 'Prototype Pollution', fixedVersion: '4.17.21' },
  { package: 'minimist', vulnerableRange: '<1.2.6', severity: 'critical', summary: 'Prototype Pollution', fixedVersion: '1.2.6' },
  { package: 'node-fetch', vulnerableRange: '<2.6.7', severity: 'high', summary: 'Exposure of Sensitive Information', fixedVersion: '2.6.7' },
  { package: 'axios', vulnerableRange: '<1.6.0', severity: 'high', summary: 'CSRF/SSRF Bypass', fixedVersion: '1.6.0' },
  { package: 'express', vulnerableRange: '<4.19.2', severity: 'medium', summary: 'Open Redirect', fixedVersion: '4.19.2' },
  { package: 'jsonwebtoken', vulnerableRange: '<9.0.0', severity: 'high', summary: 'Insecure Default Algorithm', fixedVersion: '9.0.0' },
  { package: 'qs', vulnerableRange: '<6.10.3', severity: 'high', summary: 'Prototype Pollution', fixedVersion: '6.10.3' },
  { package: 'semver', vulnerableRange: '<7.5.2', severity: 'medium', summary: 'ReDoS', fixedVersion: '7.5.2' },
  { package: 'tar', vulnerableRange: '<6.1.9', severity: 'high', summary: 'Arbitrary File Creation', fixedVersion: '6.1.9' },
  { package: 'glob-parent', vulnerableRange: '<5.1.2', severity: 'high', summary: 'ReDoS', fixedVersion: '5.1.2' },
  { package: 'path-parse', vulnerableRange: '<1.0.7', severity: 'medium', summary: 'ReDoS', fixedVersion: '1.0.7' },
  { package: 'trim-newlines', vulnerableRange: '<3.0.1', severity: 'high', summary: 'ReDoS', fixedVersion: '3.0.1' },
  { package: 'underscore', vulnerableRange: '<1.13.6', severity: 'critical', summary: 'Arbitrary Code Execution', fixedVersion: '1.13.6' },
  { package: 'moment', vulnerableRange: '<2.29.4', severity: 'high', summary: 'ReDoS & Path Traversal', fixedVersion: '2.29.4' },
  { package: 'shell-quote', vulnerableRange: '<1.7.3', severity: 'critical', summary: 'Command Injection', fixedVersion: '1.7.3' },
  { package: 'async', vulnerableRange: '<2.6.4', severity: 'high', summary: 'Prototype Pollution', fixedVersion: '2.6.4' },
  { package: 'follow-redirects', vulnerableRange: '<1.15.4', severity: 'high', summary: 'Proxy Authorization Header Leak', fixedVersion: '1.15.4' },
  { package: 'cross-fetch', vulnerableRange: '<3.1.5', severity: 'medium', summary: 'Incorrect Authorization', fixedVersion: '3.1.5' },
];

// Parse version from semver range (e.g., "^4.18.2" → "4.18.2")
const parseVersion = (versionStr) => {
  if (!versionStr) return null;
  const match = versionStr.match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
};

// Simple semver comparison: is version < targetVersion?
const isVersionLessThan = (version, target) => {
  if (!version || !target) return false;
  const v = version.split('.').map(Number);
  const t = target.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((v[i] || 0) < (t[i] || 0)) return true;
    if ((v[i] || 0) > (t[i] || 0)) return false;
  }
  return false;
};

// Parse package.json dependencies
const parsePackageJson = (content, filePath) => {
  try {
    const pkg = JSON.parse(content);
    const deps = [];

    for (const [name, version] of Object.entries(pkg.dependencies || {})) {
      deps.push({ name, version, ecosystem: 'npm', file: filePath });
    }
    for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
      deps.push({ name, version, ecosystem: 'npm', file: filePath, dev: true });
    }

    return { manifest: { file: filePath, ecosystem: 'npm', dependencyCount: deps.length }, dependencies: deps };
  } catch {
    return { manifest: null, dependencies: [] };
  }
};

// Parse requirements.txt
const parseRequirementsTxt = (content, filePath) => {
  const deps = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;

    const match = trimmed.match(/^([A-Za-z0-9_-]+)\s*(?:[=<>!~]+\s*(.+))?$/);
    if (match) {
      deps.push({ name: match[1], version: match[2] || 'unknown', ecosystem: 'pypi', file: filePath });
    }
  }
  return { manifest: { file: filePath, ecosystem: 'pypi', dependencyCount: deps.length }, dependencies: deps };
};

// Parse go.mod
const parseGoMod = (content, filePath) => {
  const deps = [];
  const requireBlock = content.match(/require\s*\(([\s\S]*?)\)/);
  if (requireBlock) {
    for (const line of requireBlock[1].split('\n')) {
      const match = line.trim().match(/^(\S+)\s+v?(\S+)/);
      if (match) {
        deps.push({ name: match[1], version: match[2], ecosystem: 'go', file: filePath });
      }
    }
  }
  // Single-line requires
  const singleRequires = content.matchAll(/require\s+(\S+)\s+v?(\S+)/g);
  for (const match of singleRequires) {
    deps.push({ name: match[1], version: match[2], ecosystem: 'go', file: filePath });
  }
  return { manifest: { file: filePath, ecosystem: 'go', dependencyCount: deps.length }, dependencies: deps };
};

// Check npm dependencies against the bulk advisory API
const checkNpmAdvisories = async (dependencies) => {
  const npmDeps = dependencies.filter(d => d.ecosystem === 'npm');
  if (npmDeps.length === 0) return [];

  try {
    // Build the payload: { "package-name": ["version"] }
    const payload = {};
    for (const dep of npmDeps) {
      const version = parseVersion(dep.version);
      if (version) {
        payload[dep.name] = [version];
      }
    }

    const response = await axios.post(
      'https://registry.npmjs.org/-/npm/v1/security/advisories/bulk',
      payload,
      { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
    );

    const vulnerabilities = [];
    for (const [pkgName, advisories] of Object.entries(response.data || {})) {
      for (const advisory of advisories) {
        const dep = npmDeps.find(d => d.name === pkgName);
        vulnerabilities.push({
          package: pkgName,
          version: dep?.version || 'unknown',
          severity: advisory.severity || 'moderate',
          ghsaId: advisory.github_advisory_id || advisory.id?.toString() || '',
          summary: advisory.title || advisory.overview?.substring(0, 100) || 'Vulnerability found',
          fixedVersion: advisory.patched_versions || 'unknown',
          file: dep?.file || 'package.json'
        });
      }
    }

    return vulnerabilities;
  } catch (err) {
    console.log('npm advisory API failed, falling back to known CVEs:', err.message);
    return null; // Signal to use fallback
  }
};

// Check against our hardcoded known vulnerability list
const checkKnownVulnerabilities = (dependencies) => {
  const vulnerabilities = [];

  for (const dep of dependencies) {
    const version = parseVersion(dep.version);
    if (!version) continue;

    for (const known of KNOWN_VULNERABILITIES) {
      if (dep.name === known.package) {
        if (isVersionLessThan(version, known.fixedVersion)) {
          vulnerabilities.push({
            package: dep.name,
            version: dep.version,
            severity: known.severity,
            ghsaId: '',
            summary: known.summary,
            fixedVersion: known.fixedVersion,
            file: dep.file
          });
        }
      }
    }
  }

  return vulnerabilities;
};

export const auditDependencies = async (codeSnippets) => {
  const allManifests = [];
  const allDependencies = [];

  // Detect and parse manifest files
  for (const snippet of codeSnippets) {
    const content = typeof snippet.content === 'string' ? snippet.content : String(snippet.content);
    const path = snippet.path;

    if (path.endsWith('package.json') && !path.includes('node_modules')) {
      const { manifest, dependencies } = parsePackageJson(content, path);
      if (manifest) allManifests.push(manifest);
      allDependencies.push(...dependencies);
    } else if (path === 'requirements.txt' || path.endsWith('/requirements.txt')) {
      const { manifest, dependencies } = parseRequirementsTxt(content, path);
      if (manifest) allManifests.push(manifest);
      allDependencies.push(...dependencies);
    } else if (path === 'go.mod' || path.endsWith('/go.mod')) {
      const { manifest, dependencies } = parseGoMod(content, path);
      if (manifest) allManifests.push(manifest);
      allDependencies.push(...dependencies);
    }
  }

  // Check for vulnerabilities
  let vulnerabilities = [];

  // Try npm bulk advisory API first
  const npmResults = await checkNpmAdvisories(allDependencies);
  if (npmResults !== null) {
    vulnerabilities.push(...npmResults);
  }

  // Always check against our known list (catches things the API might miss)
  const knownResults = checkKnownVulnerabilities(allDependencies);

  // Merge: deduplicate by package name (keep API result if both exist)
  const existingPkgs = new Set(vulnerabilities.map(v => v.package));
  for (const known of knownResults) {
    if (!existingPkgs.has(known.package)) {
      vulnerabilities.push(known);
    }
  }

  const summary = {
    totalDependencies: allDependencies.length,
    vulnerableDependencies: vulnerabilities.length,
    critical: vulnerabilities.filter(v => v.severity === 'critical').length,
    high: vulnerabilities.filter(v => v.severity === 'high').length,
    moderate: vulnerabilities.filter(v => v.severity === 'moderate' || v.severity === 'medium').length,
    low: vulnerabilities.filter(v => v.severity === 'low').length,
    ecosystems: [...new Set(allManifests.map(m => m.ecosystem))]
  };

  return { manifests: allManifests, dependencies: allDependencies, vulnerabilities, summary };
};
