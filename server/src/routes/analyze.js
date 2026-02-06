import express from 'express';
import {
  parseGithubUrl,
  parseGithubPrOrIssueUrl,
  getRepoMetadata,
  getRelevantCodeFiles,
  getCodeSnippets,
  getRecentCommits,
  getCompare,
  getRepoTree,
  getCodeSnippetsAtRef,
  getPRDetails,
  getIssueDetails,
  getArchitectureCodeFiles,
  getArchitectureSnippets
} from '../services/githubService.js';
import {
  generateCodeOverview,
  generateCodeExplanation,
  generateLearningGuide,
  streamCodeAnalysis,
  streamChatResponse,
  streamEvolutionAnalysis,
  streamArchitectureAnalysis,
  streamPRAnalysis,
  streamIssueAnalysis
} from '../services/groqService.js';
import {
  buildDependencyGraph,
  generateMermaidDSL
} from '../services/importParser.js';

export const analyzeRepoRoute = express.Router();

// Main endpoint to analyze a GitHub repository
analyzeRepoRoute.post('/analyze', async (req, res) => {
  try {
    const { repoUrl, analysisType = 'overview' } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ error: 'repoUrl is required' });
    }

    // Parse the GitHub URL
    const { owner, repo } = parseGithubUrl(repoUrl);

    // Fetch repository metadata
    const metadata = await getRepoMetadata(owner, repo);

    // Get relevant code files
    const { files } = await getRelevantCodeFiles(owner, repo);
    const filePaths = files.map(f => f.path);

    // Get code snippets
    const codeSnippets = await getCodeSnippets(owner, repo, filePaths);

    // Generate analysis based on type
    let analysis;
    if (analysisType === 'overview') {
      analysis = await generateCodeOverview(metadata, codeSnippets);
    } else if (analysisType === 'detailed') {
      analysis = await generateCodeExplanation(metadata, codeSnippets);
    } else if (analysisType === 'learning') {
      analysis = await generateLearningGuide(metadata, codeSnippets);
    } else {
      return res.status(400).json({ error: 'Invalid analysisType. Use: overview, detailed, or learning' });
    }

    res.json({
      success: true,
      repository: {
        name: metadata.name,
        owner: metadata.owner,
        description: metadata.description,
        language: metadata.language,
        stars: metadata.stars,
        topics: metadata.topics
      },
      analysisType,
      analysis,
      filesAnalyzed: filePaths.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(400).json({
      error: error.message,
      details: 'Make sure GROQ_API_KEY is set and a valid GitHub URL is provided'
    });
  }
});

// Streaming endpoint for real-time analysis
analyzeRepoRoute.post('/analyze-stream', async (req, res) => {
  try {
    const { repoUrl, analysisType = 'overview' } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ error: 'repoUrl is required' });
    }

    // Parse the GitHub URL
    const { owner, repo } = parseGithubUrl(repoUrl);

    // Fetch repository metadata
    const metadata = await getRepoMetadata(owner, repo);

    // Get relevant code files
    const { files } = await getRelevantCodeFiles(owner, repo);
    const filePaths = files.map(f => f.path);

    // Get code snippets
    const codeSnippets = await getCodeSnippets(owner, repo, filePaths);

    // Set up streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send metadata
    res.write(`data: ${JSON.stringify({
      type: 'metadata',
      repository: {
        name: metadata.name,
        owner: metadata.owner,
        description: metadata.description,
        language: metadata.language,
        stars: metadata.stars,
        topics: metadata.topics
      },
      analysisType,
      filesAnalyzed: filePaths.length
    })}\n\n`);

    // Stream the analysis
    const stream = await streamCodeAnalysis(metadata, codeSnippets, analysisType);

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({
          type: 'analysis_chunk',
          text: event.delta.text
        })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({
      type: 'complete',
      timestamp: new Date().toISOString()
    })}\n\n`);

    res.end();
  } catch (error) {
    console.error('Streaming analysis error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message
    })}\n\n`);
    res.end();
  }
});

// Interactive Q&A chat endpoint
analyzeRepoRoute.post('/chat', async (req, res) => {
  try {
    const { repoUrl, question, history = [] } = req.body;

    if (!repoUrl || !question) {
      return res.status(400).json({ error: 'repoUrl and question are required' });
    }

    const { owner, repo } = parseGithubUrl(repoUrl);
    const metadata = await getRepoMetadata(owner, repo);
    const { files } = await getRelevantCodeFiles(owner, repo);
    const filePaths = files.map(f => f.path);
    const codeSnippets = await getCodeSnippets(owner, repo, filePaths);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await streamChatResponse(metadata, codeSnippets, history, question);

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({
          type: 'chat_chunk',
          text: event.delta.text
        })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.status(400).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }
});

// Get recent commits for a repository
analyzeRepoRoute.get('/commits', async (req, res) => {
  try {
    const { repoUrl, since, perPage } = req.query;

    if (!repoUrl) {
      return res.status(400).json({ error: 'repoUrl is required' });
    }

    const { owner, repo } = parseGithubUrl(repoUrl);
    const commits = await getRecentCommits(owner, repo, since || undefined, parseInt(perPage) || 20);

    res.json({ success: true, commits });
  } catch (error) {
    console.error('Commits fetch error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Compare codebase evolution between two commits
analyzeRepoRoute.post('/compare', async (req, res) => {
  try {
    const { repoUrl, base, head, baseLabel, headLabel } = req.body;

    if (!repoUrl || !base || !head) {
      return res.status(400).json({ error: 'repoUrl, base, and head are required' });
    }

    const { owner, repo } = parseGithubUrl(repoUrl);

    // Fetch compare stats and relevant file list in parallel
    const [compareData, baseTree, headTree] = await Promise.all([
      getCompare(owner, repo, base, head),
      getRepoTree(owner, repo, base),
      getRepoTree(owner, repo, head)
    ]);

    // Get the changed filenames to know which files to fetch
    const changedFilePaths = compareData.files.map(f => f.filename);

    // Fetch code at both commits for changed files
    const [baseSnippets, headSnippets] = await Promise.all([
      getCodeSnippetsAtRef(owner, repo, base, changedFilePaths),
      getCodeSnippetsAtRef(owner, repo, head, changedFilePaths)
    ]);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send comparison metadata
    res.write(`data: ${JSON.stringify({
      type: 'metadata',
      totalCommits: compareData.totalCommits,
      filesChanged: compareData.filesChanged,
      additions: compareData.additions,
      deletions: compareData.deletions,
      files: compareData.files.map(f => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions
      })),
      commits: compareData.commits
    })}\n\n`);

    // Stream AI evolution analysis
    const stream = await streamEvolutionAnalysis(
      repo,
      baseSnippets,
      headSnippets,
      compareData,
      baseLabel || base.substring(0, 7),
      headLabel || head.substring(0, 7)
    );

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({
          type: 'analysis_chunk',
          text: event.delta.text
        })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Compare error:', error);
    if (!res.headersSent) {
      res.status(400).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }
});

// Get repository metadata only
analyzeRepoRoute.get('/repo-info', async (req, res) => {
  try {
    const { repoUrl } = req.query;

    if (!repoUrl) {
      return res.status(400).json({ error: 'repoUrl is required as query parameter' });
    }

    const { owner, repo } = parseGithubUrl(repoUrl);
    const metadata = await getRepoMetadata(owner, repo);
    const { files } = await getRelevantCodeFiles(owner, repo);

    res.json({
      success: true,
      metadata,
      filesFound: files.length
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Architecture diagram endpoint
analyzeRepoRoute.post('/architecture', async (req, res) => {
  try {
    const { repoUrl } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ error: 'repoUrl is required' });
    }

    const { owner, repo } = parseGithubUrl(repoUrl);
    const metadata = await getRepoMetadata(owner, repo);

    // Use architecture-specific file fetching (source code only, more files, parallel)
    const { files: archFiles, branch } = await getArchitectureCodeFiles(owner, repo);
    const codeSnippets = await getArchitectureSnippets(owner, repo, archFiles, branch);

    // Build dependency graph and generate Mermaid DSL
    const graph = buildDependencyGraph(codeSnippets);
    const mermaidDSL = generateMermaidDSL(graph);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send metadata with graph data and Mermaid DSL
    res.write(`data: ${JSON.stringify({
      type: 'metadata',
      graph,
      mermaidDSL,
      filesAnalyzed: codeSnippets.length
    })}\n\n`);

    // Stream AI architecture analysis
    const stream = await streamArchitectureAnalysis(metadata, codeSnippets, mermaidDSL, graph.externalDeps);

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({
          type: 'analysis_chunk',
          text: event.delta.text
        })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Architecture analysis error:', error);
    if (!res.headersSent) {
      res.status(400).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }
});

// PR Analysis endpoint
analyzeRepoRoute.post('/pr-analyze', async (req, res) => {
  try {
    const { prUrl } = req.body;

    if (!prUrl) {
      return res.status(400).json({ error: 'prUrl is required' });
    }

    const parsed = parseGithubPrOrIssueUrl(prUrl);
    if (!parsed || parsed.type !== 'pr') {
      return res.status(400).json({ error: 'Invalid PR URL. Use format: https://github.com/owner/repo/pull/123' });
    }

    const { owner, repo, number } = parsed;
    const prDetails = await getPRDetails(owner, repo, number);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send PR metadata
    res.write(`data: ${JSON.stringify({
      type: 'metadata',
      pr: prDetails.pr,
      files: prDetails.files.map(f => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions
      })),
      reviews: prDetails.reviews,
      owner,
      repo
    })}\n\n`);

    // Stream AI PR analysis
    const stream = await streamPRAnalysis(repo, prDetails);

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({
          type: 'analysis_chunk',
          text: event.delta.text
        })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('PR analysis error:', error);
    if (!res.headersSent) {
      res.status(400).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }
});

// Issue Analysis endpoint
analyzeRepoRoute.post('/issue-analyze', async (req, res) => {
  try {
    const { issueUrl } = req.body;

    if (!issueUrl) {
      return res.status(400).json({ error: 'issueUrl is required' });
    }

    const parsed = parseGithubPrOrIssueUrl(issueUrl);
    if (!parsed || parsed.type !== 'issue') {
      return res.status(400).json({ error: 'Invalid issue URL. Use format: https://github.com/owner/repo/issues/123' });
    }

    const { owner, repo, number } = parsed;
    const issueDetails = await getIssueDetails(owner, repo, number);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send issue metadata
    res.write(`data: ${JSON.stringify({
      type: 'metadata',
      issue: issueDetails.issue,
      commentCount: issueDetails.comments.length,
      owner,
      repo
    })}\n\n`);

    // Stream AI issue analysis
    const stream = await streamIssueAnalysis(repo, issueDetails);

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({
          type: 'analysis_chunk',
          text: event.delta.text
        })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Issue analysis error:', error);
    if (!res.headersSent) {
      res.status(400).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }
});
