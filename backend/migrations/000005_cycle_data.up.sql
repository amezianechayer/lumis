CREATE TABLE IF NOT EXISTS cycle_data (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  last_period_date DATE NOT NULL,
  cycle_length     INT NOT NULL DEFAULT 28,
  period_length    INT NOT NULL DEFAULT 5,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
