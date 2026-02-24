import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_SERVICE_ID);

function toPositiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function isEnabled(value, defaultValue = true) {
  if (value == null || value === '') return defaultValue;
  const lowered = String(value).trim().toLowerCase();
  return !['0', 'false', 'no', 'off'].includes(lowered);
}

export function getBackupConfig() {
  const backupDirDefault = isRailway ? '/data/backups' : path.join(__dirname, 'data', 'backups');
  return {
    enabled: isEnabled(process.env.BACKUP_ENABLED, true),
    intervalHours: toPositiveNumber(process.env.BACKUP_INTERVAL_HOURS, 6),
    startupDelaySeconds: toPositiveNumber(process.env.BACKUP_STARTUP_DELAY_SECONDS, 120),
    retentionDays: toPositiveNumber(process.env.BACKUP_RETENTION_DAYS, 30),
    backupDir: process.env.BACKUP_DIR || backupDirDefault,
    startupSnapshot: isEnabled(process.env.BACKUP_STARTUP_SNAPSHOT, true),
  };
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function nowStamp() {
  const iso = new Date().toISOString(); // 2026-02-24T04:22:03.123Z
  return iso.replace(/[:.]/g, '-'); // compatible with file names
}

function parseBackupPayload(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid backup payload');
  if (!raw.tables || typeof raw.tables !== 'object') throw new Error('Backup file missing "tables"');
  return raw;
}

function toBackupFileName() {
  return `backup-${nowStamp()}.json`;
}

export async function createBackup({ reason = 'manual' } = {}) {
  const cfg = getBackupConfig();
  ensureDir(cfg.backupDir);

  const db = await import('./db.js');
  const tables = {};
  for (const table of db.TABLES) {
    tables[table] = db.list(table);
  }

  const payload = {
    version: 1,
    generated_at: new Date().toISOString(),
    reason,
    tables,
  };

  const fileName = toBackupFileName();
  const finalPath = path.join(cfg.backupDir, fileName);
  const tmpPath = finalPath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tmpPath, finalPath);

  cleanupOldBackups({ backupDir: cfg.backupDir, retentionDays: cfg.retentionDays });

  const counts = {};
  for (const t of Object.keys(tables)) counts[t] = Array.isArray(tables[t]) ? tables[t].length : 0;
  return { path: finalPath, counts, generatedAt: payload.generated_at };
}

export function listBackups() {
  const cfg = getBackupConfig();
  ensureDir(cfg.backupDir);
  const files = fs.readdirSync(cfg.backupDir)
    .filter((f) => /^backup-.*\.json$/i.test(f))
    .map((f) => {
      const full = path.join(cfg.backupDir, f);
      const st = fs.statSync(full);
      return {
        name: f,
        path: full,
        size: st.size,
        mtime: st.mtime.toISOString(),
      };
    })
    .sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
  return files;
}

export async function restoreBackup(filePath) {
  if (!filePath) throw new Error('Backup file path is required');
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) throw new Error(`Backup file not found: ${resolved}`);
  const raw = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  const payload = parseBackupPayload(raw);

  const db = await import('./db.js');
  // Clear then restore all known tables to match backup snapshot exactly.
  for (const table of db.TABLES) db.clearTable(table);

  for (const table of db.TABLES) {
    const rows = Array.isArray(payload.tables[table]) ? payload.tables[table] : [];
    for (const row of rows) {
      if (!row || typeof row !== 'object' || !row.id) continue;
      const body = { ...row };
      delete body.id;
      db.create(table, row.id, body);
    }
  }

  const restoredCounts = {};
  for (const table of db.TABLES) restoredCounts[table] = db.list(table).length;
  return { path: resolved, restoredCounts };
}

export function cleanupOldBackups({ backupDir, retentionDays }) {
  ensureDir(backupDir);
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const files = fs.readdirSync(backupDir).filter((f) => /^backup-.*\.json$/i.test(f));
  let deleted = 0;
  for (const f of files) {
    const full = path.join(backupDir, f);
    const st = fs.statSync(full);
    if (now - st.mtimeMs > maxAgeMs) {
      fs.unlinkSync(full);
      deleted += 1;
    }
  }
  return deleted;
}

export function startAutoBackup() {
  const cfg = getBackupConfig();
  if (!cfg.enabled) {
    console.log('[Backup] Auto backup is disabled (BACKUP_ENABLED=false).');
    return null;
  }

  const intervalMs = Math.floor(cfg.intervalHours * 60 * 60 * 1000);
  const startupDelayMs = Math.floor(cfg.startupDelaySeconds * 1000);
  let running = false;

  const run = async (reason) => {
    if (running) return;
    running = true;
    try {
      const result = await createBackup({ reason });
      console.log('[Backup] Snapshot created:', result.path);
    } catch (e) {
      console.error('[Backup] Snapshot failed:', e?.message || e);
    } finally {
      running = false;
    }
  };

  if (cfg.startupSnapshot) {
    setTimeout(() => run('startup'), startupDelayMs);
  }

  const timer = setInterval(() => run('scheduled'), intervalMs);
  console.log(`[Backup] Auto backup enabled every ${cfg.intervalHours} hour(s). Dir: ${cfg.backupDir}`);
  return () => clearInterval(timer);
}

