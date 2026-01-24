-- Add ads_library_url column to client_brands table
-- This allows tracking the client's own Meta Ads Library URL to compare their ads vs competitors

ALTER TABLE client_brands
ADD COLUMN IF NOT EXISTS ads_library_url TEXT;

-- Add a comment to document the column's purpose
COMMENT ON COLUMN client_brands.ads_library_url IS 'Meta Ads Library URL to track client brand''s own ads';
