import axios from 'axios';

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

    const {
      description, language, stargazers_count, topics, default_branch,
      forks_count, open_issues_count, license, pushed_at, created_at
    } = response.data;

    return {
      name: repo,
      owner,
      description,
      language,
      stars: stargazers_count,
      topics: topics || [],
      defaultBranch: default_branch,
      forks: forks_count,
      openIssues: open_issues_count,
      license: license ? license.spdx_id : null,
      pushedAt: pushed_at,
      createdAt: created_at
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

// Check if repository has any releases
export const getRepoReleases = async (owner, repo) => {
  try {
    const response = await axios.get(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/releases?per_page=1`,
      { headers: getHeaders() }
    );
    return response.data.length > 0;
  } catch {
    return false;
  }
};

// Get recent commit activity
export const getRepoCommitsRecent = async (owner, repo) => {
  try {
    const response = await axios.get(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?per_page=5`,
      { headers: getHeaders() }
    );
    const commits = response.data;
    if (commits.length === 0) return { hasRecentCommits: false, daysSinceLastCommit: null };

    const lastDate = commits[0].commit.committer.date;
    const daysSince = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
    return {
      hasRecentCommits: daysSince < 180,
      daysSinceLastCommit: daysSince
    };
  } catch {
    return { hasRecentCommits: false, daysSinceLastCommit: null };
  }
};
