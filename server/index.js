/**
 * سيرفر المدينة الصحية — Express + SQLite (قاعدة بيانات محلية)
 * يعمل محلياً وعند النشر على السيرفر
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

const sessions = new Map();
const verificationCodes = new Map(); // email -> { code, expires_at }

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

function entityToTable(name) {
  return name.replace(/([A-Z])/g, (_, c) => '_' + c.toLowerCase()).replace(/^_/, '');
}

function getAuthUser(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.token;
  return token ? sessions.get(token) : null;
}

// تسجيل الدخول
app.post('/api/auth/login', (req, res) => {
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
    email: member.email || 'admin@local',
    full_name: member.full_name || 'المشرف',
    user_role: member.role === 'governor' ? 'admin' : 'user',
  };
  const token = 'tk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 12);
  sessions.set(token, user);
  res.json({ user, token });
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'غير مسجل الدخول' });
  res.json(user);
});

// كيانات: list, get, create, update, delete
app.get('/api/entities/:name', (req, res) => {
  const table = entityToTable(req.params.name);
  if (!db.TABLES.includes(table)) return res.status(404).json({ error: 'كيان غير معروف' });
  try {
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
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/entities/:name/:id', (req, res) => {
  const table = entityToTable(req.params.name);
  if (!db.TABLES.includes(table)) return res.status(404).json({ error: 'كيان غير معروف' });
  const row = db.get(table, req.params.id);
  if (!row) return res.status(404).json({ error: 'غير موجود' });
  res.json(row);
});

app.post('/api/entities/:name', (req, res) => {
  const table = entityToTable(req.params.name);
  if (!db.TABLES.includes(table)) return res.status(404).json({ error: 'كيان غير معروف' });
  const data = req.body || {};
  const id = data.id || null;
  const body = { ...data };
  delete body.id;
  try {
    const record = db.create(table, id, body);
    res.status(201).json(record);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/entities/:name/:id', (req, res) => {
  const table = entityToTable(req.params.name);
  if (!db.TABLES.includes(table)) return res.status(404).json({ error: 'كيان غير معروف' });
  const updated = db.update(table, req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'غير موجود' });
  res.json(updated);
});

app.delete('/api/entities/:name/:id', (req, res) => {
  const table = entityToTable(req.params.name);
  if (!db.TABLES.includes(table)) return res.status(404).json({ error: 'كيان غير معروف' });
  db.remove(table, req.params.id);
  res.status(204).send();
});

// بذر البيانات (للتجربة). ?clear=1 يمسح الجداول أولاً ثم يبذر
app.post('/api/seed', async (req, res) => {
  try {
    if (req.query.clear === '1') {
      db.TABLES.forEach((t) => db.clearTable(t));
    }
    const { runSeed } = await import('./seed.js');
    await runSeed();
    res.json({ ok: true, message: 'تم تنفيذ البذرة' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/functions/sendVerificationCode', (req, res) => {
  const email = req.body?.email;
  if (!email) return res.status(400).json({ success: false, message: 'البريد مطلوب' });
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  verificationCodes.set(email.toLowerCase(), { code, expires_at: Date.now() + 5 * 60 * 1000 });
  console.log('[رمز التحقق]', email, ':', code);
  res.json({ success: true, message: 'تم إعداد رمز التحقق', code });
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
}

app.listen(PORT, () => {
  console.log('سيرفر المدينة الصحية يعمل على المنفذ', PORT);
  console.log('قاعدة البيانات:', db.getDb().name);
});
