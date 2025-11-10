-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    register_id INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_data BYTEA NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Add foreign key constraint if register table exists
    CONSTRAINT fk_register
        FOREIGN KEY(register_id) 
        REFERENCES register(id)
        ON DELETE CASCADE
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_assignments_register_id ON assignments(register_id);
CREATE INDEX IF NOT EXISTS idx_assignments_submission_date ON assignments(submission_date);
