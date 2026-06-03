-- Rich AI morphology/color diagnostic persisted on the face profile.
ALTER TABLE face_profiles ADD COLUMN IF NOT EXISTS style_analysis JSONB;
