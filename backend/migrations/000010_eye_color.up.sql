-- Detected real eye color from the face scan.
ALTER TABLE face_profiles ADD COLUMN IF NOT EXISTS eye_color VARCHAR(30);
