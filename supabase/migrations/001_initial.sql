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

-- تفعيل RLS (Row Level Security) اختياري — يمكن تفعيله لاحقاً حسب الصلاحيات
-- ALTER TABLE committee ENABLE ROW LEVEL SECURITY;
