# النسخ الاحتياطي والاستعادة (تلقائي)

تمت إضافة نظام نسخ احتياطي تلقائي في السيرفر.

## الإعداد الافتراضي المقترح

- النسخ الاحتياطي التلقائي: **مفعّل**
- الفترة: **كل 6 ساعات** (`BACKUP_INTERVAL_HOURS=6`)
- الاحتفاظ: **30 يوم** (`BACKUP_RETENTION_DAYS=30`)
- المسار على Railway: `/data/backups`

## متغيرات البيئة (اختياري)

- `BACKUP_ENABLED=true|false`
- `BACKUP_INTERVAL_HOURS=6`
- `BACKUP_RETENTION_DAYS=30`
- `BACKUP_STARTUP_DELAY_SECONDS=120`
- `BACKUP_STARTUP_SNAPSHOT=true|false`
- `BACKUP_DIR=/data/backups`

> مهم: يجب ربط Railway Volume على `/data` حتى تبقى النسخ بعد إعادة النشر.

## أوامر يدوية

من جذر المشروع:

- إنشاء نسخة الآن:
  - `npm run backup:create`
- عرض النسخ:
  - `npm run backup:list`
- استعادة نسخة:
  - `npm run backup:restore -- /data/backups/backup-YYYY-MM-DDTHH-mm-ss-SSSZ.json`

## ملاحظة عن الاستعادة

الاستعادة الحالية تستبدل محتوى الجداول بالكامل بالنسخة المختارة (Restore Full Replace).
