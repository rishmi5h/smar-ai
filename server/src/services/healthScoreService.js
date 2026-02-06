// Tree helper functions
const treeHasFile = (tree, pattern) =>
  tree.some(item => item.type === 'blob' && item.path.toLowerCase().includes(pattern.toLowerCase()));

const treeHasPath = (tree, pathPrefix) =>
  tree.some(item => item.path.toLowerCase().startsWith(pathPrefix.toLowerCase()));

const treeHasExtension = (tree, ext) =>
  tree.some(item => item.type === 'blob' && item.path.endsWith(ext));

const getReadmeSize = (tree) => {
  const readme = tree.find(
    item => item.type === 'blob' && item.path.toLowerCase() === 'readme.md'
  );
  return readme ? readme.size || 0 : 0;
};

// --- Category Scorers ---

const scoreDocumentation = (metadata, tree) => {
  const details = {};
  let score = 0;

  // README exists (6 pts)
  const readmeExists = treeHasFile(tree, 'readme.md');
  details.readmeExists = readmeExists;
  if (readmeExists) score += 6;

  // README length (4 pts)
  const readmeSize = getReadmeSize(tree);
  details.readmeSize = readmeSize;
  if (readmeSize >= 1000) score += 4;
  else if (readmeSize >= 200) score += 2;

  // Has description (5 pts)
  const hasDescription = !!(metadata.description && metadata.description.trim());
  details.hasDescription = hasDescription;
  if (hasDescription) score += 5;

  // Has topics (5 pts)
  const topicCount = (metadata.topics || []).length;
  details.topicCount = topicCount;
  if (topicCount >= 3) score += 5;
  else if (topicCount >= 1) score += 3;

  return { score, max: 20, details };
};

const scoreCommunity = (metadata) => {
  const details = {};
  let score = 0;

  // Stars (6 pts)
  const stars = metadata.stars || 0;
  details.stars = stars;
  if (stars >= 100) score += 6;
  else if (stars >= 10) score += 4;
  else if (stars >= 1) score += 2;

  // Forks (4 pts)
  const forks = metadata.forks || 0;
  details.forks = forks;
  if (forks >= 5) score += 4;
  else if (forks >= 1) score += 2;

  // Has license (6 pts)
  details.license = metadata.license;
  if (metadata.license) score += 6;

  // Issue load (4 pts)
  const openIssues = metadata.openIssues || 0;
  details.openIssues = openIssues;
  if (openIssues < 20) score += 4;
  else if (openIssues < 50) score += 2;

  return { score, max: 20, details };
};

const scoreCodeQuality = (tree) => {
  const details = {};
  let score = 0;

  // Has tests (6 pts)
  const hasTests = treeHasPath(tree, 'test/') ||
    treeHasPath(tree, 'tests/') ||
    treeHasPath(tree, '__tests__/') ||
    tree.some(item => item.type === 'blob' && (
      item.path.includes('.test.') || item.path.includes('.spec.')
    ));
  details.hasTests = hasTests;
  if (hasTests) score += 6;

  // Has linting config (4 pts)
  const hasLinting = treeHasFile(tree, '.eslintrc') ||
    treeHasFile(tree, 'eslint.config') ||
    treeHasFile(tree, '.prettierrc') ||
    treeHasFile(tree, 'prettier.config') ||
    treeHasFile(tree, 'biome.json') ||
    treeHasFile(tree, '.pylintrc') ||
    treeHasFile(tree, '.flake8') ||
    treeHasFile(tree, '.rubocop.yml');
  details.hasLinting = hasLinting;
  if (hasLinting) score += 4;

  // Has TypeScript (5 pts)
  const hasTypeScript = treeHasFile(tree, 'tsconfig.json') ||
    treeHasExtension(tree, '.ts') ||
    treeHasExtension(tree, '.tsx');
  details.hasTypeScript = hasTypeScript;
  if (hasTypeScript) score += 5;

  // Has CI/CD (5 pts)
  const hasCiCd = treeHasPath(tree, '.github/workflows/') ||
    treeHasFile(tree, '.gitlab-ci.yml') ||
    treeHasFile(tree, 'Jenkinsfile') ||
    treeHasPath(tree, '.circleci/');
  details.hasCiCd = hasCiCd;
  if (hasCiCd) score += 5;

  return { score, max: 20, details };
};

const scoreMaintenance = (metadata, hasReleases, commitInfo) => {
  const details = {};
  let score = 0;

  // Recent commits (8 pts)
  const days = commitInfo.daysSinceLastCommit;
  details.daysSinceLastCommit = days;
  if (days !== null) {
    if (days < 30) score += 8;
    else if (days < 90) score += 5;
    else if (days < 180) score += 3;
  }

  // Issue management (6 pts)
  const openIssues = metadata.openIssues || 0;
  details.openIssues = openIssues;
  if (openIssues === 0) score += 6;
  else if (openIssues < 10) score += 5;
  else if (openIssues < 30) score += 3;

  // Has releases (6 pts)
  details.hasReleases = hasReleases;
  if (hasReleases) score += 6;

  return { score, max: 20, details };
};

const scoreDevOps = (tree) => {
  const details = {};
  let score = 0;

  // Has Docker (5 pts)
  const hasDocker = treeHasFile(tree, 'Dockerfile') ||
    treeHasFile(tree, 'docker-compose.yml') ||
    treeHasFile(tree, 'docker-compose.yaml');
  details.hasDocker = hasDocker;
  if (hasDocker) score += 5;

  // Has CI workflows (5 pts)
  const hasCiWorkflows = tree.some(item =>
    item.type === 'blob' &&
    item.path.startsWith('.github/workflows/') &&
    (item.path.endsWith('.yml') || item.path.endsWith('.yaml'))
  );
  details.hasCiWorkflows = hasCiWorkflows;
  if (hasCiWorkflows) score += 5;

  // Has .env.example (4 pts)
  const hasEnvExample = treeHasFile(tree, '.env.example') ||
    treeHasFile(tree, '.env.sample');
  details.hasEnvExample = hasEnvExample;
  if (hasEnvExample) score += 4;

  // Has lockfile (6 pts)
  const hasLockfile = treeHasFile(tree, 'package-lock.json') ||
    treeHasFile(tree, 'yarn.lock') ||
    treeHasFile(tree, 'pnpm-lock.yaml') ||
    treeHasFile(tree, 'Pipfile.lock') ||
    treeHasFile(tree, 'Gemfile.lock') ||
    treeHasFile(tree, 'go.sum') ||
    treeHasFile(tree, 'composer.lock') ||
    treeHasFile(tree, 'Cargo.lock');
  details.hasLockfile = hasLockfile;
  if (hasLockfile) score += 6;

  return { score, max: 20, details };
};

// Grade mapping
const getGrade = (totalScore) => {
  if (totalScore >= 90) return 'A';
  if (totalScore >= 75) return 'B';
  if (totalScore >= 60) return 'C';
  if (totalScore >= 40) return 'D';
  return 'F';
};

// Main scoring function
export const computeHealthScore = (metadata, tree, hasReleases, commitInfo) => {
  const documentation = scoreDocumentation(metadata, tree);
  const community = scoreCommunity(metadata);
  const codeQuality = scoreCodeQuality(tree);
  const maintenance = scoreMaintenance(metadata, hasReleases, commitInfo);
  const devops = scoreDevOps(tree);

  const totalScore = documentation.score + community.score + codeQuality.score +
    maintenance.score + devops.score;

  return {
    totalScore,
    grade: getGrade(totalScore),
    categories: {
      documentation,
      community,
      codeQuality,
      maintenance,
      devops
    }
  };
};
