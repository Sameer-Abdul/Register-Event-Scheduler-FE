-- Add is_admin column to register table
ALTER TABLE register ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create an admin user (replace with secure credentials in production)
-- Default password: admin123 (you should change this after first login)
-- Make sure to use a secure password hashing function in production
UPDATE register 
SET is_admin = TRUE, 
    password = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' -- password: admin123
WHERE email = 'admin@example.com';

-- If no admin exists, you can uncomment and run this (replace email and hashed password)
-- INSERT INTO register (email, password, first_name, last_name, is_admin, created_at, updated_at)
-- VALUES ('admin@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', TRUE, NOW(), NOW())
-- ON CONFLICT (email) DO NOTHING;
