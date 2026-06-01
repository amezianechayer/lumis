ALTER TABLE users
  ADD COLUMN IF NOT EXISTS skin_type VARCHAR(20)
    CHECK (skin_type IN ('normal', 'oily', 'dry', 'combination', 'sensitive'));
