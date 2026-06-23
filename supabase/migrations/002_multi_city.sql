-- ===== نظام المدن المتعددة - Multi-City Support =====
-- الهدف: السماح لوزارة الصحة بتسجيل مدن صحية وإدارتها مركزياً

-- =============================================
-- 1) جدول المدن
-- =============================================
CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  region VARCHAR(255),
  population INTEGER,
  area_km2 DECIMAL(10,2),
  logo_url TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active', -- active | suspended | pending
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  registered_by UUID REFERENCES users(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX cities_status_idx ON cities(status);
CREATE INDEX cities_name_idx ON cities(name);

-- =============================================
-- 2) إضافة city_id للجداول التشغيلية
-- =============================================
ALTER TABLE standards    ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id) ON DELETE CASCADE;
ALTER TABLE kpis         ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id) ON DELETE CASCADE;
ALTER TABLE kpi_values   ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id) ON DELETE CASCADE;
ALTER TABLE documents    ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id) ON DELETE CASCADE;
ALTER TABLE verification_tasks ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id) ON DELETE CASCADE;
ALTER TABLE performance_reports ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id) ON DELETE CASCADE;
ALTER TABLE users        ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id) ON DELETE SET NULL;

-- فهارس city_id
CREATE INDEX IF NOT EXISTS standards_city_id_idx       ON standards(city_id);
CREATE INDEX IF NOT EXISTS kpis_city_id_idx            ON kpis(city_id);
CREATE INDEX IF NOT EXISTS kpi_values_city_id_idx      ON kpi_values(city_id);
CREATE INDEX IF NOT EXISTS documents_city_id_idx       ON documents(city_id);
CREATE INDEX IF NOT EXISTS verification_tasks_city_id_idx ON verification_tasks(city_id);
CREATE INDEX IF NOT EXISTS performance_reports_city_id_idx ON performance_reports(city_id);
CREATE INDEX IF NOT EXISTS users_city_id_idx           ON users(city_id);

-- =============================================
-- 3) إضافة دور ministry_admin للمستخدمين
-- =============================================
-- تحديث تعليق على عمود role - role يقبل الآن 'ministry_admin' أيضًا
-- القيم المسموح بها: user | admin | ministry_admin

-- =============================================
-- 4) دالة للتحقق من صلاحية ministry_admin
-- =============================================
CREATE OR REPLACE FUNCTION is_ministry_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'ministry_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5) سياسات الأمان (RLS) لجدول المدن
-- =============================================
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- وزارة الصحة تشوف كل المدن وتعدّل
CREATE POLICY "ministry_admin_full_access" ON cities
  FOR ALL
  USING (is_ministry_admin());

-- المستخدمون العاديون يشوفون مدينتهم فقط
CREATE POLICY "city_users_read_own" ON cities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.city_id = cities.id
    )
  );

-- =============================================
-- 6) تحديث سياسات باقي الجداول للعزل بـ city_id
-- =============================================

-- Standards: وزارة الصحة تشوف كل شيء، المدينة تشوف مدينتها فقط
DROP POLICY IF EXISTS "Public read access" ON standards;
DROP POLICY IF EXISTS "Admin write access" ON standards;

CREATE POLICY "ministry_read_all_standards" ON standards
  FOR SELECT USING (is_ministry_admin());

CREATE POLICY "city_read_own_standards" ON standards
  FOR SELECT USING (
    city_id IN (
      SELECT city_id FROM users WHERE id = auth.uid()
    )
    OR city_id IS NULL  -- للتوافق مع البيانات القديمة
  );

CREATE POLICY "city_admin_write_standards" ON standards
  FOR ALL USING (
    auth.role() = 'authenticated' AND (
      is_ministry_admin()
      OR (
        city_id IN (SELECT city_id FROM users WHERE id = auth.uid())
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','governor'))
      )
    )
  );

-- Documents
DROP POLICY IF EXISTS "Public read access" ON documents;
DROP POLICY IF EXISTS "Admin write access" ON documents;

CREATE POLICY "ministry_read_all_documents" ON documents
  FOR SELECT USING (is_ministry_admin());

CREATE POLICY "city_read_own_documents" ON documents
  FOR SELECT USING (
    city_id IN (SELECT city_id FROM users WHERE id = auth.uid())
    OR city_id IS NULL
  );

CREATE POLICY "city_write_documents" ON documents
  FOR ALL USING (
    auth.role() = 'authenticated' AND (
      is_ministry_admin()
      OR city_id IN (SELECT city_id FROM users WHERE id = auth.uid())
    )
  );
