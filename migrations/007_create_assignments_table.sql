-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id SERIAL PRIMARY KEY,
  register_id INTEGER NOT NULL REFERENCES register(id) ON DELETE CASCADE,
  register_firstname VARCHAR(100) NOT NULL,
  register_lastname VARCHAR(100) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index for better query performance on register_id
CREATE INDEX IF NOT EXISTS idx_assignments_register_id ON assignments(register_id);

-- Add comment to the table
COMMENT ON TABLE assignments IS 'Stores assignment submissions by registered users';

-- Add comments to columns
COMMENT ON COLUMN assignments.register_id IS 'Foreign key referencing the register table';
COMMENT ON COLUMN assignments.register_firstname IS 'First name of the registered user (denormalized for performance)';
COMMENT ON COLUMN assignments.register_lastname IS 'Last name of the registered user (denormalized for performance)';
COMMENT ON COLUMN assignments.file_name IS 'Original name of the uploaded file';
COMMENT ON COLUMN assignments.file_path IS 'Server path where the file is stored';
COMMENT ON COLUMN assignments.file_size IS 'Size of the file in bytes';
COMMENT ON COLUMN assignments.file_type IS 'MIME type of the uploaded file';
COMMENT ON COLUMN assignments.submission_date IS 'Date and time when the assignment was submitted';

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assignments_updated_at
BEFORE UPDATE ON assignments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
