-- Add Zoom meeting columns to event table
ALTER TABLE event
ADD COLUMN IF NOT EXISTS zoom_meeting_id TEXT,
ADD COLUMN IF NOT EXISTS zoom_join_url TEXT,
ADD COLUMN IF NOT EXISTS zoom_host_url TEXT,
ADD COLUMN IF NOT EXISTS zoom_password TEXT;
