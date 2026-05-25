DROP TRIGGER IF EXISTS set_users_updated_at ON users;
DROP FUNCTION IF EXISTS trigger_set_updated_at;
DROP INDEX IF EXISTS idx_refresh_tokens_user;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_deleted_at;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;
