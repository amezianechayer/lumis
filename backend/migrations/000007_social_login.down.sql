DROP INDEX IF EXISTS idx_users_apple_sub;
DROP INDEX IF EXISTS idx_users_google_sub;
ALTER TABLE users DROP COLUMN IF EXISTS apple_sub;
ALTER TABLE users DROP COLUMN IF EXISTS google_sub;
