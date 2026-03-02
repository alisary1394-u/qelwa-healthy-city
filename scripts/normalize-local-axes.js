/**
 * توحيد أسماء المحاور محلياً (localhost) وفق مرجع 80 معيار
 * - لا يحذف أي معيار
 * - يعيد تسمية المحاور حسب الترتيب (order)
 * الاستخدام:
 *   node scripts/normalize-local-axes.js
 */

const BASE_URL = process.env.SEED_API_URL || 'http://localhost:8080';

const OFFICIAL_AXES = [
  { order: 1, name: 'تنظيم المجتمع وتعبئته من أجل الصحة والتنمية', description: '(أ) تنظيم المجتمع وتعبئته من أجل الصحة والتنمية (معايير 1–7)' },
  { order: 2, name: 'التعاون، والشراكة والدعوة بين القطاعات', description: '(ب) التعاون، والشراكة والدعوة بين القطاعات (معايير 8–14)' },
  { order: 3, name: 'مركز المعلومات المجتمعي', description: '(ج) مركز المعلومات المجتمعي (معايير 15–19)' },
  { order: 4, name: 'المياه والصرف الصحي وسلامة الغذاء وتلوث الهواء', description: '(د) المياه والصرف الصحي وسلامة الغذاء وتلوث الهواء (معايير 20–30)' },
  { order: 5, name: 'التنمية الصحية', description: '(هـ) التنمية الصحية (معايير 31–56)' },
  { order: 6, name: 'الاستعداد للطوارئ والاستجابة لها', description: '(و) الاستعداد للطوارئ والاستجابة لها (معايير 57–62)' },
  { order: 7, name: 'التعليم ومحو الأمية', description: '(ز) التعليم ومحو الأمية (معايير 63–67)' },
  { order: 8, name: 'تنمية المهارات، والتدريب المهني وبناء القدرات', description: '(ح) تنمية المهارات، والتدريب المهني وبناء القدرات (معايير 68–73)' },
  { order: 9, name: 'أنشطة القروض الصغيرة', description: '(ط) أنشطة القروض الصغيرة (معايير 74–80)' },
];

async function api(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}

async function run() {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(BASE_URL.replace(/\/$/, ''))) {
    throw new Error('هذا السكربت مخصص للمحلي فقط.');
  }

  const standards = await api('GET', '/api/entities/Standard');
  const beforeStandards = standards.length;

  const axes = await api('GET', '/api/entities/Axis');
  const byOrder = [...axes].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

  for (const official of OFFICIAL_AXES) {
    const axis = byOrder.find((a) => Number(a.order) === official.order);
    if (!axis) continue;
    await api('PATCH', `/api/entities/Axis/${axis.id}`, {
      name: official.name,
      description: official.description,
      order: official.order,
    });
  }

  const afterStandards = (await api('GET', '/api/entities/Standard')).length;
  const afterAxes = await api('GET', '/api/entities/Axis');

  console.log('✅ تم توحيد أسماء المحاور محلياً');
  console.log('المعايير قبل:', beforeStandards, 'بعد:', afterStandards);
  console.log('المحاور الحالية:');
  afterAxes
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .forEach((a) => console.log(`- [${a.order}] ${a.name}`));
}

run().catch((e) => {
  console.error('❌ فشل التنفيذ:', e.message || e);
  process.exitCode = 1;
});
