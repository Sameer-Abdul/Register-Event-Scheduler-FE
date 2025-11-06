-- Add a new text column to store the file path
ALTER TABLE register ADD COLUMN IF NOT EXISTS payment_screenshot_path TEXT;

-- Copy data from bytea column to text column if needed
-- UPDATE register SET payment_screenshot_path = encode(payment_screenshot, 'escape') WHERE payment_screenshot IS NOT NULL;

-- Drop the old bytea column (uncomment after verifying data is migrated)
-- ALTER TABLE register DROP COLUMN payment_screenshot;

-- Rename the new column to match the old name (optional)
-- ALTER TABLE register RENAME COLUMN payment_screenshot_path TO payment_screenshot;
