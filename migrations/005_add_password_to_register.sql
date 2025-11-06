-- Add password column to register table
ALTER TABLE register ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Make sure the column is not nullable after adding data
-- ALTER TABLE register ALTER COLUMN password_hash SET NOT NULL;
