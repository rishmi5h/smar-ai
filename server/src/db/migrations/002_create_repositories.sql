CREATE TABLE IF NOT EXISTS repositories (
  id SERIAL PRIMARY KEY,
  installation_id INTEGER REFERENCES installations(id) ON DELETE CASCADE,
  github_repo_id BIGINT UNIQUE NOT NULL,
  full_name VARCHAR(500) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repositories_installation
  ON repositories(installation_id);

CREATE INDEX IF NOT EXISTS idx_repositories_full_name
  ON repositories(full_name);
