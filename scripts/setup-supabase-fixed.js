/**
 * تنفيذ فوري لخطة الترحيل إلى Supabase
 * خطوات التنفيذ العملية
 */

import fs from 'fs';
import path from 'path';

console.log('🚀 بدء تنفيذ خطة الترحيل إلى Supabase...\n');

// ===== الخطوة 1: إنشاء تعليمات الإعداد =====

const setupInstructions = `
📋 **خطوات إعداد Supabase:**

1. **إنشاء حساب Supabase:**
   - افتح https://supabase.com
   - انقر "Start your project"
   - سجل باستخدام GitHub أو Google
   - اختر "Organization" (يمكنك اختيار Personal)

2. **إنشاء مشروع جديد:**
   - انقر "New Project"
   - أدخل اسم المشروع: healthy-city
   - أدخل كلمة مرور قاعدة البيانات: احفظها آمناً
   - اختر المنطقة: US East (أقرب للشرق الأوسط)
   - انقر "Create new project"

3. **الحصول على مفاتيح API:**
   - اذهب إلى Settings > API
   - نسخ "Project URL"
   - نسخ "anon public key"
   - نسخ "service_role key" (للاستخدام الإداري)

4. **تنفيذ قاعدة البيانات:**
   - اذهب إلى SQL Editor
   - انقر "New query"
   - انسخ والصق محتوى ملف database-schema.sql
   - انقر "Run"

5. **إعدادات الأمان:**
   - اذهب إلى Authentication > Settings
   - فعل "Enable email confirmations"
   - أضدناً موقعك إلى "Site URL"

💾 **احفظ هذه المعلومات:**
- Project URL: https://your-project.supabase.co
- Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
- Service Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
- Database Password: your-secure-password
`;

fs.writeFileSync('supabase-setup-instructions.md', setupInstructions);
console.log('✅ تم إنشاء تعليمات الإعداد: supabase-setup-instructions.md');

// ===== الخطوة 2: إنشاء ملف SQL لقاعدة البيانات =====

const databaseSQL = `
-- ===== إنشاء جداول قاعدة بيانات المدن الصحية =====

-- جدول المحاور
CREATE TABLE axes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  order INTEGER NOT NULL UNIQUE,
  short_name VARCHAR(100),
  icon VARCHAR(50),
  color VARCHAR(7),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX axes_order_idx ON axes(order);
CREATE INDEX axes_name_idx ON axes(name);

-- جدول المعايير
CREATE TABLE standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  axis_id UUID REFERENCES axes(id) ON DELETE CASCADE,
  axis_order INTEGER NOT NULL,
  global_num INTEGER NOT NULL,
  category VARCHAR(100) DEFAULT 'معيار صحة مجتمعية',
  priority VARCHAR(20) DEFAULT 'متوسطة',
  estimated_implementation_time VARCHAR(50),
  required_resources JSONB,
  success_indicators TEXT[],
  challenges TEXT[],
  status VARCHAR(50) DEFAULT 'not_started',
  completion_percentage INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_to UUID,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX standards_code_idx ON standards(code);
CREATE INDEX standards_axis_id_idx ON standards(axis_id);
CREATE INDEX standards_status_idx ON standards(status);
CREATE INDEX standards_axis_order_idx ON standards(axis_order, global_num);

-- جدول مؤشرات الأداء
CREATE TABLE kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID REFERENCES standards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target VARCHAR(100) NOT NULL,
  unit VARCHAR(50),
  description TEXT,
  category VARCHAR(50),
  weight DECIMAL(3,2) DEFAULT 1.0,
  verification_method TEXT,
  data_source VARCHAR(100),
  calculation TEXT,
  scale TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX kpis_standard_id_idx ON kpis(standard_id);
CREATE INDEX kpis_category_idx ON kpis(category);

-- جدول قيم المؤشرات
CREATE TABLE kpi_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID REFERENCES kpis(id) ON DELETE CASCADE,
  value VARCHAR(255),
  numeric_value DECIMAL(10,2),
  score DECIMAL(5,2),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX kpi_values_kpi_id_idx ON kpi_values(kpi_id);
CREATE INDEX kpi_values_recorded_at_idx ON kpi_values(recorded_at);

-- جدول المستخدمين
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'user',
  permissions JSONB,
  last_sign_in_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_role_idx ON users(role);

-- جدول المستندات
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID REFERENCES standards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  description TEXT,
  file_url TEXT,
  file_path TEXT,
  file_size BIGINT,
  file_type VARCHAR(50),
  frequency VARCHAR(50),
  responsible VARCHAR(255),
  format VARCHAR(50),
  retention VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX documents_standard_id_idx ON documents(standard_id);
CREATE INDEX documents_status_idx ON documents(status);
CREATE INDEX documents_type_idx ON documents(type);

-- جدول مهام التحقق
CREATE TABLE verification_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID REFERENCES standards(id) ON DELETE CASCADE,
  method VARCHAR(100) NOT NULL,
  description TEXT,
  frequency VARCHAR(50),
  responsible VARCHAR(255),
  sample_size VARCHAR(50),
  tools TEXT[],
  status VARCHAR(50) DEFAULT 'pending',
  last_completed TIMESTAMP WITH TIME ZONE,
  next_due TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX verification_tasks_standard_id_idx ON verification_tasks(standard_id);
CREATE INDEX verification_tasks_status_idx ON verification_tasks(status);
CREATE INDEX verification_tasks_next_due_idx ON verification_tasks(next_due);

-- جدول تقارير الأداء
CREATE TABLE performance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID REFERENCES standards(id) ON DELETE CASCADE,
  axis_order INTEGER,
  report_type VARCHAR(50),
  overall_score DECIMAL(5,2),
  status VARCHAR(50),
  kpi_details JSONB,
  recommendations TEXT[],
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX performance_reports_standard_id_idx ON performance_reports(standard_id);
CREATE INDEX performance_reports_axis_order_idx ON performance_reports(axis_order);
CREATE INDEX performance_reports_generated_at_idx ON performance_reports(generated_at);

-- ===== سياسات الأمان (RLS) =====

-- تفعيل RLS
ALTER TABLE axes ENABLE ROW LEVEL SECURITY;
ALTER TABLE standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reports ENABLE ROW LEVEL SECURITY;

-- سياسات جدول المحاور
CREATE POLICY "Public read access" ON axes FOR SELECT USING (true);
CREATE POLICY "Admin write access" ON axes FOR ALL USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- سياسات جدول المعايير
CREATE POLICY "Public read access" ON standards FOR SELECT USING (true);
CREATE POLICY "Admin write access" ON standards FOR ALL USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- سياسات جدول المستخدمين
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can create account" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- سياسات جدول المستندات
CREATE POLICY "Public read access" ON documents FOR SELECT USING (true);
CREATE POLICY "Admin write access" ON documents FOR ALL USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- ===== دوال قاعدة البيانات =====

-- دالة حساب نتيجة المعيار
CREATE OR REPLACE FUNCTION calculate_standard_score(standard_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_score DECIMAL(5,2) := 0;
  total_weight DECIMAL(5,2) := 0;
  kpi_record RECORD;
BEGIN
  FOR kpi_record IN 
    SELECT k.weight, COALESCE(kv.score, 0) as score
    FROM kpis k
    LEFT JOIN kpi_values kv ON k.id = kv.kpi_id
    WHERE k.standard_id = standard_uuid
  LOOP
    total_score := total_score + (kpi_record.score * kpi_record.weight);
    total_weight := total_weight + kpi_record.weight;
  END LOOP;
  
  RETURN CASE WHEN total_weight > 0 THEN total_score / total_weight ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- دالة حساب نتيجة المحور
CREATE OR REPLACE FUNCTION calculate_axis_score(axis_order_num INTEGER)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_score DECIMAL(5,2) := 0;
  total_standards INTEGER := 0;
  standard_record RECORD;
BEGIN
  FOR standard_record IN 
    SELECT id FROM standards 
    WHERE axis_order = axis_order_num
  LOOP
    total_score := total_score + calculate_standard_score(standard_record.id);
    total_standards := total_standards + 1;
  END LOOP;
  
  RETURN CASE WHEN total_standards > 0 THEN total_score / total_standards ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- دالة تحديث وقت التعديل
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===== تشغيلات تلقائية =====

-- تشغيل تحديث updated_at
CREATE TRIGGER update_axes_updated_at 
  BEFORE UPDATE ON axes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_standards_updated_at 
  BEFORE UPDATE ON standards 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kpis_updated_at 
  BEFORE UPDATE ON kpis 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON documents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verification_tasks_updated_at 
  BEFORE UPDATE ON verification_tasks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== بيانات أولية =====

-- إدخال المحاور
INSERT INTO axes (name, description, order, short_name, icon, color) VALUES
('تنظيم المجتمع وتعبئته من أجل الصحة والتنمية', '(أ) تنظيم المجتمع وتعبئته من أجل الصحة والتنمية (معايير 1–7)', 1, 'تنظيم المجتمع', 'users', '#3B82F6'),
('التعاون، والشراكة والدعوى بين القطاعات', '(ب) التعاون، والشراكة والدعوى بين القطاعات (معايير 8–14)', 2, 'التعاون والشراكة', 'handshake', '#10B981'),
('مركز المعلومات المجتمعي', '(ج) مركز المعلومات المجتمعي (معايير 15–19)', 3, 'مركز المعلومات', 'info', '#F59E0B'),
('المياه والصرف الصحي وسلامة الغذاء وتلوث الهواء', '(د) المياه والصرف الصحي وسلامة الغذاء وتلوث الهواء (معايير 20–30)', 4, 'البيئة', 'droplet', '#06B6D4'),
('التنمية الصحية', '(هـ) التنمية الصحية (معايير 31–56)', 5, 'التنمية الصحية', 'heart', '#EF4444'),
('الاستعداد للطوارئ والاستجابة لها', '(و) الاستعداد للطوارئ والاستجابة لها (معايير 57–62)', 6, 'الطوارئ', 'shield', '#8B5CF6'),
('التعليم ومحو الأمية', '(ز) التعليم ومحو الأمية (معايير 63–67)', 7, 'التعليم', 'book', '#EC4899'),
('تنمية المهارات، والتدريب المهني وبناء القدرات', '(ح) تنمية المهارات، والتدريب المهني وبناء القدرات (معايير 68–73)', 8, 'المهارات', 'tool', '#F97316'),
('أنشطة القروض الصغيرة', '(ط) أنشطة القروض الصغيرة (معايير 74–80)', 9, 'القروض الصغيرة', 'dollar-sign', '#84CC16');
`;

fs.writeFileSync('database-schema.sql', databaseSQL);
console.log('✅ تم إنشاء ملف قاعدة البيانات: database-schema.sql');

// ===== الخطوة 3: تحديث package.json =====

const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const currentPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // إضافة حزم Supabase
  currentPackageJson.dependencies = {
    ...currentPackageJson.dependencies,
    '@supabase/supabase-js': '^2.38.5',
    '@supabase/auth-helpers-react': '^0.4.0',
    '@supabase/auth-helpers-nextjs': '^0.8.0'
  };

  fs.writeFileSync(packageJsonPath, JSON.stringify(currentPackageJson, null, 2));
  console.log('✅ تم تحديث package.json بحزم Supabase');
} else {
  console.log('⚠️ لم يتم العثور على package.json');
}

// ===== الخطوة 4: إنشاء ملف الإعدادات =====

const envConfig = `
# ===== إعدادات Supabase =====
# احصل على هذه القيم من لوحة تحكم Supabase

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-key-here

# ===== إعدادات قاعدة البيانات =====
SUPABASE_DB_PASSWORD=your-database-password-here

# ===== إعدادات التطبيق =====
NEXT_PUBLIC_APP_URL=http://localhost:3000
`;

fs.writeFileSync('.env.local', envConfig);
console.log('✅ تم إنشاء ملف الإعدادات: .env.local');

// ===== الخطوة 5: إنشاء ملف Supabase client =====

const supabaseClient = `
/**
 * Supabase Client - الاتصال بقاعدة البيانات
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Client للاستخدام الإداري
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

export default supabase;
`;

// إنشاء مجلد lib إذا لم يكن موجوداً
const libDir = path.join(process.cwd(), 'src', 'lib');
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
}

fs.writeFileSync(path.join(libDir, 'supabase.js'), supabaseClient);
console.log('✅ تم إنشاء ملف Supabase client: src/lib/supabase.js');

console.log('\n🎉 **اكتملت الإعدادات الأساسية!**');
console.log('\n📋 **الخطوات التالية:**');
console.log('1. اتبع التعليمات في ملف supabase-setup-instructions.md');
console.log('2. انسخ محتوى database-schema.sql إلى Supabase SQL Editor');
console.log('3. املأ مفاتيح API في ملف .env.local');
console.log('4. قم بتثبيت الحزم: npm install');
console.log('5. شغل سكريبت الترحيل: node scripts/migration.js');

console.log('\n🚀 **بعد إكمال هذه الخطوات، سيكون التطبيق جاهز للاستخدام مع Supabase!**');
