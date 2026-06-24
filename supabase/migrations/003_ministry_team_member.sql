-- جدول مستقل لفريق الوزارة
CREATE TABLE IF NOT EXISTS ministry_team_member (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE ministry_team_member ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_access" ON ministry_team_member;
CREATE POLICY "authenticated_access" ON ministry_team_member
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
