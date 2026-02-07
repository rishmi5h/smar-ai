import { query } from '../config/database.js';

// --- Installations ---

export const upsertInstallation = async (githubInstallationId, accountLogin, accountType) => {
  const result = await query(
    `INSERT INTO installations (github_installation_id, account_login, account_type)
     VALUES ($1, $2, $3)
     ON CONFLICT (github_installation_id)
     DO UPDATE SET account_login = $2, account_type = $3, updated_at = NOW()
     RETURNING *`,
    [githubInstallationId, accountLogin, accountType]
  );
  return result.rows[0];
};

export const getInstallationByGithubId = async (githubInstallationId) => {
  const result = await query(
    'SELECT * FROM installations WHERE github_installation_id = $1',
    [githubInstallationId]
  );
  return result.rows[0] || null;
};

export const deleteInstallation = async (githubInstallationId) => {
  await query(
    'DELETE FROM installations WHERE github_installation_id = $1',
    [githubInstallationId]
  );
};

// --- Repositories ---

export const upsertRepository = async (installationId, githubRepoId, fullName) => {
  const result = await query(
    `INSERT INTO repositories (installation_id, github_repo_id, full_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (github_repo_id)
     DO UPDATE SET full_name = $3, installation_id = $1, updated_at = NOW()
     RETURNING *`,
    [installationId, githubRepoId, fullName]
  );
  return result.rows[0];
};

export const getRepositoryByFullName = async (fullName) => {
  const result = await query(
    'SELECT r.*, i.github_installation_id FROM repositories r JOIN installations i ON r.installation_id = i.id WHERE r.full_name = $1',
    [fullName]
  );
  return result.rows[0] || null;
};

export const getRepositoriesByInstallationId = async (installationId) => {
  const result = await query(
    'SELECT * FROM repositories WHERE installation_id = $1 ORDER BY full_name',
    [installationId]
  );
  return result.rows;
};

export const getAllRepositories = async () => {
  const result = await query(
    `SELECT r.*, i.github_installation_id, i.account_login
     FROM repositories r
     JOIN installations i ON r.installation_id = i.id
     ORDER BY r.full_name`
  );
  return result.rows;
};

export const getRepositoryById = async (id) => {
  const result = await query(
    `SELECT r.*, i.github_installation_id FROM repositories r
     JOIN installations i ON r.installation_id = i.id
     WHERE r.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

export const updateRepositoryConfig = async (id, config, enabled) => {
  const result = await query(
    `UPDATE repositories SET config = $1, enabled = $2, updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [JSON.stringify(config), enabled, id]
  );
  return result.rows[0] || null;
};

// --- Review Jobs ---

export const createReviewJob = async (repositoryId, prNumber, prTitle, deliveryId) => {
  const result = await query(
    `INSERT INTO review_jobs (repository_id, pr_number, pr_title, delivery_id, status)
     VALUES ($1, $2, $3, $4, 'pending')
     ON CONFLICT (delivery_id) DO NOTHING
     RETURNING *`,
    [repositoryId, prNumber, prTitle, deliveryId]
  );
  return result.rows[0] || null; // null means duplicate delivery
};

export const updateReviewJobStatus = async (id, status, commentsPosted = 0, errorMessage = null) => {
  await query(
    `UPDATE review_jobs
     SET status = $1, comments_posted = $2, error_message = $3,
         completed_at = CASE WHEN $1 IN ('completed', 'failed') THEN NOW() ELSE NULL END
     WHERE id = $4`,
    [status, commentsPosted, errorMessage, id]
  );
};

export const getReviewJobsByRepoId = async (repositoryId, limit = 20) => {
  const result = await query(
    `SELECT * FROM review_jobs WHERE repository_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [repositoryId, limit]
  );
  return result.rows;
};
