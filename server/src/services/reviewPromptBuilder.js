// Builds structured prompts for AI code review of PR diffs

const MAX_PATCH_LENGTH = 3000;
const MAX_FILES_PER_BATCH = 8;

// File patterns to skip in reviews
const SKIP_PATTERNS = [
  /\.lock$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /\.min\.(js|css)$/,
  /\.map$/,
  /\.d\.ts$/,
  /\.snap$/,
  /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i,
];

export const shouldSkipFile = (filename) => {
  return SKIP_PATTERNS.some(pattern => pattern.test(filename));
};

export const filterReviewableFiles = (files) => {
  return files.filter(f => {
    if (shouldSkipFile(f.filename)) return false;
    if (!f.patch) return false; // binary or empty
    if (f.status === 'removed') return false; // deleted files
    return true;
  });
};

// Split files into batches for Groq context window limits
export const batchFiles = (files) => {
  const batches = [];
  for (let i = 0; i < files.length; i += MAX_FILES_PER_BATCH) {
    batches.push(files.slice(i, i + MAX_FILES_PER_BATCH));
  }
  return batches;
};

// Build the prompt for reviewing a batch of file diffs
export const buildReviewPrompt = (prMeta, fileBatch, config = {}) => {
  const focusAreas = config.focusAreas || ['bugs', 'security', 'performance', 'code-quality'];

  const filesText = fileBatch.map(f => {
    const patch = f.patch.substring(0, MAX_PATCH_LENGTH);
    const truncated = f.patch.length > MAX_PATCH_LENGTH ? '\n... (patch truncated)' : '';
    return `### ${f.filename} (${f.status}) +${f.additions}/-${f.deletions}\n\`\`\`diff\n${patch}${truncated}\n\`\`\``;
  }).join('\n\n');

  return `You are an expert code reviewer. Review the following PR diff and return your findings as a JSON array.

**PR:** ${prMeta.title}
**Description:** ${(prMeta.body || 'No description').substring(0, 500)}
**Branch:** ${prMeta.head} → ${prMeta.base}

**Focus Areas:** ${focusAreas.join(', ')}

**File Changes:**
${filesText}

Return a JSON array of review comments. Each comment MUST have these exact fields:
- "file": the exact filename from the diff
- "line": the line number in the NEW version of the file (the + side of the diff). Use the line number shown after @@ in the diff hunk header for context.
- "severity": one of "error", "warning", "info", "suggestion"
- "comment": a clear, actionable description of the issue or suggestion

Rules:
- Only comment on meaningful issues. Do NOT comment on style preferences or trivial formatting.
- Reference specific code when suggesting changes.
- For security issues, always use severity "error".
- For potential bugs, use severity "warning" or "error".
- Keep comments concise (1-3 sentences each).
- If there are no issues, return an empty array [].
- Return ONLY valid JSON, no markdown fences, no extra text.

JSON array:`;
};

// Parse the line number from a diff hunk to map to GitHub's "line" parameter
// GitHub's line parameter for PR reviews refers to the line number in the diff,
// specifically the last line of the hunk where the comment should appear.
export const parseDiffLineNumbers = (patch) => {
  const lineMap = new Map(); // maps new-file line number → diff position
  let diffPosition = 0;
  let newLineNumber = 0;

  for (const line of patch.split('\n')) {
    diffPosition++;

    const hunkHeader = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkHeader) {
      newLineNumber = parseInt(hunkHeader[1]) - 1; // will be incremented on next + or space line
      continue;
    }

    if (line.startsWith('+')) {
      newLineNumber++;
      lineMap.set(newLineNumber, diffPosition);
    } else if (line.startsWith('-')) {
      // deleted line — don't increment newLineNumber
    } else {
      // context line
      newLineNumber++;
      lineMap.set(newLineNumber, diffPosition);
    }
  }

  return lineMap;
};

// Build line maps for all files in a batch
export const buildLineMapForFiles = (files) => {
  const maps = {};
  for (const file of files) {
    if (file.patch) {
      maps[file.filename] = parseDiffLineNumbers(file.patch);
    }
  }
  return maps;
};
