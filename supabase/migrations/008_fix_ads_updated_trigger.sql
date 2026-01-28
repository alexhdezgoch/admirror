-- Fix the ads_updated trigger: the shared update_last_updated() function
-- references NEW.last_updated which exists on client_brands but NOT on ads
-- (ads uses updated_at).  Create a dedicated function for ads.

CREATE OR REPLACE FUNCTION update_ads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace the broken trigger
DROP TRIGGER IF EXISTS ads_updated ON ads;

CREATE TRIGGER ads_updated
  BEFORE UPDATE ON ads
  FOR EACH ROW
  EXECUTE FUNCTION update_ads_updated_at();
