-- Drop UNIQUE on user_id (constraint name: meta_connections_user_id_key)
ALTER TABLE meta_connections DROP CONSTRAINT meta_connections_user_id_key;

-- Add client_brand_id column
ALTER TABLE meta_connections
  ADD COLUMN client_brand_id UUID REFERENCES client_brands(id) ON DELETE CASCADE;

-- Delete existing rows (no way to backfill brand, users reconnect per brand)
DELETE FROM meta_connections;

-- Make NOT NULL after cleanup
ALTER TABLE meta_connections ALTER COLUMN client_brand_id SET NOT NULL;

-- Composite unique: one connection per user+brand
ALTER TABLE meta_connections ADD CONSTRAINT meta_connections_user_brand_unique
  UNIQUE (user_id, client_brand_id);

-- Index for joins
CREATE INDEX idx_meta_connections_client_brand_id ON meta_connections(client_brand_id);
