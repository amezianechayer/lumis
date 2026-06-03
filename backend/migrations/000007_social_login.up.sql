-- Social login provider subjects (Sign in with Apple / Google).
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_sub  VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_apple_sub  ON users(apple_sub)  WHERE apple_sub  IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL;
