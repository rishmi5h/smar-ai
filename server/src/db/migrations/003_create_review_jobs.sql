CREATE TABLE IF NOT EXISTS review_jobs (
  id SERIAL PRIMARY KEY,
  repository_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
  pr_number INTEGER NOT NULL,
  pr_title VARCHAR(500),
  delivery_id VARCHAR(100) UNIQUE,
  status VARCHAR(50) DEFAULT 'pending',
  comments_posted INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_review_jobs_repo_status
  ON review_jobs(repository_id, status);
