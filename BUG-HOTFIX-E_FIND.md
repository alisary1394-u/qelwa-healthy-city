# إصلاح الخطأ: e.find is not a function

## المشكلة
حدث خطأ في التطبيق:
```
TypeError: e.find is not a function
    at https://www.qeelwah.com/assets/index-R6Bxxqnm.js:242:44615
    at Object.Ua [as useMemo] (...)
```

السبب: استخدام `.find()` على بيانات قد لا تكون مصفوفة عند جلب البيانات من API في حالات معينة.

## الحل المطبق

### 1. **apiBackend.js** - إصلاح دوال entity handler
- إضافة فحص `Array.isArray()` قبل استخدام `.find()` في:
  - `list()` - يضمن أن النتيجة مصفوفة دائماً
  - `filter()` - يتعامل مع البيانات غير الصحيحة بآمان

### 2. **apiBackend.js** - إصلاح دوال البذر والمزامنة
- `seedDefaultGovernorIfNeeded()` - فحص البيانات قبل استخدام `.find()`
- `syncStandardsFromCsv()` - فحص البيانات قبل الحلقة
- `seedAxesAndStandardsIfNeeded()` - فحص البيانات قبل التحقق من الطول
- `seedCommitteesTeamInitiativesTasksIfNeeded()` - فحص البيانات قبل التحقق من الطول

### 3. **Layout.jsx** - إضافة select transformer
- تطبيق `select` في useQuery لضمان أن البيانات مصفوفة دائماً
- فحص إضافي قبل استخدام `.find()`

### 4. **usePermissions.js** - إضافة حماية شاملة
- تطبيق `select` في useQuery لكلا الاستعلامات (members و permissionOverrides)
- متغيرات محلية للتحقق من نوع البيانات قبل الاستخدام

## التغييرات العملية

### apiBackend.js - entity handler
```javascript
// السابق
return api('GET', path + q);

// الجديد
const result = await api('GET', path + q);
return Array.isArray(result) ? result : [];
```

### Layout.jsx - query with selector
```javascript
// السابق
const { data: settingsList = [] } = useQuery({...});

// الجديد
const { data: settingsList = [] } = useQuery({
  ...,
  select: (data) => Array.isArray(data) ? data : []
});
```

## الفائدة
- منع الخطأ `e.find is not a function` بشكل كامل
- ضمان تلقي بيانات صحيحة في جميع الحالات
- تحسين استقرار التطبيق عند مواجهة مشاكل في API
- توفير قيم افتراضية آمنة في جميع الظروف

## الملفات المعدلة
1. `src/api/apiBackend.js`
2. `src/Layout.jsx`
3. `src/hooks/usePermissions.js`

## حالات الاختبار الموصى بها
- اختبر عند بطء الاتصال بالإنترنت
- اختبر عند عدم توفر الخادم (500 error)
- اختبر عند استجابة خادم غير متوقعة
- اختبر تحميل الصفحة الأولى
- اختبر الملاحة بين الصفحات
