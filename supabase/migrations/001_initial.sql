-- جداول المدينة الصحية (PostgreSQL / Supabase)
-- كل جدول: id (uuid) + body (jsonb) لمرونة الحقول

CREATE TABLE IF NOT EXISTS committee (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS team_member (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS axis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS standard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS initiative (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS initiative_kpi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS task (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS budget (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS budget_allocation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS transaction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS notification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS file_upload (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS family_survey (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS verification_code (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body jsonb NOT NULL DEFAULT '{}'
);

-- تفعيل RLS (Row Level Security) على جميع الجداول
-- السياسة: السماح فقط للمستخدمين المصادق عليهم (authenticated)

ALTER TABLE committee ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE axis ENABLE ROW LEVEL SECURITY;
ALTER TABLE standard ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiative ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiative_kpi ENABLE ROW LEVEL SECURITY;
ALTER TABLE task ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_allocation ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_upload ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_survey ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_code ENABLE ROW LEVEL SECURITY;

-- سياسة موحّدة: المستخدمون المصادق عليهم فقط يستطيعون القراءة والكتابة
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'committee','team_member','settings','axis','standard','initiative',
    'initiative_kpi','task','budget','budget_allocation','transaction',
    'evidence','notification','file_upload','family_survey',
    'user_preferences','verification_code'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format(
      'CREATE POLICY "authenticated_access" ON %I FOR ALL
       USING (auth.role() = ''authenticated'')
       WITH CHECK (auth.role() = ''authenticated'')',
      tbl
    );
  END LOOP;
END $$;
