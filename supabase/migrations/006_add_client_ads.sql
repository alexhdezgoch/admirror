-- Add is_client_ad flag to ads table
ALTER TABLE ads ADD COLUMN is_client_ad BOOLEAN DEFAULT false;

-- Index for efficiently querying client's own ads per brand
CREATE INDEX idx_ads_is_client_ad ON ads(client_brand_id) WHERE is_client_ad = true;
