-- FACE PROFILES
CREATE TABLE IF NOT EXISTS face_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url             TEXT NOT NULL,
  face_shape            VARCHAR(50),
  face_shape_confidence FLOAT,
  eye_shape             VARCHAR(50),
  eye_distance          VARCHAR(20),
  skin_tone             VARCHAR(20),
  undertone             VARCHAR(20),
  color_season          VARCHAR(20),
  nose_shape            VARCHAR(50),
  lip_shape             VARCHAR(50),
  jaw_type              VARCHAR(50),
  landmarks             JSONB,
  analysis_version      VARCHAR(20),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SKIN HEALTH SCANS
CREATE TABLE IF NOT EXISTS skin_scans (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url               TEXT NOT NULL,
  overall_score           INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  acne_score              INTEGER CHECK (acne_score BETWEEN 0 AND 100),
  hydration_score         INTEGER CHECK (hydration_score BETWEEN 0 AND 100),
  uniformity_score        INTEGER CHECK (uniformity_score BETWEEN 0 AND 100),
  texture_score           INTEGER CHECK (texture_score BETWEEN 0 AND 100),
  acne_count              INTEGER NOT NULL DEFAULT 0,
  acne_zones              TEXT[],
  dark_spots_count        INTEGER NOT NULL DEFAULT 0,
  hyperpigmentation_level VARCHAR(20),
  pores_condition         VARCHAR(20),
  oiliness_zones          TEXT[],
  dryness_zones           TEXT[],
  redness_level           VARCHAR(20),
  fine_lines_detected     BOOLEAN NOT NULL DEFAULT FALSE,
  ai_analysis             JSONB,
  sleep_hours             FLOAT,
  stress_level            INTEGER CHECK (stress_level BETWEEN 1 AND 10),
  water_intake_liters     FLOAT,
  notes                   TEXT,
  week_number             INTEGER,
  year                    INTEGER,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RECOMMENDATIONS
CREATE TABLE IF NOT EXISTS recommendations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  face_profile_id UUID REFERENCES face_profiles(id),
  skin_scan_id    UUID REFERENCES skin_scans(id),
  type            VARCHAR(50) NOT NULL,
  gender_target   VARCHAR(20),
  title           VARCHAR(200),
  summary         TEXT,
  steps           JSONB,
  products        JSONB,
  occasion        VARCHAR(50),
  season          VARCHAR(20),
  is_premium_only BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI COACH CONVERSATIONS
CREATE TABLE IF NOT EXISTS coach_conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_coach_conversations_updated_at
  BEFORE UPDATE ON coach_conversations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS coach_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES coach_conversations(id) ON DELETE CASCADE,
  role            VARCHAR(20) CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  tokens_used     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SCANNED PRODUCTS
CREATE TABLE IF NOT EXISTS scanned_products (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  barcode               VARCHAR(50),
  product_name          VARCHAR(200),
  brand                 VARCHAR(100),
  category              VARCHAR(100),
  ingredients           TEXT[],
  compatibility_score   INTEGER CHECK (compatibility_score BETWEEN 0 AND 100),
  compatibility_verdict VARCHAR(20),
  concerns              TEXT[],
  benefits              TEXT[],
  full_analysis         JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STREAKS & GAMIFICATION
CREATE TABLE IF NOT EXISTS user_streaks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_scan_date DATE,
  total_scans    INTEGER NOT NULL DEFAULT 0,
  badges_earned  TEXT[],
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(100) UNIQUE,
  status                 VARCHAR(50),
  plan                   VARCHAR(50) NOT NULL DEFAULT 'premium',
  amount_cents           INTEGER,
  currency               VARCHAR(3) NOT NULL DEFAULT 'EUR',
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_skin_scans_user_created     ON skin_scans(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_type   ON recommendations(user_id, type);
CREATE INDEX IF NOT EXISTS idx_coach_messages_conversation ON coach_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_face_profiles_user          ON face_profiles(user_id, created_at DESC);
