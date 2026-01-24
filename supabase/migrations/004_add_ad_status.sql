-- Add ad status tracking columns
-- This migration adds is_active and last_seen_at to ads table,
-- and last_synced_at to competitors table for tracking sync state

-- Add is_active column to ads table (defaults to true for existing ads)
ALTER TABLE ads ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add last_seen_at column to ads table (defaults to now for existing ads)
ALTER TABLE ads ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- Add last_synced_at column to competitors table
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- IMPORTANT: Update existing rows to have is_active = true (DEFAULT only applies to new rows)
UPDATE ads SET is_active = true WHERE is_active IS NULL;
UPDATE ads SET last_seen_at = NOW() WHERE last_seen_at IS NULL;

-- Create index for efficient filtering by active status
CREATE INDEX IF NOT EXISTS idx_ads_is_active ON ads(is_active);

-- Create composite index for efficient queries on brand + active status
CREATE INDEX IF NOT EXISTS idx_ads_brand_active ON ads(client_brand_id, is_active);
