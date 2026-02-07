-- Playbooks table for storing generated creative strategy briefs
CREATE TABLE playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES client_brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Metadata
  title TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Source data counts
  my_patterns_included BOOLEAN DEFAULT false,
  competitor_trends_count INTEGER DEFAULT 0,
  competitor_ads_count INTEGER DEFAULT 0,

  -- Content (structured JSON)
  content JSONB NOT NULL,

  -- Sharing
  share_token UUID DEFAULT gen_random_uuid() UNIQUE,
  is_public BOOLEAN DEFAULT false,
  share_expires_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('generating', 'completed', 'failed')),
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_playbooks_brand_id ON playbooks(brand_id);
CREATE INDEX idx_playbooks_user_id ON playbooks(user_id);
CREATE INDEX idx_playbooks_share_token ON playbooks(share_token) WHERE is_public = true;

-- RLS
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own playbooks" ON playbooks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view shared playbooks" ON playbooks
  FOR SELECT USING (
    is_public = true
    AND (share_expires_at IS NULL OR share_expires_at > NOW())
  );
