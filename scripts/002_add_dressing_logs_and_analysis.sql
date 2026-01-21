-- Add analysis fields to ulcer_images table
ALTER TABLE ulcer_images
ADD COLUMN IF NOT EXISTS ulcer_size_cm2 NUMERIC(6,2),
ADD COLUMN IF NOT EXISTS depth_mm NUMERIC(4,1),
ADD COLUMN IF NOT EXISTS diameter_cm NUMERIC(4,1),
ADD COLUMN IF NOT EXISTS tissue_composition TEXT,
ADD COLUMN IF NOT EXISTS granulation_percent INTEGER,
ADD COLUMN IF NOT EXISTS exudate_level TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS diagnosis TEXT,
ADD COLUMN IF NOT EXISTS severity TEXT,
ADD COLUMN IF NOT EXISTS recommended_actions TEXT[];

-- Create dressing_logs table for tracking wound dressing changes
CREATE TABLE IF NOT EXISTS dressing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on dressing_logs
ALTER TABLE dressing_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dressing_logs
CREATE POLICY "Users can view own dressing logs" ON dressing_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dressing logs" ON dressing_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own dressing logs" ON dressing_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Add patient condition fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS condition_type TEXT,
ADD COLUMN IF NOT EXISTS ulcer_type TEXT,
ADD COLUMN IF NOT EXISTS dressing_reminder_hours INTEGER DEFAULT 24;

-- Policy for deleting notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);
