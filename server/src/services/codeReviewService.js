import { getPRDetails } from './githubService.js';
import { generateInlineReviewComments } from './groqService.js';
import { getInstallationToken, postPRReview, postPRComment } from './githubAppService.js';
import {
  filterReviewableFiles,
  batchFiles,
  buildReviewPrompt,
  buildLineMapForFiles,
} from './reviewPromptBuilder.js';
import { updateReviewJobStatus } from '../db/queries.js';

// Main orchestrator: review a pull request end-to-end
export const reviewPullRequest = async (jobId, installationId, owner, repo, prNumber, config = {}) => {
  try {
    await updateReviewJobStatus(jobId, 'processing');

    // 1. Get installation token
    const token = await getInstallationToken(installationId);

    // 2. Fetch PR details using existing service (with installation token)
    const prDetails = await getPRDetails(owner, repo, prNumber, token);

    // 3. Filter out non-reviewable files
    let reviewableFiles = filterReviewableFiles(prDetails.files);

    // Apply ignore patterns from config
    if (config.ignorePatterns && config.ignorePatterns.length > 0) {
      const ignoreRegexes = config.ignorePatterns.map(p => new RegExp(p));
      reviewableFiles = reviewableFiles.filter(
        f => !ignoreRegexes.some(r => r.test(f.filename))
      );
    }

    if (reviewableFiles.length === 0) {
      await updateReviewJobStatus(jobId, 'completed', 0);
      return { commentsPosted: 0, message: 'No reviewable files found' };
    }

    // 4. Build line maps for diff position mapping
    const lineMaps = buildLineMapForFiles(reviewableFiles);

    // 5. Batch files and get AI review for each batch
    const batches = batchFiles(reviewableFiles);
    let allComments = [];

    for (const batch of batches) {
      const prompt = buildReviewPrompt(prDetails.pr, batch, config);
      const comments = await generateInlineReviewComments(prompt);
      allComments.push(...comments);

      // Rate limiting between Groq calls
      if (batches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 6. Filter by severity if configured
    if (config.minSeverity) {
      const severityOrder = ['info', 'suggestion', 'warning', 'error'];
      const minIndex = severityOrder.indexOf(config.minSeverity);
      if (minIndex > 0) {
        allComments = allComments.filter(c => {
          const idx = severityOrder.indexOf(c.severity);
          return idx >= minIndex;
        });
      }
    }

    if (allComments.length === 0) {
      // Post a summary comment saying everything looks good
      await postPRComment(
        installationId, owner, repo, prNumber,
        '✅ **smar-ai Review**: No issues found. The code looks good!'
      );
      await updateReviewJobStatus(jobId, 'completed', 0);
      return { commentsPosted: 0, message: 'No issues found' };
    }

    // 7. Map AI line numbers to GitHub diff positions
    const mappedComments = allComments.map(c => {
      const lineMap = lineMaps[c.file];
      if (lineMap && lineMap.has(c.line)) {
        // Use the diff position for GitHub's API
        return { ...c, position: lineMap.get(c.line) };
      }
      // If we can't map the line, use the line number directly
      return { ...c };
    }).filter(c => c.position || c.line); // ensure we have some position

    // 8. Post the review
    const summary = `🤖 **smar-ai Review** — Found ${mappedComments.length} comment${mappedComments.length === 1 ? '' : 's'} across ${new Set(mappedComments.map(c => c.file)).size} file${new Set(mappedComments.map(c => c.file)).size === 1 ? '' : 's'}.`;

    try {
      await postPRReview(installationId, owner, repo, prNumber, mappedComments, summary);
    } catch (reviewError) {
      // If inline review fails (e.g., position mapping issues), fall back to a comment
      console.error('Inline review failed, falling back to comment:', reviewError.message);
      const commentBody = formatFallbackComment(mappedComments, summary);
      await postPRComment(installationId, owner, repo, prNumber, commentBody);
    }

    await updateReviewJobStatus(jobId, 'completed', mappedComments.length);
    return { commentsPosted: mappedComments.length, message: 'Review posted' };

  } catch (error) {
    console.error(`Review failed for ${owner}/${repo}#${prNumber}:`, error.message);
    await updateReviewJobStatus(jobId, 'failed', 0, error.message);
    throw error;
  }
};

// Format comments as a single PR comment (fallback when inline fails)
const formatFallbackComment = (comments, summary) => {
  const sections = comments.map(c => {
    const severityEmoji = { error: '🔴', warning: '🟡', info: '🔵', suggestion: '💡' };
    const emoji = severityEmoji[c.severity] || '💡';
    return `${emoji} **${c.file}:${c.line}** — ${c.comment}`;
  });

  return `${summary}\n\n${sections.join('\n\n')}`;
};
