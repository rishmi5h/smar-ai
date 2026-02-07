import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Helper to get GitHub API headers
const getHeaders = () => ({
  'Accept': 'application/vnd.github.v3.raw',
  'User-Agent': 'smar-ai',
  ...(GITHUB_TOKEN && { 'Authorization': `token ${GITHUB_TOKEN}` })
});

// Extract owner and repo from GitHub URL or string
export const parseGithubUrl = (urlOrPath) => {
  let match;

  // Handle full GitHub URLs
  if (urlOrPath.includes('github.com')) {
    match = urlOrPath.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
  } else {
    // Handle owner/repo format
    match = urlOrPath.match(/^([^\/]+)\/([^\/]+)$/);
  }

  if (!match) {
    throw new Error('Invalid GitHub URL or repository path. Use format: owner/repo or https://github.com/owner/repo');
  }

  return { owner: match[1], repo: match[2] };
};

// Get repository metadata
export const getRepoMetadata = async (owner, repo) => {
  try {
    const response = await axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
      headers: getHeaders()
    });

    const { description, language, stargazers_count, topics, default_branch } = response.data;

    return {
      name: repo,
      owner,
      description,
      language,
      stars: stargazers_count,
      topics: topics || [],
      defaultBranch: default_branch
    };
  } catch (error) {
    throw new Error(`Failed to fetch repository metadata: ${error.message}`);
  }
};

// Get repository tree structure
export const getRepoTree = async (owner, repo, branch = 'main') => {
  try {
    const response = await axios.get(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers: getHeaders() }
    );

    return response.data.tree || [];
  } catch (error) {
    // Fallback to master if main doesn't exist
    try {
      const response = await axios.get(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/master?recursive=1`,
        { headers: getHeaders() }
      );
      return response.data.tree || [];
    } catch {
      throw new Error(`Failed to fetch repository tree: ${error.message}`);
    }
  }
};

// Get file content from repository
export const getFileContent = async (owner, repo, filePath, branch = 'main') => {
  try {
    const response = await axios.get(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`,
      { headers: getHeaders() }
    );
    return response.data;
  } catch (error) {
    // Fallback to master
    try {
      const response = await axios.get(
        `https://raw.githubusercontent.com/${owner}/${repo}/master/${filePath}`,
        { headers: getHeaders() }
      );
      return response.data;
    } catch {
      throw new Error(`Failed to fetch file content: ${error.message}`);
    }
  }
};

// Get relevant code files from repository
export const getRelevantCodeFiles = async (owner, repo) => {
  try {
    let branch = 'main';
    const metadata = await getRepoMetadata(owner, repo);
    branch = metadata.defaultBranch;

    const tree = await getRepoTree(owner, repo, branch);

    // Filter for code files and configuration files
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx',
      '.py', '.java', '.go', '.rs', '.cpp', '.c', '.rb',
      '.json', '.yaml', '.yml', '.md', '.env', '.env.example'
    ];

    const relevantFiles = tree
      .filter(item => item.type === 'blob')
      .filter(item => {
        const ext = item.path.split('.').pop();
        return codeExtensions.some(e => item.path.endsWith(e)) ||
               item.path === 'README.md' ||
               item.path === 'package.json' ||
               item.path === 'Dockerfile' ||
               item.path === '.gitignore';
      })
      .sort((a, b) => {
        // Prioritize important files
        const priorityOrder = ['README.md', 'package.json', 'setup.py', 'go.mod', 'Gemfile'];
        const aPriority = priorityOrder.findIndex(p => a.path.includes(p));
        const bPriority = priorityOrder.findIndex(p => b.path.includes(p));
        return (aPriority === -1 ? 999 : aPriority) - (bPriority === -1 ? 999 : bPriority);
      })
      .slice(0, 20); // Limit to 20 files

    return { files: relevantFiles, branch };
  } catch (error) {
    throw new Error(`Failed to get relevant code files: ${error.message}`);
  }
};

// Get files specifically for security scanning — broader scope than getRelevantCodeFiles
export const getSecurityScanFiles = async (owner, repo) => {
  try {
    let branch = 'main';
    const metadata = await getRepoMetadata(owner, repo);
    branch = metadata.defaultBranch;

    const tree = await getRepoTree(owner, repo, branch);

    // Security-relevant file extensions
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
      '.py', '.java', '.go', '.rs', '.cpp', '.c', '.rb', '.php',
      '.json', '.yaml', '.yml', '.toml', '.lock',
      '.env', '.env.example', '.env.local', '.env.production',
      '.cfg', '.ini', '.conf', '.config'
    ];

    // Manifest filenames we must always include
    const manifestNames = [
      'package.json', 'package-lock.json',
      'requirements.txt', 'Pipfile', 'setup.py', 'pyproject.toml',
      'go.mod', 'go.sum',
      'Cargo.toml', 'Gemfile', 'composer.json', 'pom.xml'
    ];

    // Security-priority keywords in file paths
    const securityKeywords = [
      'auth', 'login', 'session', 'middleware', 'config', 'env',
      'password', 'token', 'api', 'route', 'controller', 'guard',
      'permission', 'role', 'secret', 'crypto', 'hash', 'sanitize',
      'validate', 'cors', 'helmet', 'csrf', 'security', 'database',
      'db', 'firebase', 'supabase', 'prisma', 'docker', 'nginx'
    ];

    const allFiles = tree.filter(item => item.type === 'blob');

    const relevantFiles = allFiles.filter(item => {
      // Skip node_modules, vendor, dist, build dirs
      if (/\/(node_modules|vendor|dist|build|\.git)\//i.test(item.path)) return false;

      // Always include manifests
      const filename = item.path.split('/').pop();
      if (manifestNames.includes(filename)) return true;

      // Include Dockerfiles and CI configs
      if (filename === 'Dockerfile' || filename === '.dockerignore') return true;
      if (filename === '.gitignore' || filename === '.npmrc') return true;
      if (/\.(env|env\..*)$/.test(filename)) return true;

      // Include by extension
      return codeExtensions.some(e => item.path.endsWith(e));
    });

    // Score and sort by security relevance
    const scored = relevantFiles.map(file => {
      const pathLower = file.path.toLowerCase();
      let score = 0;

      // Manifests get highest priority
      const filename = file.path.split('/').pop();
      if (manifestNames.includes(filename)) score += 100;

      // Security keyword matches
      score += securityKeywords.filter(kw => pathLower.includes(kw)).length * 10;

      // .env files are critical
      if (/\.env/.test(filename)) score += 50;

      // Config files
      if (/config|setting/i.test(pathLower)) score += 20;

      // Root-level files
      if (!file.path.includes('/')) score += 5;

      return { ...file, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Keep top 80 candidates (fetching will be limited separately)
    return { files: scored.slice(0, 80), branch, totalRelevantFiles: relevantFiles.length };
  } catch (error) {
    throw new Error(`Failed to get security scan files: ${error.message}`);
  }
};

// Get code snippets for security scanning — fetches in parallel batches for speed
export const getSecurityCodeSnippets = async (owner, repo, filePaths) => {
  const metadata = await getRepoMetadata(owner, repo);
  const branch = metadata.defaultBranch;

  // Fetch up to 50 files in parallel batches of 10
  const pathsToFetch = filePaths.slice(0, 50);
  const batchSize = 10;
  const snippets = [];

  for (let i = 0; i < pathsToFetch.length; i += batchSize) {
    const batch = pathsToFetch.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (filePath) => {
        const content = await getFileContent(owner, repo, filePath, branch);
        const contentStr = typeof content === 'string'
          ? content
          : (typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content));
        return { path: filePath, content: contentStr.substring(0, 8000) };
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        snippets.push(result.value);
      }
    }
  }

  return snippets;
};

// Get code snippets from repository
export const getCodeSnippets = async (owner, repo, filePaths) => {
  const metadata = await getRepoMetadata(owner, repo);
  const branch = metadata.defaultBranch;

  const snippets = [];

  for (const filePath of filePaths.slice(0, 10)) {
    try {
      const content = await getFileContent(owner, repo, filePath, branch);
      // Ensure content is a string (handle Buffer or other types)
      const contentStr = typeof content === 'string' ? content : String(content);
      snippets.push({
        path: filePath,
        content: contentStr.substring(0, 5000) // Limit content size
      });
    } catch (error) {
      console.log(`Could not fetch ${filePath}: ${error.message}`);
    }
  }

  return snippets;
};

// Get recent commits for a repository
export const getRecentCommits = async (owner, repo, since, perPage = 20) => {
  try {
    const params = { per_page: perPage };
    if (since) params.since = since;

    const response = await axios.get(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits`,
      { headers: getHeaders(), params }
    );

    return response.data.map(commit => ({
      sha: commit.sha,
      shortSha: commit.sha.substring(0, 7),
      message: commit.commit.message.split('\n')[0],
      author: commit.commit.author.name,
      date: commit.commit.author.date
    }));
  } catch (error) {
    throw new Error(`Failed to fetch commits: ${error.message}`);
  }
};

// Compare two commits
export const getCompare = async (owner, repo, base, head) => {
  try {
    const response = await axios.get(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/compare/${base}...${head}`,
      { headers: getHeaders() }
    );

    const { total_commits, files, commits } = response.data;

    let totalAdditions = 0;
    let totalDeletions = 0;

    const changedFiles = (files || []).map(f => {
      totalAdditions += f.additions;
      totalDeletions += f.deletions;
      return {
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch || ''
      };
    });

    return {
      totalCommits: total_commits,
      filesChanged: changedFiles.length,
      additions: totalAdditions,
      deletions: totalDeletions,
      files: changedFiles,
      commits: (commits || []).map(c => ({
        sha: c.sha,
        shortSha: c.sha.substring(0, 7),
        message: c.commit.message.split('\n')[0],
        author: c.commit.author.name,
        date: c.commit.author.date
      }))
    };
  } catch (error) {
    throw new Error(`Failed to compare commits: ${error.message}`);
  }
};

// Parse PR or Issue URL — returns { owner, repo, type, number } or null
export const parseGithubPrOrIssueUrl = (url) => {
  const prMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
  if (prMatch) return { owner: prMatch[1], repo: prMatch[2], type: 'pr', number: parseInt(prMatch[3]) };

  const issueMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/);
  if (issueMatch) return { owner: issueMatch[1], repo: issueMatch[2], type: 'issue', number: parseInt(issueMatch[3]) };

  return null;
};

// Get PR details including files, reviews, and comments
export const getPRDetails = async (owner, repo, prNumber) => {
  try {
    const [prResponse, filesResponse] = await Promise.all([
      axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}`, {
        headers: { ...getHeaders(), 'Accept': 'application/vnd.github.v3+json' }
      }),
      axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/files`, {
        headers: { ...getHeaders(), 'Accept': 'application/vnd.github.v3+json' }
      })
    ]);

    const [reviewsResponse, commentsResponse] = await Promise.all([
      axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, {
        headers: { ...getHeaders(), 'Accept': 'application/vnd.github.v3+json' }
      }).catch(() => ({ data: [] })),
      axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/comments`, {
        headers: { ...getHeaders(), 'Accept': 'application/vnd.github.v3+json' }
      }).catch(() => ({ data: [] }))
    ]);

    const pr = prResponse.data;
    return {
      pr: {
        title: pr.title,
        body: pr.body,
        state: pr.state,
        merged: pr.merged || false,
        author: pr.user?.login || 'Unknown',
        base: pr.base?.ref || '',
        head: pr.head?.ref || '',
        additions: pr.additions || 0,
        deletions: pr.deletions || 0,
        changedFiles: pr.changed_files || 0,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        merged_at: pr.merged_at
      },
      files: (filesResponse.data || []).map(f => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch || ''
      })),
      reviews: (reviewsResponse.data || []).map(r => ({
        user: r.user?.login || 'Unknown',
        state: r.state,
        body: r.body || ''
      })),
      comments: (commentsResponse.data || []).map(c => ({
        user: c.user?.login || 'Unknown',
        body: c.body || '',
        path: c.path,
        created_at: c.created_at
      }))
    };
  } catch (error) {
    throw new Error(`Failed to fetch PR details: ${error.message}`);
  }
};

// Get Issue details including comments
export const getIssueDetails = async (owner, repo, issueNumber) => {
  try {
    const [issueResponse, commentsResponse] = await Promise.all([
      axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}`, {
        headers: { ...getHeaders(), 'Accept': 'application/vnd.github.v3+json' }
      }),
      axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
        headers: { ...getHeaders(), 'Accept': 'application/vnd.github.v3+json' }
      }).catch(() => ({ data: [] }))
    ]);

    const issue = issueResponse.data;
    return {
      issue: {
        title: issue.title,
        body: issue.body,
        state: issue.state,
        author: issue.user?.login || 'Unknown',
        labels: (issue.labels || []).map(l => l.name),
        assignees: (issue.assignees || []).map(a => a.login),
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        closed_at: issue.closed_at
      },
      comments: (commentsResponse.data || []).map(c => ({
        user: c.user?.login || 'Unknown',
        body: c.body || '',
        created_at: c.created_at
      }))
    };
  } catch (error) {
    throw new Error(`Failed to fetch issue details: ${error.message}`);
  }
};

// Get source code files for architecture analysis (prioritizes actual code, not config/docs)
export const getArchitectureCodeFiles = async (owner, repo) => {
  const metadata = await getRepoMetadata(owner, repo);
  const branch = metadata.defaultBranch;
  const tree = await getRepoTree(owner, repo, branch);

  const sourceExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
    '.py', '.go', '.java', '.rs', '.rb', '.cpp', '.c'
  ];

  const excludePatterns = [
    'node_modules/', 'dist/', 'build/', '.next/', 'vendor/', '__pycache__/',
    '.min.js', '.min.css', '.bundle.', '.chunk.',
    '__tests__/', '__test__/', 'test/', 'tests/', 'spec/',
    '.test.', '.spec.', '.d.ts',
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'
  ];

  const sourceFiles = tree
    .filter(item => item.type === 'blob')
    .filter(item => {
      const ext = '.' + item.path.split('.').pop();
      return sourceExtensions.includes(ext.toLowerCase());
    })
    .filter(item => !excludePatterns.some(p => item.path.includes(p)))
    .sort((a, b) => {
      // Shallower files first (entry points), then alphabetically
      const depthA = a.path.split('/').length;
      const depthB = b.path.split('/').length;
      if (depthA !== depthB) return depthA - depthB;
      return a.path.localeCompare(b.path);
    })
    .slice(0, 50);

  return { files: sourceFiles.map(f => f.path), branch };
};

// Fetch architecture code snippets in parallel (only imports matter, so keep first 2000 chars)
export const getArchitectureSnippets = async (owner, repo, filePaths, branch) => {
  const snippets = [];
  const batchSize = 10;

  for (let i = 0; i < Math.min(filePaths.length, 30); i += batchSize) {
    const batch = filePaths.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (filePath) => {
        const response = await axios.get(
          `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`,
          { headers: getHeaders() }
        );
        const contentStr = typeof response.data === 'string' ? response.data : String(response.data);
        return { path: filePath, content: contentStr.substring(0, 2000) };
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        snippets.push(result.value);
      }
    }
  }

  return snippets;
};

// Get code snapshots at a specific commit
export const getCodeSnippetsAtRef = async (owner, repo, ref, filePaths) => {
  const snippets = [];

  for (const filePath of filePaths.slice(0, 10)) {
    try {
      const response = await axios.get(
        `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${filePath}`,
        { headers: getHeaders() }
      );
      const contentStr = typeof response.data === 'string' ? response.data : String(response.data);
      snippets.push({
        path: filePath,
        content: contentStr.substring(0, 5000)
      });
    } catch {
      // File may not exist at this ref — skip
    }
  }

  return snippets;
};
