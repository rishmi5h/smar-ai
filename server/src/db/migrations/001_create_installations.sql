CREATE TABLE IF NOT EXISTS installations (
  id SERIAL PRIMARY KEY,
  github_installation_id BIGINT UNIQUE NOT NULL,
  account_login VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
