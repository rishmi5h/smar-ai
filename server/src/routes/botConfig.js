import express from 'express';
import {
  getAllRepositories,
  getRepositoryById,
  updateRepositoryConfig,
  getReviewJobsByRepoId,
} from '../db/queries.js';

export const botConfigRoute = express.Router();

// List all repos where the bot is installed
botConfigRoute.get('/repos', async (req, res) => {
  try {
    const repos = await getAllRepositories();
    res.json({ success: true, repos });
  } catch (error) {
    console.error('Error fetching repos:', error.message);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Get config for a specific repo
botConfigRoute.get('/repos/:id/config', async (req, res) => {
  try {
    const repo = await getRepositoryById(parseInt(req.params.id));
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    res.json({
      success: true,
      repo: {
        id: repo.id,
        full_name: repo.full_name,
        enabled: repo.enabled,
        config: repo.config,
      },
    });
  } catch (error) {
    console.error('Error fetching repo config:', error.message);
    res.status(500).json({ error: 'Failed to fetch repository config' });
  }
});

// Update config for a specific repo
botConfigRoute.put('/repos/:id/config', async (req, res) => {
  try {
    const { config, enabled } = req.body;
    const repo = await getRepositoryById(parseInt(req.params.id));
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const updatedConfig = {
      ...repo.config,
      ...(config || {}),
    };

    const updated = await updateRepositoryConfig(
      repo.id,
      updatedConfig,
      enabled !== undefined ? enabled : repo.enabled
    );

    res.json({ success: true, repo: updated });
  } catch (error) {
    console.error('Error updating repo config:', error.message);
    res.status(500).json({ error: 'Failed to update repository config' });
  }
});

// Get recent review jobs for a repo
botConfigRoute.get('/repos/:id/reviews', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const reviews = await getReviewJobsByRepoId(parseInt(req.params.id), limit);
    res.json({ success: true, reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error.message);
    res.status(500).json({ error: 'Failed to fetch review history' });
  }
});
