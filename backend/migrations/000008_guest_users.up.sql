-- Anonymous "guest" accounts so users can start without a signup wall.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT FALSE;
