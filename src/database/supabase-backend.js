/**
 * Backend محسّن لـ Supabase
 * بديل متكامل لـ Base44 مع دعم كامل للمنصات المتعددة
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './supabase-setup.js';

// ===== إعداد Supabase Client =====

class SupabaseBackend {
  constructor() {
    this.supabase = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey,
      {
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
      }
    );
    
    this.adminClient = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.serviceKey,
      {
        auth: {
          persistSession: false
        }
      }
    );
  }

  // ===== المصادقة والمستخدمين =====

  async signUp(email, password, metadata = {}) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata.fullName || '',
            role: metadata.role || 'user',
            ...metadata
          }
        }
      });

      if (error) throw error;

      // إنشاء سجل المستخدم
      if (data.user) {
        await this.supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email,
          full_name: metadata.fullName || '',
          role: metadata.role || 'user',
          permissions: metadata.permissions || {}
        });
      }

      return { success: true, data };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: error.message };
    }
  }

  async signIn(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Signin error:', error);
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Signout error:', error);
      return { success: false, error: error.message };
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return null;

      const { data: userData } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      return { ...user, ...userData };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // ===== المحاور (Axes) =====

  async getAxes(orderBy = 'order') {
    try {
      const { data, error } = await this.supabase
        .from('axes')
        .select('*')
        .order(orderBy);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get axes error:', error);
      return { success: false, error: error.message };
    }
  }

  async createAxis(axisData) {
    try {
      const { data, error } = await this.supabase
        .from('axes')
        .insert(axisData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Create axis error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateAxis(id, updates) {
    try {
      const { data, error } = await this.supabase
        .from('axes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Update axis error:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteAxis(id) {
    try {
      const { error } = await this.supabase
        .from('axes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Delete axis error:', error);
      return { success: false, error: error.message };
    }
  }

  // ===== المعايير (Standards) =====

  async getStandards(filters = {}) {
    try {
      let query = this.supabase.from('standards').select(`
        *,
        axes (
          id,
          name,
          short_name,
          color,
          icon
        ),
        kpis (
          id,
          name,
          target,
          unit,
          category,
          weight
        )
      `);

      // تطبيق الفلاتر
      if (filters.axis_id) {
        query = query.eq('axis_id', filters.axis_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // الترتيب
      const orderBy = filters.orderBy || 'axis_order,global_num';
      query = query.order(orderBy);

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get standards error:', error);
      return { success: false, error: error.message };
    }
  }

  async createStandard(standardData) {
    try {
      const { data, error } = await this.supabase
        .from('standards')
        .insert(standardData)
        .select(`
          *,
          axes (
            id,
            name,
            short_name,
            color,
            icon
          )
        `)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Create standard error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateStandard(id, updates) {
    try {
      const { data, error } = await this.supabase
        .from('standards')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(`
          *,
          axes (
            id,
            name,
            short_name,
            color,
            icon
          )
        `)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Update standard error:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteStandard(id) {
    try {
      const { error } = await this.supabase
        .from('standards')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Delete standard error:', error);
      return { success: false, error: error.message };
    }
  }

  // ===== مؤشرات الأداء (KPIs) =====

  async getKpis(standardId) {
    try {
      const { data, error } = await this.supabase
        .from('kpis')
        .select('*')
        .eq('standard_id', standardId)
        .order('name');

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get kpis error:', error);
      return { success: false, error: error.message };
    }
  }

  async createKpi(kpiData) {
    try {
      const { data, error } = await this.supabase
        .from('kpis')
        .insert(kpiData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Create kpi error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateKpi(id, updates) {
    try {
      const { data, error } = await this.supabase
        .from('kpis')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Update kpi error:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteKpi(id) {
    try {
      const { error } = await this.supabase
        .from('kpis')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Delete kpi error:', error);
      return { success: false, error: error.message };
    }
  }

  // ===== قيم المؤشرات =====

  async getKpiValues(kpiId, filters = {}) {
    try {
      let query = this.supabase
        .from('kpi_values')
        .select('*')
        .eq('kpi_id', kpiId);

      if (filters.startDate) {
        query = query.gte('recorded_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('recorded_at', filters.endDate);
      }

      query = query.order('recorded_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get kpi values error:', error);
      return { success: false, error: error.message };
    }
  }

  async createKpiValue(valueData) {
    try {
      const { data, error } = await this.supabase
        .from('kpi_values')
        .insert(valueData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Create kpi value error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateKpiValue(id, updates) {
    try {
      const { data, error } = await this.supabase
        .from('kpi_values')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Update kpi value error:', error);
      return { success: false, error: error.message };
    }
  }

  // ===== المستندات =====

  async getDocuments(standardId) {
    try {
      const { data, error } = await this.supabase
        .from('documents')
        .select('*')
        .eq('standard_id', standardId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get documents error:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadDocument(file, documentData) {
    try {
      // رفع الملف إلى التخزين
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // الحصول على URL العام
      const { data: { publicUrl } } = this.supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // إنشاء سجل المستند
      const documentRecord = {
        ...documentData,
        file_url: publicUrl,
        file_path: fileName,
        file_size: file.size,
        file_type: file.type,
        status: 'uploaded',
        uploaded_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('documents')
        .insert(documentRecord)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Upload document error:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteDocument(id) {
    try {
      // الحصول على معلومات المستند
      const { data: document } = await this.supabase
        .from('documents')
        .select('file_path')
        .eq('id', id)
        .single();

      // حذف الملف من التخزين
      if (document?.file_path) {
        await this.supabase.storage
          .from('documents')
          .remove([document.file_path]);
      }

      // حذف سجل المستند
      const { error } = await this.supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Delete document error:', error);
      return { success: false, error: error.message };
    }
  }

  // ===== تقارير الأداء =====

  async getPerformanceReports(filters = {}) {
    try {
      let query = this.supabase
        .from('performance_reports')
        .select('*');

      if (filters.standard_id) {
        query = query.eq('standard_id', filters.standard_id);
      }
      if (filters.axis_order) {
        query = query.eq('axis_order', filters.axis_order);
      }
      if (filters.report_type) {
        query = query.eq('report_type', filters.report_type);
      }

      query = query.order('generated_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get performance reports error:', error);
      return { success: false, error: error.message };
    }
  }

  async createPerformanceReport(reportData) {
    try {
      const { data, error } = await this.supabase
        .from('performance_reports')
        .insert({
          ...reportData,
          generated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Create performance report error:', error);
      return { success: false, error: error.message };
    }
  }

  // ===== Real-time Subscriptions =====

  subscribeToTable(table, callback) {
    return this.supabase
      .channel(`table-${table}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: table },
        callback
      )
      .subscribe();
  }

  unsubscribeFromTable(subscription) {
    this.supabase.removeChannel(subscription);
  }

  // ===== دوال مساعدة =====

  async calculateStandardScore(standardId) {
    try {
      const { data, error } = await this.supabase
        .rpc('calculate_standard_score', { standard_uuid: standardId });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Calculate standard score error:', error);
      return { success: false, error: error.message };
    }
  }

  async calculateAxisScore(axisOrder) {
    try {
      const { data, error } = await this.supabase
        .rpc('calculate_axis_score', { axis_order_num: axisOrder });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Calculate axis score error:', error);
      return { success: false, error: error.message };
    }
  }

  // ===== تصدير البيانات =====

  async exportData(table, format = 'json') {
    try {
      const { data, error } = await this.supabase
        .from(table)
        .select('*');

      if (error) throw error;

      if (format === 'csv') {
        // تحويل البيانات إلى CSV
        const csv = this.convertToCSV(data);
        return { success: true, data: csv, format: 'csv' };
      }

      return { success: true, data, format: 'json' };
    } catch (error) {
      console.error('Export data error:', error);
      return { success: false, error: error.message };
    }
  }

  convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  }
}

// ===== إنشاء Instance =====

const supabaseBackend = new SupabaseBackend();

export default supabaseBackend;
export { SupabaseBackend };
