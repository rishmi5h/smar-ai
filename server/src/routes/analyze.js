import express from 'express';
import {
  parseGithubUrl,
  getRepoMetadata,
  getRelevantCodeFiles,
  getCodeSnippets,
  getRepoTree,
  getRepoReleases,
  getRepoCommitsRecent
} from '../services/githubService.js';
import { computeHealthScore } from '../services/healthScoreService.js';
import {
  generateCodeOverview,
  generateCodeExplanation,
  generateLearningGuide,
  streamCodeAnalysis,
  streamChatResponse
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

// Repository health score endpoint
analyzeRepoRoute.get('/health-score', async (req, res) => {
  try {
    const { repoUrl } = req.query;

    if (!repoUrl) {
      return res.status(400).json({ error: 'repoUrl is required as query parameter' });
    }

    const { owner, repo } = parseGithubUrl(repoUrl);
    const metadata = await getRepoMetadata(owner, repo);

    const [tree, hasReleases, commitInfo] = await Promise.all([
      getRepoTree(owner, repo, metadata.defaultBranch),
      getRepoReleases(owner, repo),
      getRepoCommitsRecent(owner, repo)
    ]);

    const healthScore = computeHealthScore(metadata, tree, hasReleases, commitInfo);

    res.json({
      success: true,
      healthScore,
      repository: {
        name: metadata.name,
        owner: metadata.owner
      }
    });
  } catch (error) {
    console.error('Health score error:', error);
    res.status(400).json({ error: error.message });
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
