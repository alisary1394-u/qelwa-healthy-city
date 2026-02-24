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
- `BACKUP_AUTO_RESTORE_ON_LOW_TEAM=true|false`
- `BACKUP_LOW_TEAM_THRESHOLD=1`
- `BACKUP_MIN_TEAM_IN_BACKUP=2`
- `BACKUP_GUARD_INTERVAL_MINUTES=30`
- `BACKUP_FALLBACK_RESEED_ON_LOW_TEAM=true|false`
- `BACKUP_SNAPSHOT_ON_MUTATION=true|false`
- `DEFAULT_COORDINATOR_EMAIL=your-email@example.com`
- `DEFAULT_COORDINATOR_PASSWORD=123456`
- `DEFAULT_COORDINATOR_PHONE=05XXXXXXXX`

> مهم: يجب ربط Railway Volume على `/data` حتى تبقى النسخ بعد إعادة النشر.

## حماية تلقائية من فقد الفريق

إذا أصبح عدد أعضاء الفريق منخفضاً بشكل غير طبيعي (افتراضياً `<= 1`) يحاول السيرفر تلقائياً
استعادة أحدث نسخة احتياطية صالحة تحتوي على فريق أكبر (افتراضياً `>= 2`).

- الفحص التلقائي كل 30 دقيقة (قابل للتعديل).
- الاستعادة التلقائية يمكن إيقافها عند الحاجة عبر:
  - `BACKUP_AUTO_RESTORE_ON_LOW_TEAM=false`
- وإذا لم تتوفر نسخة احتياطية صالحة، يمكن تفعيل/تعطيل الإجراء الاحتياطي (إعادة بذر الفريق والمهام التجريبية):
  - `BACKUP_FALLBACK_RESEED_ON_LOW_TEAM=true`
- عند تشغيل إعادة البذر الاحتياطية، يمكن تخصيص بيانات المنسق الافتراضي عبر:
  - `DEFAULT_COORDINATOR_EMAIL`
  - `DEFAULT_COORDINATOR_PASSWORD`
  - `DEFAULT_COORDINATOR_PHONE`

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
