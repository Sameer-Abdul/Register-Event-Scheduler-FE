-- Add rating column to assignments table
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS rating INTEGER;

-- Add a check constraint to ensure rating is between 1 and 5
ALTER TABLE assignments 
  ADD CONSTRAINT valid_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
