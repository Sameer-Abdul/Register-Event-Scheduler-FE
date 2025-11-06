-- Add tenant_id column to register table
ALTER TABLE register 
ADD COLUMN tenant_id VARCHAR(20);

-- Add foreign key constraint
ALTER TABLE register
ADD CONSTRAINT fk_register_tenant
FOREIGN KEY (tenant_id) 
REFERENCES tenant_master(tenant_id)
ON DELETE SET NULL;

-- Update existing records to have a default tenant if needed
-- This sets all existing records to use the first tenant (T1) as a default
-- You may want to update this based on your requirements
UPDATE register SET tenant_id = 'T1' WHERE tenant_id IS NULL;

-- Make the column NOT NULL after setting default values
-- Uncomment the line below after verifying the data update
-- ALTER TABLE register ALTER COLUMN tenant_id SET NOT NULL;
