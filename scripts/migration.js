/**
 * سكريبت ترحيل البيانات من Base44 إلى Supabase
 * سكريبت آمن ومتكامل لنقل جميع البيانات
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// ===== إعدادات الاتصال =====

const SUPABASE_CONFIG = {
  url: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  serviceKey: process.env.SUPABASE_SERVICE_KEY || 'your-service-key'
};

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.serviceKey);

// ===== دوال الترحيل =====

class MigrationManager {
  constructor() {
    this.migrationLog = [];
    this.errors = [];
    this.stats = {
      axes: { migrated: 0, failed: 0 },
      standards: { migrated: 0, failed: 0 },
      users: { migrated: 0, failed: 0 },
      documents: { migrated: 0, failed: 0 }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, type };
    this.migrationLog.push(logEntry);
    
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
    
    // حفظ السجل في ملف
    this.saveLog();
  }

  logError(error, context) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      context
    };
    this.errors.push(errorEntry);
    this.log(`ERROR: ${error.message} in ${context}`, 'error');
  }

  async saveLog() {
    try {
      const logData = {
        timestamp: new Date().toISOString(),
        log: this.migrationLog,
        errors: this.errors,
        stats: this.stats
      };
      
      await fs.promises.writeFile(
        path.join(process.cwd(), 'migration-log.json'),
        JSON.stringify(logData, null, 2)
      );
    } catch (error) {
      console.error('Failed to save log:', error.message);
    }
  }

  // ===== استخراج البيانات من Base44 =====

  async extractFromBase44() {
    this.log('Starting data extraction from Base44...');
    
    try {
      // استخراج المحاور
      const axes = await this.extractAxes();
      
      // استخراج المعايير
      const standards = await this.extractStandards();
      
      // استخراج المستخدمين
      const users = await this.extractUsers();
      
      // استخراج المستندات (إذا وجدت)
      const documents = await this.extractDocuments();
      
      this.log('Data extraction completed successfully');
      
      return {
        axes,
        standards,
        users,
        documents,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      this.logError(error, 'extractFromBase44');
      throw error;
    }
  }

  async extractAxes() {
    this.log('Extracting axes...');
    
    try {
      // محاكاة استخراج البيانات من Base44
      // في الواقع، ستقوم باستدعاء API الخاص بـ Base44 هنا
      const axes = [
        {
          name: 'تنظيم المجتمع وتعبئته من أجل الصحة والتنمية',
          description: '(أ) تنظيم المجتمع وتعبئته من أجل الصحة والتنمية (معايير 1–7)',
          order: 1,
          short_name: 'تنظيم المجتمع',
          icon: 'users',
          color: '#3B82F6'
        },
        {
          name: 'التعاون، والشراكة والدعوى بين القطاعات',
          description: '(ب) التعاون، والشراكة والدعوى بين القطاعات (معايير 8–14)',
          order: 2,
          short_name: 'التعاون والشراكة',
          icon: 'handshake',
          color: '#10B981'
        },
        // ... باقي المحاور
      ];
      
      this.log(`Extracted ${axes.length} axes`);
      return axes;
    } catch (error) {
      this.logError(error, 'extractAxes');
      return [];
    }
  }

  async extractStandards() {
    this.log('Extracting standards...');
    
    try {
      // محاكاة استخراج المعايير
      const standards = [
        {
          code: 'م1-1',
          title: 'اختيرت ودربت المجموعات المكونة من الممثلين والمتطوعين...',
          description: 'اختيرت ودربت المجموعات المكونة من الممثلين والمتطوعين...',
          axis_order: 1,
          global_num: 1,
          status: 'not_started',
          completion_percentage: 0
        },
        // ... باقي المعايير
      ];
      
      this.log(`Extracted ${standards.length} standards`);
      return standards;
    } catch (error) {
      this.logError(error, 'extractStandards');
      return [];
    }
  }

  async extractUsers() {
    this.log('Extracting users...');
    
    try {
      // محاكاة استخراج المستخدمين
      const users = [
        {
          email: 'admin@healthy-city.com',
          full_name: 'مدير النظام',
          role: 'admin',
          permissions: { admin: true }
        },
        // ... باقي المستخدمين
      ];
      
      this.log(`Extracted ${users.length} users`);
      return users;
    } catch (error) {
      this.logError(error, 'extractUsers');
      return [];
    }
  }

  async extractDocuments() {
    this.log('Extracting documents...');
    
    try {
      // محاكاة استخراج المستندات
      const documents = [];
      
      this.log(`Extracted ${documents.length} documents`);
      return documents;
    } catch (error) {
      this.logError(error, 'extractDocuments');
      return [];
    }
  }

  // ===== استيراد البيانات إلى Supabase =====

  async importToSupabase(data) {
    this.log('Starting data import to Supabase...');
    
    try {
      // مسح البيانات القديمة (اختياري)
      await this.clearExistingData();
      
      // استيراد المحاور
      await this.importAxes(data.axes);
      
      // استيراد المعايير
      await this.importStandards(data.standards);
      
      // استيراد المستخدمين
      await this.importUsers(data.users);
      
      // استيراد المستندات
      await this.importDocuments(data.documents);
      
      this.log('Data import completed successfully');
      this.printStats();
      
      return true;
    } catch (error) {
      this.logError(error, 'importToSupabase');
      throw error;
    }
  }

  async clearExistingData() {
    this.log('Clearing existing data...');
    
    try {
      // مسح الجداول بالترتيب العكسي لتجنب مشاكل الـ foreign keys
      await supabase.from('performance_reports').delete().neq('id', '');
      await supabase.from('verification_tasks').delete().neq('id', '');
      await supabase.from('documents').delete().neq('id', '');
      await supabase.from('kpi_values').delete().neq('id', '');
      await supabase.from('kpis').delete().neq('id', '');
      await supabase.from('standards').delete().neq('id', '');
      await supabase.from('axes').delete().neq('id', '');
      await supabase.from('users').delete().neq('id', '');
      
      this.log('Existing data cleared successfully');
    } catch (error) {
      this.logError(error, 'clearExistingData');
    }
  }

  async importAxes(axes) {
    this.log(`Importing ${axes.length} axes...`);
    
    for (const axis of axes) {
      try {
        const { data, error } = await supabase
          .from('axes')
          .insert(axis)
          .select()
          .single();
        
        if (error) throw error;
        
        this.stats.axes.migrated++;
        this.log(`Imported axis: ${axis.name}`);
      } catch (error) {
        this.stats.axes.failed++;
        this.logError(error, `importAxis: ${axis.name}`);
      }
    }
  }

  async importStandards(standards) {
    this.log(`Importing ${standards.length} standards...`);
    
    // الحصول على خريطة المحاور
    const { data: axes } = await supabase
      .from('axes')
      .select('id, order');
    
    const axisMap = {};
    axes.forEach(axis => {
      axisMap[axis.order] = axis.id;
    });
    
    for (const standard of standards) {
      try {
        const axisId = axisMap[standard.axis_order];
        if (!axisId) {
          throw new Error(`Axis not found for order: ${standard.axis_order}`);
        }
        
        const standardData = {
          ...standard,
          axis_id: axisId,
          category: 'معيار صحة مجتمعية',
          priority: 'متوسطة',
          estimated_implementation_time: '3-6 شهر',
          required_resources: {
            human: ['منسق البرنامج'],
            financial: ['ميزانية البرنامج'],
            physical: ['مركز مجتمعي'],
            technical: ['خبير فني']
          },
          success_indicators: ['تحقيق الأهداف المحددة'],
          challenges: ['نقص الموارد', 'مقاومة التغيير'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
          .from('standards')
          .insert(standardData)
          .select()
          .single();
        
        if (error) throw error;
        
        // إنشاء مؤشرات الأداء الافتراضية
        await this.createDefaultKpis(data.id);
        
        this.stats.standards.migrated++;
        this.log(`Imported standard: ${standard.code}`);
      } catch (error) {
        this.stats.standards.failed++;
        this.logError(error, `importStandard: ${standard.code}`);
      }
    }
  }

  async createDefaultKpis(standardId) {
    const defaultKpis = [
      {
        name: 'مؤشر التحقق',
        target: 'أدلة متوفرة (+)',
        unit: 'تحقق',
        description: 'توفر الأدلة الكاملة لتحقيق المعيار',
        category: 'نوعي',
        weight: 1.0,
        verification_method: 'مراجعة الوثائق'
      }
    ];
    
    for (const kpi of defaultKpis) {
      try {
        await supabase
          .from('kpis')
          .insert({
            ...kpi,
            standard_id: standardId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      } catch (error) {
        this.logError(error, `createDefaultKpi for standard ${standardId}`);
      }
    }
  }

  async importUsers(users) {
    this.log(`Importing ${users.length} users...`);
    
    for (const user of users) {
      try {
        // إنشاء مستخدم في Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          user_metadata: {
            full_name: user.full_name,
            role: user.role
          }
        });
        
        if (authError) throw authError;
        
        // إنشاء سجل المستخدم
        const { data, error } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            permissions: user.permissions || {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        
        this.stats.users.migrated++;
        this.log(`Imported user: ${user.email}`);
      } catch (error) {
        this.stats.users.failed++;
        this.logError(error, `importUser: ${user.email}`);
      }
    }
  }

  async importDocuments(documents) {
    this.log(`Importing ${documents.length} documents...`);
    
    for (const document of documents) {
      try {
        const { data, error } = await supabase
          .from('documents')
          .insert({
            ...document,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        
        this.stats.documents.migrated++;
        this.log(`Imported document: ${document.name}`);
      } catch (error) {
        this.stats.documents.failed++;
        this.logError(error, `importDocument: ${document.name}`);
      }
    }
  }

  // ===== التحقق من صحة البيانات =====

  async validateMigration() {
    this.log('Validating migration...');
    
    try {
      const validationResults = {
        axes: await this.validateAxes(),
        standards: await this.validateStandards(),
        users: await this.validateUsers(),
        documents: await this.validateDocuments()
      };
      
      const allValid = Object.values(validationResults).every(result => result.valid);
      
      if (allValid) {
        this.log('Migration validation completed successfully');
      } else {
        this.log('Migration validation found issues', 'warning');
      }
      
      return validationResults;
    } catch (error) {
      this.logError(error, 'validateMigration');
      throw error;
    }
  }

  async validateAxes() {
    const { data, error } = await supabase
      .from('axes')
      .select('count')
      .single();
    
    if (error) throw error;
    
    const expected = 9; // عدد المحاور المتوقع
    const actual = data.count || 0;
    
    return {
      valid: actual === expected,
      expected,
      actual,
      message: `Axes: ${actual}/${expected} migrated`
    };
  }

  async validateStandards() {
    const { data, error } = await supabase
      .from('standards')
      .select('count')
      .single();
    
    if (error) throw error;
    
    const expected = 80; // عدد المعايير المتوقع
    const actual = data.count || 0;
    
    return {
      valid: actual === expected,
      expected,
      actual,
      message: `Standards: ${actual}/${expected} migrated`
    };
  }

  async validateUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .single();
    
    if (error) throw error;
    
    const actual = data.count || 0;
    
    return {
      valid: actual > 0,
      expected: '1+',
      actual,
      message: `Users: ${actual} migrated`
    };
  }

  async validateDocuments() {
    const { data, error } = await supabase
      .from('documents')
      .select('count')
      .single();
    
    if (error) throw error;
    
    const actual = data.count || 0;
    
    return {
      valid: true, // المستندات اختيارية
      expected: '0+',
      actual,
      message: `Documents: ${actual} migrated`
    };
  }

  // ===== دوال مساعدة =====

  printStats() {
    console.log('\n=== Migration Statistics ===');
    
    Object.entries(this.stats).forEach(([entity, stats]) => {
      const total = stats.migrated + stats.failed;
      const successRate = total > 0 ? (stats.migrated / total * 100).toFixed(1) : 0;
      
      console.log(`${entity}:`);
      console.log(`  Migrated: ${stats.migrated}`);
      console.log(`  Failed: ${stats.failed}`);
      console.log(`  Success Rate: ${successRate}%`);
      console.log('');
    });
    
    console.log(`Total Errors: ${this.errors.length}`);
    console.log(`Total Log Entries: ${this.migrationLog.length}`);
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      errors: this.errors,
      log: this.migrationLog,
      validation: await this.validateMigration()
    };
    
    const reportPath = path.join(process.cwd(), 'migration-report.json');
    await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`Migration report generated: ${reportPath}`);
    return reportPath;
  }
}

// ===== التنفيذ الرئيسي =====

async function runMigration() {
  const migration = new MigrationManager();
  
  try {
    migration.log('Starting Base44 to Supabase migration...');
    
    // 1. استخراج البيانات من Base44
    const extractedData = await migration.extractFromBase44();
    
    // حفظ البيانات المستخرجة
    const extractedPath = path.join(process.cwd(), 'extracted-data.json');
    await fs.promises.writeFile(extractedPath, JSON.stringify(extractedData, null, 2));
    migration.log(`Extracted data saved: ${extractedPath}`);
    
    // 2. استيراد البيانات إلى Supabase
    await migration.importToSupabase(extractedData);
    
    // 3. التحقق من صحة الترحيل
    await migration.validateMigration();
    
    // 4. إنشاء التقرير النهائي
    await migration.generateReport();
    
    migration.log('Migration completed successfully!');
    
  } catch (error) {
    migration.logError(error, 'runMigration');
    await migration.generateReport();
    process.exit(1);
  }
}

// ===== التصدير =====

export { MigrationManager, runMigration };

// تشغيل الترحيل إذا تم استدعاء الملف مباشرة
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}
