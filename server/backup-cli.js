#!/usr/bin/env node
import path from 'path';
import { createBackup, listBackups, restoreBackup, getBackupConfig } from './backup.js';

function usage() {
  console.log('Usage:');
  console.log('  node backup-cli.js backup');
  console.log('  node backup-cli.js list');
  console.log('  node backup-cli.js restore <backup-file-path>');
  console.log('');
  console.log('Examples:');
  console.log('  node backup-cli.js backup');
  console.log('  node backup-cli.js list');
  console.log('  node backup-cli.js restore /data/backups/backup-2026-02-24T01-00-00-000Z.json');
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

  console.error(`Unknown command: ${cmd}`);
  usage();
  process.exit(1);
}

main().catch((e) => {
  console.error('Backup CLI failed:', e?.message || e);
  process.exit(1);
});

