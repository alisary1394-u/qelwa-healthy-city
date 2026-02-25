#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { createBackup, listBackups, restoreBackup, getBackupConfig } from './backup.js';

function usage() {
  console.log('Usage:');
  console.log('  node backup-cli.js backup');
  console.log('  node backup-cli.js list');
  console.log('  node backup-cli.js restore <backup-file-path>');
  console.log('  node backup-cli.js restore-latest [--min-team=1]');
  console.log('');
  console.log('Examples:');
  console.log('  node backup-cli.js backup');
  console.log('  node backup-cli.js list');
  console.log('  node backup-cli.js restore /data/backups/backup-2026-02-24T01-00-00-000Z.json');
  console.log('  node backup-cli.js restore-latest --min-team=2');
}

function parsePositiveInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function getTeamCountFromBackupFile(filePath) {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const rows = Array.isArray(raw?.tables?.team_member) ? raw.tables.team_member : [];
    return rows.length;
  } catch {
    return -1;
  }
}

async function main() {
  const cmd = process.argv[2];
  if (!cmd) {
    usage();
    process.exit(1);
  }

  if (cmd === 'backup') {
    const result = await createBackup({ reason: 'cli' });
    console.log('Backup created:', result.path);
    console.log('Generated at:', result.generatedAt);
    return;
  }

  if (cmd === 'list') {
    const cfg = getBackupConfig();
    const files = listBackups();
    console.log('Backup dir:', cfg.backupDir);
    if (files.length === 0) {
      console.log('No backups found.');
      return;
    }
    files.forEach((f, i) => {
      console.log(`${i + 1}. ${f.name} | ${f.mtime} | ${f.size} bytes`);
    });
    return;
  }

  if (cmd === 'restore') {
    const fileArg = process.argv[3];
    if (!fileArg) {
      console.error('Please provide backup file path.');
      usage();
      process.exit(1);
    }
    const fullPath = path.isAbsolute(fileArg) ? fileArg : path.resolve(process.cwd(), fileArg);
    const result = await restoreBackup(fullPath);
    console.log('Restore completed from:', result.path);
    console.log('Restored row counts by table:');
    console.log(JSON.stringify(result.restoredCounts, null, 2));
    return;
  }

  if (cmd === 'restore-latest') {
    const minTeamArg = process.argv.find((a) => a.startsWith('--min-team='));
    const minTeam = parsePositiveInt(minTeamArg?.split('=')[1], 1);
    const files = listBackups();
    if (files.length === 0) {
      console.error('No backups found.');
      process.exit(1);
    }
    const selected = files.find((f) => getTeamCountFromBackupFile(f.path) >= minTeam);
    if (!selected) {
      console.error(`No suitable backup found (team_member >= ${minTeam}).`);
      process.exit(1);
    }
    const result = await restoreBackup(selected.path);
    console.log('Restore completed from latest suitable backup:', result.path);
    console.log('Restored row counts by table:');
    console.log(JSON.stringify(result.restoredCounts, null, 2));
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  usage();
  process.exit(1);
}

main().catch((e) => {
  console.error('Backup CLI failed:', e?.message || e);
  process.exit(1);
});

