// Contributor Analyzer — extracts contributor patterns from commit data

/**
 * Analyze contributor patterns from commit and file data
 * @param {Array} commits - Commits with {sha, shortSha, message, author, date}
 * @param {Array} files - Changed files with {filename, status, additions, deletions}
 * @returns {{ authors: Array, fileOwnership: Object, activityTimeline: Array, summary: Object }}
 */
export const analyzeContributors = (commits, files) => {
  if (!commits || commits.length === 0) {
    return {
      authors: [],
      fileOwnership: {},
      activityTimeline: [],
      summary: { totalAuthors: 0, topContributor: null, singleAuthorFiles: 0, sharedFiles: 0 }
    };
  }

  // Per-author aggregation
  const authorMap = {};
  for (const commit of commits) {
    const name = commit.author || 'Unknown';
    if (!authorMap[name]) {
      authorMap[name] = {
        name,
        commits: 0,
        firstCommit: commit.date,
        lastCommit: commit.date,
        messages: []
      };
    }
    authorMap[name].commits += 1;
    authorMap[name].messages.push(commit.message);

    // Track date range
    if (commit.date < authorMap[name].firstCommit) {
      authorMap[name].firstCommit = commit.date;
    }
    if (commit.date > authorMap[name].lastCommit) {
      authorMap[name].lastCommit = commit.date;
    }
  }

  // Compute additions/deletions per author (estimate based on commit proportion)
  // Since GitHub compare API doesn't give per-commit file stats, we distribute proportionally
  const totalCommits = commits.length;
  const totalAdditions = files.reduce((sum, f) => sum + (f.additions || 0), 0);
  const totalDeletions = files.reduce((sum, f) => sum + (f.deletions || 0), 0);

  const authors = Object.values(authorMap).map(author => ({
    name: author.name,
    commits: author.commits,
    percentage: Math.round((author.commits / totalCommits) * 100),
    estimatedAdditions: Math.round((author.commits / totalCommits) * totalAdditions),
    estimatedDeletions: Math.round((author.commits / totalCommits) * totalDeletions),
    firstCommit: author.firstCommit,
    lastCommit: author.lastCommit
  }));

  // Sort by commit count descending
  authors.sort((a, b) => b.commits - a.commits);

  // Activity timeline — bucket commits by day
  const dayBuckets = {};
  for (const commit of commits) {
    const day = commit.date ? new Date(commit.date).toISOString().split('T')[0] : 'unknown';
    if (!dayBuckets[day]) {
      dayBuckets[day] = { date: day, total: 0, byAuthor: {} };
    }
    dayBuckets[day].total += 1;
    const author = commit.author || 'Unknown';
    dayBuckets[day].byAuthor[author] = (dayBuckets[day].byAuthor[author] || 0) + 1;
  }

  const activityTimeline = Object.values(dayBuckets).sort((a, b) => a.date.localeCompare(b.date));

  // File ownership — which files were most likely changed by which authors
  // We use the commit messages to match files (heuristic: commits touching specific file paths)
  const fileOwnership = {};
  for (const file of files) {
    fileOwnership[file.filename] = {
      filename: file.filename,
      status: file.status,
      additions: file.additions || 0,
      deletions: file.deletions || 0,
      // With the data we have, we mark the top contributor as likely owner
      likelyOwner: authors[0]?.name || 'Unknown'
    };
  }

  // Summary
  const summary = {
    totalAuthors: authors.length,
    topContributor: authors[0] || null,
    activeDays: activityTimeline.length,
    avgCommitsPerDay: activityTimeline.length > 0
      ? Math.round((totalCommits / activityTimeline.length) * 10) / 10
      : 0,
    singleAuthorCommits: authors.length === 1 ? totalCommits : 0
  };

  return { authors, fileOwnership, activityTimeline, summary };
};
