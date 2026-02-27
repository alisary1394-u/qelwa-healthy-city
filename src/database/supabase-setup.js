/**
 * إعداد قاعدة بيانات Supabase للمدن الصحية
 * ملف الإعداد والتهيئة الكامل
 */

// ===== معلومات المشروع =====

const SUPABASE_CONFIG = {
  // معلومات المشروع (ستملأ بعد إنشاء المشروع)
  projectId: 'your-project-id',
  url: 'https://your-project-id.supabase.co',
  anonKey: 'your-anon-key',
  serviceKey: 'your-service-key',
  
  // إعدادات قاعدة البيانات
  database: {
    name: 'healthy_city_db',
    version: '15',
    region: 'us-east-1' // الأقرب لجمهورية مصر العربية
  }
};

// ===== هيكل قاعدة البيانات =====

/**
 * إنشاء جداول قاعدة البيانات
 */
const DATABASE_SCHEMA = {
  // جدول المحاور
  axes: `
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
  `,
  
  // جدول المعايير
  standards: `
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
  `,
  
  // جدول مؤشرات الأداء
  kpis: `
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
  `,
  
  // جدول قيم المؤشرات
  kpi_values: `
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
  `,
  
  // جدول المستخدمين
  users: `
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
  `,
  
  // جدول المستندات
  documents: `
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
  `,
  
  // جدول مهام التحقق
  verification_tasks: `
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
  `,
  
  // جدول تقارير الأداء
  performance_reports: `
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
  `
};

// ===== سياسات الأمان (RLS) =====

const SECURITY_POLICIES = {
  // سياسات جدول المحاور
  axes_policies: `
    -- الجميع يمكنهم قراءة المحاور
    CREATE POLICY "Public read access" ON axes FOR SELECT USING (true);
    
    -- فقط المسؤولون يمكنهم تعديل المحاور
    CREATE POLICY "Admin write access" ON axes FOR ALL USING (
      auth.role() = 'authenticated' AND 
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() AND users.role = 'admin'
      )
    );
  `,
  
  // سياسات جدول المعايير
  standards_policies: `
    -- الجميع يمكنهم قراءة المعايير
    CREATE POLICY "Public read access" ON standards FOR SELECT USING (true);
    
    -- المسؤولون يمكنهم تعديل المعايير
    CREATE POLICY "Admin write access" ON standards FOR ALL USING (
      auth.role() = 'authenticated' AND 
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() AND users.role = 'admin'
      )
    );
  `,
  
  // سياسات جدول المستخدمين
  users_policies: `
    -- المستخدمون يمكنهم قراءة بياناتهم فقط
    CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
    
    -- المستخدمون يمكنهم تعديل بياناتهم فقط
    CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);
    
    -- الجميع يمكنهم إنشاء حساب
    CREATE POLICY "Users can create account" ON users FOR INSERT WITH CHECK (auth.uid() = id);
  `,
  
  // سياسات جدول المستندات
  documents_policies: `
    -- الجميع يمكنهم قراءة المستندات
    CREATE POLICY "Public read access" ON documents FOR SELECT USING (true);
    
    -- المسؤولون يمكنهم تعديل المستندات
    CREATE POLICY "Admin write access" ON documents FOR ALL USING (
      auth.role() = 'authenticated' AND 
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() AND users.role = 'admin'
      )
    );
  `
};

// ===== دوال قاعدة البيانات =====

const DATABASE_FUNCTIONS = {
  // دالة حساب نتيجة المعيار
  calculate_standard_score: `
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
  `,
  
  // دالة حساب نتيجة المحور
  calculate_axis_score: `
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
  `,
  
  // دالة تحديث وقت التعديل
  update_updated_at_column: `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `
};

// ===== التشغيلات التلقائية (Triggers) =====

const DATABASE_TRIGGERS = {
  // تشغيل تحديث updated_at
  update_timestamps: `
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
  `
};

// ===== بيانات أولية =====

const SEED_DATA = {
  // بيانات المحاور
  axes: `
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
  `
};

export {
  SUPABASE_CONFIG,
  DATABASE_SCHEMA,
  SECURITY_POLICIES,
  DATABASE_FUNCTIONS,
  DATABASE_TRIGGERS,
  SEED_DATA
};
