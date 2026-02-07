import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

let appOctokit = null;

const getAppAuth = () => {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error('GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY must be set');
  }

  // Private key may be base64-encoded in env vars
  const decodedKey = privateKey.includes('BEGIN')
    ? privateKey
    : Buffer.from(privateKey, 'base64').toString('utf8');

  return createAppAuth({
    appId,
    privateKey: decodedKey,
  });
};

// Generate a short-lived installation token for a specific installation
export const getInstallationToken = async (installationId) => {
  const auth = getAppAuth();
  const installationAuth = await auth({
    type: 'installation',
    installationId,
  });
  return installationAuth.token;
};

// Get an Octokit client authenticated as a specific installation
export const getInstallationOctokit = async (installationId) => {
  const token = await getInstallationToken(installationId);
  return new Octokit({ auth: token });
};

// Post a PR review with inline comments
export const postPRReview = async (installationId, owner, repo, prNumber, comments, summary) => {
  const octokit = await getInstallationOctokit(installationId);

  const reviewBody = summary || 'AI Code Review by smar-ai';

  // Format comments for GitHub API
  const formattedComments = comments.map(c => ({
    path: c.file,
    line: c.line,
    side: 'RIGHT',
    body: formatReviewComment(c),
  }));

  const result = await octokit.pulls.createReview({
    owner,
    repo,
    pull_number: prNumber,
    event: 'COMMENT',
    body: reviewBody,
    comments: formattedComments,
  });

  return result.data;
};

// Post a simple comment on the PR (fallback if inline comments fail)
export const postPRComment = async (installationId, owner, repo, prNumber, body) => {
  const octokit = await getInstallationOctokit(installationId);

  const result = await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });

  return result.data;
};

const formatReviewComment = (comment) => {
  const severityEmoji = {
    error: '🔴',
    warning: '🟡',
    info: '🔵',
    suggestion: '💡',
  };

  const emoji = severityEmoji[comment.severity] || '💡';
  return `${emoji} **${comment.severity?.toUpperCase() || 'INFO'}**: ${comment.comment}`;
};
