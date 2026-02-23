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
// عدم استيراد db هنا — تحميله كسولاً عند أول طلب حتى لا يتعطل السيرفر إن فشل better-sqlite3 (مثلاً على Railway)

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080;

const sessions = new Map();
const verificationCodes = new Map(); // email -> { code, expires_at }

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

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
// رؤوس أمان للتطبيق المنشور (مثل qilwah.up.railway.app)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// نقطة فحص الصحة (للمنصات مثل Railway) — لا تحتاج قاعدة بيانات
app.get('/api/health', (req, res) => {
  res.status(200).json({ ok: true });
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
    if (table === 'team_member' && (body.password === '' || body.password == null)) {
      delete body.password;
    }
    const updated = db.update(table, req.params.id, body);
    if (!updated) return res.status(404).json({ error: 'غير موجود' });
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
    res.status(204).send();
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND' || e.message?.includes('better-sqlite3')) {
      return res.status(503).json({ error: 'قاعدة البيانات غير متاحة حالياً' });
    }
    res.status(500).json({ error: e.message });
  }
});

// بذر البيانات (للتجربة). ?clear=1 يمسح جداول البذرة فقط — ولا نمسح team_member أبداً حتى لا تُستبدل بيانات الأعضاء التي عدّلها المستخدم (بريد، اسم، إلخ).
const TABLES_CLEAR_ON_RESEED = [
  'committee', 'axis', 'standard', 'initiative', 'initiative_kpi',
  'budget', 'budget_allocation', 'transaction'
];
app.post('/api/seed', async (req, res) => {
  try {
    const db = await getDb();
    if (req.query.clear === '1') {
      TABLES_CLEAR_ON_RESEED.forEach((t) => db.clearTable(t));
    }
    const { runSeed } = await import('./seed.js');
    await runSeed();
    res.json({ ok: true, message: 'تم تنفيذ البذرة' });
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND' || e.message?.includes('better-sqlite3')) {
      return res.status(503).json({ error: 'قاعدة البيانات غير متاحة حالياً' });
    }
    res.status(500).json({ error: e.message });
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
  const code = Math.floor(100000 + Math.random() * 900000).toString();
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
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
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
// عدم استدعاء قاعدة البيانات عند البدء — حتى لا يتعطل السيرفر إن فشل SQLite (مثلاً على Railway)
app.listen(PORT, HOST, () => {
  console.log('سيرفر المدينة الصحية يعمل على المنفذ', PORT, '(استماع على', HOST + ')');
});
