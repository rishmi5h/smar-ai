import express from 'express';
import {
  parseGithubUrl,
  getRepoMetadata,
  getRelevantCodeFiles,
  getCodeSnippets,
  getRecentCommits,
  getCompare,
  getCommitDetail
} from '../services/githubService.js';
import {
  generateCodeOverview,
  generateCodeExplanation,
  generateLearningGuide,
  streamCodeAnalysis,
  streamChatResponse,
  streamDiffAnalysis,
  streamCommitAnalysis
} from '../services/groqService.js';

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

// Compare two commits with AI analysis
analyzeRepoRoute.post('/compare', async (req, res) => {
  try {
    const { repoUrl, base, head } = req.body;

    if (!repoUrl || !base || !head) {
      return res.status(400).json({ error: 'repoUrl, base, and head are required' });
    }

    const { owner, repo } = parseGithubUrl(repoUrl);
    const compareData = await getCompare(owner, repo, base, head);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send comparison metadata first
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
        deletions: f.deletions,
        patch: f.patch
      })),
      commits: compareData.commits
    })}\n\n`);

    // Stream AI analysis
    const stream = await streamDiffAnalysis(compareData, repo);

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

// Get commit detail with AI analysis
analyzeRepoRoute.post('/commit-detail', async (req, res) => {
  try {
    const { repoUrl, sha } = req.body;

    if (!repoUrl || !sha) {
      return res.status(400).json({ error: 'repoUrl and sha are required' });
    }

    const { owner, repo } = parseGithubUrl(repoUrl);
    const commitData = await getCommitDetail(owner, repo, sha);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send commit metadata first
    res.write(`data: ${JSON.stringify({
      type: 'metadata',
      commit: commitData
    })}\n\n`);

    // Stream AI analysis
    const stream = await streamCommitAnalysis(commitData, repo);

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
    console.error('Commit detail error:', error);
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
