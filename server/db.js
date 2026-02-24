/**
 * SQLite قاعدة بيانات محلية للسيرفر
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_SERVICE_ID);
const DEFAULT_DB_PATH = isRailway ? '/data/qelwa.db' : path.join(__dirname, 'data', 'qelwa.db');
const DB_PATH = process.env.DB_PATH || DEFAULT_DB_PATH;

if (isRailway && !process.env.DB_PATH) {
  // تنبيه مهم: الاستمرارية تتطلب ربط Railway Volume على المسار /data.
  console.warn('[DB] DB_PATH غير مضبوط. سيتم استخدام /data/qelwa.db. تأكد من ربط Volume في Railway على /data لحفظ البيانات بين عمليات النشر.');
}

const TABLES = [
  'committee', 'team_member', 'settings', 'axis', 'standard', 'initiative',
  'initiative_kpi', 'task', 'budget', 'budget_allocation', 'transaction',
  'evidence', 'notification', 'file_upload', 'family_survey', 'user_preferences', 'verification_code'
];

let db = null;

/** اسم الجدول بين علامتي اقتباس لتفادي كلمات SQL محجوزة (مثل transaction) */
function quoted(table) {
  return '"' + table.replace(/"/g, '""') + '"';
}

export function getDb() {
  if (db) return db;
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  TABLES.forEach((name) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ${quoted(name)} (
        id TEXT PRIMARY KEY,
        body TEXT NOT NULL DEFAULT '{}'
      )
    `);
  });
  return db;
}

export function entityToTable(entityName) {
  return entityName
    .replace(/([A-Z])/g, (_, c) => '_' + c.toLowerCase())
    .replace(/^_/, '');
}

export function list(table) {
  const d = getDb();
  const rows = d.prepare(`SELECT id, body FROM ${quoted(table)}`).all();
  return rows.map((r) => ({ id: r.id, ...JSON.parse(r.body || '{}') }));
}

export function get(table, id) {
  const d = getDb();
  const row = d.prepare(`SELECT id, body FROM ${quoted(table)} WHERE id = ?`).get(id);
  if (!row) return null;
  return { id: row.id, ...JSON.parse(row.body || '{}') };
}

function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
}

export function create(table, id, body) {
  const d = getDb();
  const finalId = id || generateId();
  d.prepare(`INSERT INTO ${quoted(table)} (id, body) VALUES (?, ?)`).run(finalId, JSON.stringify(body));
  return { id: finalId, ...body };
}

export function update(table, id, body) {
  const d = getDb();
  const row = d.prepare(`SELECT id, body FROM ${quoted(table)} WHERE id = ?`).get(id);
  if (!row) return null;
  const merged = { ...JSON.parse(row.body || '{}'), ...body };
  delete merged.id;
  d.prepare(`UPDATE ${quoted(table)} SET body = ? WHERE id = ?`).run(JSON.stringify(merged), id);
  return { id, ...merged };
}

export function remove(table, id) {
  const d = getDb();
  d.prepare(`DELETE FROM ${quoted(table)} WHERE id = ?`).run(id);
}

export function clearTable(table) {
  const d = getDb();
  d.prepare(`DELETE FROM ${quoted(table)}`).run();
}

export { TABLES };
