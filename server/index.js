/**
 * سيرفر المدينة الصحية — Express + SQLite (قاعدة بيانات محلية)
 * يعمل محلياً وعند النشر على السيرفر
 */
console.log('[Qelwa] Process starting, PORT=', process.env.PORT);

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled rejection at', p, 'reason:', reason);
});

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createBackup, listBackups, restoreBackup, restoreTableFromBackup, startAutoBackup } from './backup.js';
// عدم استيراد db هنا — تحميله كسولاً عند أول طلب حتى لا يتعطل السيرفر إن فشل better-sqlite3 (مثلاً على Railway)

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080;

const sessions = new Map();
const verificationCodes = new Map(); // email -> { code, expires_at }
let backupSnapshotInFlight = false;
let lastMutationBackupAt = 0;

let dbModule = null;
async function getDb() {
  if (dbModule) return dbModule;
  try {
    dbModule = await import('./db.js');
    return dbModule;
  } catch (e) {
    console.error('فشل تحميل قاعدة البيانات:', e);
    throw e;
  }
}

function shouldSnapshotOnMutation() {
  const v = String(process.env.BACKUP_SNAPSHOT_ON_MUTATION ?? 'true').trim().toLowerCase();
  return !['0', 'false', 'no', 'off'].includes(v);
}

function isEnabled(value, defaultValue = false) {
  if (value == null || value === '') return defaultValue;
  const v = String(value).trim().toLowerCase();
  return !['0', 'false', 'no', 'off'].includes(v);
}

function isRailwayRuntime() {
  return !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_SERVICE_ID);
}

function isSeedApiEnabled() {
  // أمان افتراضي: على Railway يكون /api/seed مغلقاً حتى يتم تفعيله صراحةً.
  const defaultValue = !isRailwayRuntime();
  return isEnabled(process.env.SEED_API_ENABLED, defaultValue);
}

function enqueueMutationBackup(reason) {
  if (!shouldSnapshotOnMutation()) return;
  const now = Date.now();
  // تهدئة الكتابة: لا ننشئ نسخة كل ثانية أثناء عمليات متتالية.
  if (backupSnapshotInFlight || now - lastMutationBackupAt < 15000) return;
  backupSnapshotInFlight = true;
  createBackup({ reason })
    .then((result) => {
      lastMutationBackupAt = Date.now();
      console.log('[Backup] Mutation snapshot created:', result.path);
    })
    .catch((e) => {
      console.error('[Backup] Mutation snapshot failed:', e?.message || e);
    })
    .finally(() => {
      backupSnapshotInFlight = false;
    });
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// ============ حماية الموقع من النسخ والسحب ============

// قائمة User-Agents المحظورة (بوتات، أدوات سحب، ذكاء اصطناعي)
const BLOCKED_USER_AGENTS = [
  // أدوات سحب المواقع
  'httrack', 'sitesucker', 'webcopier', 'wget', 'curl', 'scrapy',
  'phantomjs', 'headlesschrome', 'puppeteer', 'playwright',
  'selenium', 'webdriver', 'crawl', 'spider', 'scrape',
  // بوتات SEO
  'mj12bot', 'ahrefsbot', 'semrushbot', 'dotbot', 'screaming frog',
  'dataforseobot', 'blexbot', 'megaindex', 'serpstatbot',
  // بوتات ذكاء اصطناعي
  'gptbot', 'chatgpt-user', 'google-extended', 'ccbot', 'anthropic-ai',
  'claude-web', 'bytespider', 'omgilibot', 'diffbot', 'perplexitybot',
  'youbot', 'amazonbot', 'cohere-ai', 'meta-externalagent',
  'applebot-extended', 'webzio-extended', 'img2dataset',
  // بوتات أرشفة
  'ia_archiver', 'archive.org_bot',
];

// Rate Limiting — حماية من الطلبات المفرطة
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // دقيقة واحدة
const RATE_LIMIT_MAX = 120; // أقصى عدد طلبات في الدقيقة
const API_RATE_LIMIT_MAX = 60; // أقصى عدد طلبات API في الدقيقة

function getRateLimitKey(req) {
  return req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
}

// تنظيف دوري لمنع تسرب الذاكرة
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitMap.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW * 2) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Middleware: كشف وحظر البوتات
app.use((req, res, next) => {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  
  // فحص User-Agent ضد القائمة المحظورة
  const isBlocked = BLOCKED_USER_AGENTS.some(bot => ua.includes(bot));
  if (isBlocked) {
    console.warn(`[Security] Blocked bot: ${ua.substring(0, 80)} — IP: ${getRateLimitKey(req)}`);
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // حظر الطلبات بدون User-Agent (غالباً بوتات)
  if (!req.headers['user-agent'] && req.path !== '/api/health') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
});

// Middleware: Rate Limiting
app.use((req, res, next) => {
  const key = getRateLimitKey(req);
  const now = Date.now();
  const isApi = req.path.startsWith('/api/');
  const maxReqs = isApi ? API_RATE_LIMIT_MAX : RATE_LIMIT_MAX;
  
  let entry = rateLimitMap.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    entry = { count: 1, windowStart: now };
    rateLimitMap.set(key, entry);
  } else {
    entry.count++;
  }
  
  // إضافة headers للـ rate limit
  res.setHeader('X-RateLimit-Limit', maxReqs);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxReqs - entry.count));
  
  if (entry.count > maxReqs) {
    console.warn(`[Security] Rate limit exceeded: ${key} — ${entry.count} requests`);
    return res.status(429).json({ 
      error: 'تجاوزت الحد المسموح من الطلبات. حاول لاحقاً.',
      retryAfter: Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW - now) / 1000)
    });
  }
  
  next();
});

// Honeypot trap لكشف البوتات
app.get('/api/trap', (req, res) => {
  const ip = getRateLimitKey(req);
  console.warn(`[Security] Bot trap triggered by IP: ${ip} — UA: ${(req.headers['user-agent'] || '').substring(0, 80)}`);
  // حظر هذا الـ IP مؤقتاً بزيادة عداده
  const entry = rateLimitMap.get(ip);
  if (entry) {
    entry.count = RATE_LIMIT_MAX + 100;
  } else {
    rateLimitMap.set(ip, { count: RATE_LIMIT_MAX + 100, windowStart: Date.now() });
  }
  res.status(403).json({ error: 'Access denied' });
});

// رؤوس أمان شاملة للتطبيق المنشور
app.use((req, res, next) => {
  // منع تضمين الموقع في iframe
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // منع MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // حماية XSS
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // منع الإحالة
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Content Security Policy — منع تحميل المحتوى من مصادر خارجية غير مصرح بها
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: blob: https:; " +
    "connect-src 'self' https://www.qeelwah.com https://*.railway.app; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );
  // Permissions Policy — تقييد الوصول للمتصفح APIs
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), clipboard-read=(self)');
  // منع التخزين المؤقت لصفحات HTML
  if (req.path.endsWith('.html') || (!req.path.includes('.') && !req.path.startsWith('/api'))) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
});

// نقطة فحص الصحة (للمنصات مثل Railway) — لا تحتاج قاعدة بيانات
app.get('/api/health', (req, res) => {
  res.status(200).json({ ok: true });
});

/** تهيئة التطبيق عند عدم وجود أي عضو: إنشاء المشرف وفريق التجربة. يعمل فقط عندما الفريق فارغ (آمن). */
app.get('/api/bootstrap', async (req, res) => {
  try {
    const db = await getDb();
    if (db.list('team_member').length > 0) {
      return res.status(200).json({
        ok: true,
        message: 'يوجد أعضاء بالفعل. لا حاجة للتهيئة.',
        teamCount: db.list('team_member').length,
      });
    }
    const { runSeed } = await import('./seed.js');
    await runSeed({ forceSampleTeam: true });
    const teamCount = db.list('team_member').length;
    enqueueMutationBackup('bootstrap');
    res.status(200).json({
      ok: true,
      message: `تم إنشاء ${teamCount} عضو. سجّل الدخول برقم الهوية 1 وكلمة المرور 123456`,
      teamCount,
    });
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND' || e.message?.includes('better-sqlite3')) {
      return res.status(503).json({ ok: false, error: 'قاعدة البيانات غير متاحة حالياً' });
    }
    res.status(500).json({ ok: false, error: e.message });
  }
});

// فحص إعدادات البريد (للتشخيص)
app.get('/api/email-check', async (req, res) => {
  try {
    const emailMod = await import('./email.js');
    const configured = emailMod.isEmailConfigured();
    if (!configured) {
      return res.json({
        configured: false,
        ok: false,
        method: null,
        error: 'أضف إما RESEND_API_KEY (موصى به على Railway) أو SMTP_HOST و SMTP_USER و SMTP_PASS في Variables.',
      });
    }
    const result = await emailMod.verifySmtpConnection();
    const method = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() ? 'resend' : 'smtp';
    res.json({ configured: true, ok: result.ok, method, error: result.error || null });
  } catch (e) {
    res.json({ configured: true, ok: false, method: 'smtp', error: e.message || String(e) });
  }
});

function entityToTable(name) {
  return name.replace(/([A-Z])/g, (_, c) => '_' + c.toLowerCase()).replace(/^_/, '');
}

function getAuthUser(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.token;
  return token ? sessions.get(token) : null;
}

// تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
  try {
    const db = await getDb();
    const { national_id, password } = req.body || {};
    const members = db.list('team_member');
    const member = members.find((m) => m.national_id === String(national_id));
    if (!member) {
      return res.status(401).json({ error: 'رقم الهوية غير مسجل' });
    }
    if (member.password !== password) {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    }
    const user = {
      email: member.email || (member.role === 'governor' ? 'admin@qeelwah.com' : `member-${member.national_id}@local`),
      full_name: member.full_name || 'المشرف',
      user_role: member.role === 'governor' ? 'admin' : 'user',
      national_id: member.national_id,
    };
    const token = 'tk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 12);
    sessions.set(token, user);
    res.json({ user, token });
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND' || e.message?.includes('better-sqlite3')) {
      return res.status(503).json({ error: 'قاعدة البيانات غير متاحة حالياً' });
    }
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'غير مسجل الدخول' });
  res.json(user);
});

// كيانات: list, get, create, update, delete
app.get('/api/entities/:name', async (req, res) => {
  try {
    const db = await getDb();
    const table = entityToTable(req.params.name);
    if (!db.TABLES.includes(table)) return res.status(404).json({ error: 'كيان غير معروف' });
    let list = db.list(table);
    const orderBy = req.query.orderBy;
    if (orderBy && typeof orderBy === 'string') {
      const [field, dir] = orderBy.startsWith('-') ? [orderBy.slice(1), -1] : [orderBy, 1];
      list = [...list].sort((a, b) => {
        const va = a[field];
        const vb = b[field];
        if (va == null && vb == null) return 0;
        if (va == null) return dir;
        if (vb == null) return -dir;
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        return dir * (cmp || 0);
      });
    }
    res.json(list);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND' || e.message?.includes('better-sqlite3')) {
      return res.status(503).json({ error: 'قاعدة البيانات غير متاحة حالياً' });
    }
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/entities/:name/:id', async (req, res) => {
  try {
    const db = await getDb();
    const table = entityToTable(req.params.name);
    if (!db.TABLES.includes(table)) return res.status(404).json({ error: 'كيان غير معروف' });
    const row = db.get(table, req.params.id);
    if (!row) return res.status(404).json({ error: 'غير موجود' });
    res.json(row);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND' || e.message?.includes('better-sqlite3')) {
      return res.status(503).json({ error: 'قاعدة البيانات غير متاحة حالياً' });
    }
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/entities/:name', async (req, res) => {
  try {
    const db = await getDb();
    const table = entityToTable(req.params.name);
    if (!db.TABLES.includes(table)) return res.status(404).json({ error: 'كيان غير معروف' });
    const data = req.body || {};
    const id = data.id || null;
    const body = { ...data };
    delete body.id;
    const record = db.create(table, id, body);
    if (table === 'team_member' || table === 'task') {
      enqueueMutationBackup(`entity_create:${table}`);
    }
    res.status(201).json(record);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND' || e.message?.includes('better-sqlite3')) {
      return res.status(503).json({ error: 'قاعدة البيانات غير متاحة حالياً' });
    }
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/entities/:name/:id', async (req, res) => {
  try {
    const db = await getDb();
    const table = entityToTable(req.params.name);
    if (!db.TABLES.includes(table)) return res.status(404).json({ error: 'كيان غير معروف' });
    let body = { ...(req.body || {}) };
    if (table === 'team_member') {
      const existing = db.get(table, req.params.id);
      if (!existing) return res.status(404).json({ error: 'غير موجود' });

      if (body.password === '' || body.password == null) {
        delete body.password;
      }

      // حماية بيانات التواصل: عند تحديث المنصب/الصلاحيات لا نحذف البريد أو الهاتف — لا نستبدل قيمة موجودة بقيمة فارغة.
      ['email', 'phone'].forEach((field) => {
        const incoming = body[field];
        const incomingBlank = incoming == null || (typeof incoming === 'string' && incoming.trim() === '');
        const existingValue = existing[field];
        const existingHasValue = existingValue != null && String(existingValue).trim() !== '';
        const incomingLocalSeed = field === 'email' && typeof incoming === 'string' && /@local$/i.test(incoming.trim());
        const existingIsReal = field === 'email' && existingHasValue && !/@local$/i.test(String(existingValue).trim());

        if (incomingLocalSeed && existingIsReal) {
          delete body[field];
          return;
        }
        if (incomingBlank && existingHasValue) {
          delete body[field];
        }
      });
    }
    const updated = db.update(table, req.params.id, body);
    if (!updated) return res.status(404).json({ error: 'غير موجود' });
    if (table === 'team_member' || table === 'task') {
      enqueueMutationBackup(`entity_update:${table}`);
    }
    res.json(updated);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND' || e.message?.includes('better-sqlite3')) {
      return res.status(503).json({ error: 'قاعدة البيانات غير متاحة حالياً' });
    }
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/entities/:name/:id', async (req, res) => {
  try {
    const db = await getDb();
    const table = entityToTable(req.params.name);
    if (!db.TABLES.includes(table)) return res.status(404).json({ error: 'كيان غير معروف' });
    db.remove(table, req.params.id);
    if (table === 'team_member' || table === 'task') {
      enqueueMutationBackup(`entity_delete:${table}`);
    }
    res.status(204).send();
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND' || e.message?.includes('better-sqlite3')) {
      return res.status(503).json({ error: 'قاعدة البيانات غير متاحة حالياً' });
    }
    res.status(500).json({ error: e.message });
  }
});

// بذر البيانات (للتجربة). ?clear=1 يمسح جداول البذرة فقط.
// لا نمسح team_member أبداً — حماية نهائية لبيانات الأعضاء (بريد، هاتف، إلخ) حتى مع الاستخدام الفعلي.
const TABLES_CLEAR_ON_RESEED = [
  'committee', 'axis', 'standard', 'initiative', 'initiative_kpi',
  'task', 'budget', 'budget_allocation', 'transaction'
];
const NEVER_CLEAR_TABLES = ['team_member'];

app.post('/api/seed', async (req, res) => {
  try {
    if (!isSeedApiEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Seed API is disabled. Set SEED_API_ENABLED=true temporarily only when you explicitly need reseed.',
      });
    }
    const db = await getDb();
    if (req.query.clear === '1') {
      TABLES_CLEAR_ON_RESEED.filter((t) => !NEVER_CLEAR_TABLES.includes(t)).forEach((t) => db.clearTable(t));
    }
    const { runSeed } = await import('./seed.js');
    // عند مسح البيانات وإعادة التحّميل نُعيد فريق التجربة والمهام أيضاً
    const forceSampleTeam = req.query.clear === '1';
    await runSeed({ forceSampleTeam });
    enqueueMutationBackup('seed');
    res.json({ ok: true, message: 'تم تنفيذ البذرة' });
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND' || e.message?.includes('better-sqlite3')) {
      return res.status(503).json({ error: 'قاعدة البيانات غير متاحة حالياً' });
    }
    res.status(500).json({ error: e.message });
  }
});

// إزالة المعايير المكررة من قاعدة البيانات — يُستدعى تلقائياً أو يدوياً
app.post('/api/deduplicate-standards', async (req, res) => {
  try {
    const db = await getDb();
    const standards = db.list('standard');
    const codeMap = {};
    for (const s of standards) {
      const code = (s.code || '').trim().replace(/\s+/g, '');
      if (!code) continue;
      if (!codeMap[code]) codeMap[code] = [];
      codeMap[code].push(s);
    }
    let removed = 0;
    for (const code of Object.keys(codeMap)) {
      const items = codeMap[code];
      if (items.length <= 1) continue;
      items.sort((a, b) => {
        const aReal = a.title && !a.title.startsWith('معيار ') ? 1 : 0;
        const bReal = b.title && !b.title.startsWith('معيار ') ? 1 : 0;
        if (bReal !== aReal) return bReal - aReal;
        return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
      });
      for (let i = 1; i < items.length; i++) {
        try { db.remove('standard', items[i].id); removed++; } catch {}
      }
    }
    const remaining = db.list('standard').length;
    res.json({ ok: true, removed, remaining, message: `تم إزالة ${removed} معيار مكرر. المتبقي: ${remaining}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// قائمة النسخ الاحتياطية (تُستدعى من صفحة الإعدادات للمشرف)
app.get('/api/backups', async (req, res) => {
  try {
    const files = listBackups();
    res.json(files.map((f) => ({ name: f.name, mtime: f.mtime, size: f.size })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// استعادة من أحدث نسخة احتياطية
app.post('/api/backups/restore-latest', async (req, res) => {
  try {
    const files = listBackups();
    if (files.length === 0) {
      return res.status(404).json({ ok: false, error: 'لا توجد نسخ احتياطية' });
    }
    const result = await restoreBackup(files[0].path);
    enqueueMutationBackup('after_restore');
    res.json({ ok: true, message: 'تمت استعادة البيانات من آخر نسخة', restoredCounts: result.restoredCounts });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// استعادة المهام فقط من أحدث نسخة احتياطية (بدون المساس ببقية الجداول)
app.post('/api/backups/restore-tasks-latest', async (req, res) => {
  try {
    const files = listBackups();
    if (files.length === 0) {
      return res.status(404).json({ ok: false, error: 'لا توجد نسخ احتياطية' });
    }
    const result = await restoreTableFromBackup(files[0].path, 'task');
    enqueueMutationBackup('after_restore_tasks');
    res.json({
      ok: true,
      message: 'تمت استعادة المهام من آخر نسخة احتياطية',
      restoredCount: result.restoredCount,
      currentCount: result.currentCount,
      from: files[0].name,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

function isValidEmail(str) {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

app.post('/api/functions/sendVerificationCode', async (req, res) => {
  let email = req.body?.email;
  if (!email) return res.status(400).json({ success: false, message: 'البريد مطلوب' });
  email = String(email).trim().toLowerCase();
  if (!isValidEmail(email)) {
    return res.json({ success: false, message: 'عنوان البريد غير صالح. يرجى تصحيح البريد في بيانات العضو (يجب أن يكون بصيغة مثال@نطاق.كوم). لا يتم حذف أي بيانات.' });
  }
  const code = Math.floor(1000 + Math.random() * 9000).toString(); // 4 أرقام
  verificationCodes.set(email, { code, expires_at: Date.now() + 5 * 60 * 1000 });

  const { isEmailConfigured, sendVerificationEmail } = await import('./email.js');
  if (isEmailConfigured()) {
    const result = await sendVerificationEmail(email, code);
    if (!result.ok) {
      return res.json({ success: false, message: result.error || 'فشل إرسال البريد' });
    }
    return res.json({ success: true, message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' });
  }
  console.log('[رمز التحقق]', email, ':', code);
  return res.json({
    success: false,
    message: 'إعداد البريد الإلكتروني مطلوب. أضف SMTP_HOST و SMTP_USER و SMTP_PASS في إعدادات Railway (Variables).',
  });
});

app.post('/api/functions/verifyCode', (req, res) => {
  const { email, code } = req.body || {};
  const stored = verificationCodes.get((email || '').toLowerCase());
  if (!stored || stored.code !== String(code)) {
    return res.json({ success: false, message: 'رمز التحقق غير صحيح' });
  }
  if (Date.now() > stored.expires_at) {
    return res.json({ success: false, message: 'رمز التحقق منتهي الصلاحية' });
  }
  verificationCodes.delete((email || '').toLowerCase());
  res.json({ success: true, message: 'تم التحقق بنجاح' });
});

// تقديم الواجهة الأمامية (بعد npm run build)
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  // منع تخزين index.html مؤقتاً حتى يحصل المستخدم دائماً على آخر تحديث
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
} else {
  // عند عدم وجود dist (مثلاً على السيرفر قبل البناء): استجابة للجذر حتى يعمل فحص الصحة
  app.get('/', (req, res) => {
    res.type('html').status(200).send(
      '<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>المدينة الصحية</title></head><body><h1>سيرفر المدينة الصحية يعمل</h1><p><a href="/api/health">/api/health</a></p></body></html>'
    );
  });
}

const HOST = process.env.HOST || '0.0.0.0';

/** عند بدء السيرفر: إذا لم يوجد أي عضو (حتى المحافظ) نُنفّذ البذر تلقائياً لإنشاء المشرف وفريق التجربة. */
async function ensureMinimalSeedOnStartup() {
  try {
    const db = await getDb();
    if (db.list('team_member').length > 0) return;
    if (isRailwayRuntime()) {
      console.warn('[Qelwa] تنبيه: لا يوجد أعضاء. إذا كان هذا يحدث بعد كل نشر، فغالباً المسار /data غير مربوط بـ Volume — ربط Volume على /data ضروري لاستمرارية البيانات. راجع docs/DATA_LOSS_ON_UPDATE_ANALYSIS.md و DEPLOY.md');
    }
    console.log('[Qelwa] لا يوجد أعضاء — تشغيل البذر التلقائي (المشرف + فريق التجربة)...');
    const { runSeed } = await import('./seed.js');
    await runSeed({ forceSampleTeam: true });
    const after = db.list('team_member').length;
    console.log('[Qelwa] تم إنشاء', after, 'عضو. الدخول: رقم الهوية 1 وكلمة المرور 123456');
  } catch (e) {
    console.error('[Qelwa] فشل البذر التلقائي:', e?.message || e);
  }
}

// إغلاق نظيف عند إشارة SIGTERM (مثلاً عند إعادة النشر على Railway) — يقلل من ظهور "command failed" في السجلات
function gracefulShutdown(signal) {
  console.log('[Qelwa] استلام', signal, '— إغلاق السيرفر...');
  if (typeof httpServer !== 'undefined' && httpServer.close) {
    httpServer.close(() => {
      console.log('[Qelwa] السيرفر متوقف.');
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5000);
  } else {
    process.exit(0);
  }
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// عدم استدعاء قاعدة البيانات عند البدء — حتى لا يتعطل السيرفر إن فشل SQLite (مثلاً على Railway)
let httpServer;
httpServer = app.listen(PORT, HOST, () => {
  console.log('سيرفر المدينة الصحية يعمل على المنفذ', PORT, '(استماع على', HOST + ')');
  console.log('[Qelwa] جاهز — /api/health يرد الآن');
  startAutoBackup();
  setTimeout(() => ensureMinimalSeedOnStartup(), 3000);
});
