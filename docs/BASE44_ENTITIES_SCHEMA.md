# مخطط الكيانات (Entities) لتطبيق المدينة الصحية - Base44

هذا الملف يوضح **جميع الكيانات (الجداول)** والحقول التي يستخدمها التطبيق. استخدمه عند إنشاء أو تعديل الكيانات في لوحة تحكم Base44.

---

## 1. TeamMember (أعضاء الفريق)

| الحقل | النوع | وصف |
|-------|-------|-----|
| full_name | text | الاسم الكامل * |
| national_id | text | رقم الهوية الوطنية (للدخول) |
| password | text | كلمة المرور (للدخول) |
| email | text | البريد الإلكتروني |
| phone | text | رقم الهاتف * |
| role | text | الدور: governor, coordinator, committee_head, member, volunteer, budget_manager, accountant, financial_officer |
| committee_id | text | معرف اللجنة (مرجع) |
| committee_name | text | اسم اللجنة (عرض) |
| specialization | text | التخصص |
| department | text | القسم/الجهة |
| supervisor_id | text | معرف المشرف المباشر |
| status | text | active / inactive |
| join_date | date | تاريخ الانضمام |
| notes | text | ملاحظات |

---

## 2. Settings (إعدادات المدينة)

| الحقل | النوع | وصف |
|-------|-------|-----|
| city_name | text | اسم المدينة (مثال: المدينة الصحية) |
| city_location | text | الموقع (مثال: محافظة قلوة) |
| logo_text | text | نص الشعار (حرف أو اختصار) |
| logo_url | text | رابط صورة الشعار |

**ملاحظة:** التطبيق يتوقع سجل واحد غالباً (أول سجل في القائمة).

---

## 3. Committee (اللجان)

| الحقل | النوع | وصف |
|-------|-------|-----|
| name | text | اسم اللجنة * |
| description | text | وصف اللجنة |

---

## 4. Task (المهام)

| الحقل | النوع | وصف |
|-------|-------|-----|
| title | text | عنوان المهمة * |
| description | text | الوصف |
| assigned_to | text | معرف العضو المكلف |
| assigned_to_name | text | اسم المكلف (عرض) |
| assigned_by | text | بريد من عيّن المهمة |
| priority | text | low / medium / high / urgent |
| status | text | pending / in_progress / completed |
| category | text | field_work, meeting, report, survey, training, other |
| due_date | date | تاريخ الاستحقاق |
| reminder_date | datetime | تاريخ ووقت التذكير |
| reminder_sent | boolean | هل تم إرسال التذكير |
| completion_date | date | تاريخ الإنجاز (عند إكمال المهمة) |
| notes | text | ملاحظات |

---

## 5. Notification (الإشعارات)

| الحقل | النوع | وصف |
|-------|-------|-----|
| user_email | text | بريد المستخدم المستهدف * |
| title | text | عنوان الإشعار |
| message | text | نص الرسالة |
| type | text | task_assigned, task_due, task_overdue, warning, ... |
| related_id | text | معرف السجل المرتبط (مثلاً معرف المهمة) |
| is_read | boolean | مقروء / غير مقروء |

**استخدام filter:** `filter({ user_email: userEmail })` مع ترتيب `-created_date` وحد أقصى 50.

---

## 6. Axis (المحاور – معايير منظمة الصحة العالمية)

| الحقل | النوع | وصف |
|-------|-------|-----|
| name | text | اسم المحور * |
| description | text | الوصف |
| order | number | ترتيب العرض |

**استخدام list:** `list('order')` للترتيب حسب order.

---

## 7. Standard (المعايير)

| الحقل | النوع | وصف |
|-------|-------|-----|
| code | text | رمز المعيار * |
| title | text | عنوان المعيار |
| description | text | الوصف |
| axis_id | text | معرف المحور |
| axis_name | text | اسم المحور (عرض) |
| required_evidence | text | الأدلة المطلوبة |
| status | text | not_started / in_progress / completed / approved |

**استخدام list:** `list('code')`.

---

## 8. Evidence (الأدلة)

| الحقل | النوع | وصف |
|-------|-------|-----|
| title | text | عنوان الدليل |
| description | text | الوصف |
| file_url | text | رابط الملف (بعد رفع الملف عبر Core.UploadFile) |
| file_type | text | image / document |
| standard_id | text | معرف المعيار |
| standard_code | text | رمز المعيار (عرض) |
| axis_id | text | معرف المحور |
| uploaded_by_name | text | اسم رافع الملف |
| status | text | pending / approved / rejected |
| approved_by | text | اسم المعتمد |
| approved_at | datetime | وقت الاعتماد |
| rejection_reason | text | سبب الرفض |

---

## 9. Initiative (المبادرات)

| الحقل | النوع | وصف |
|-------|-------|-----|
| code | text | رمز المبادرة (مثال: INI123456) |
| title | text | عنوان المبادرة * |
| description | text | الوصف |
| objectives | text | الأهداف |
| committee_id | text | معرف اللجنة |
| committee_name | text | اسم اللجنة |
| axis_id | text | معرف المحور |
| axis_name | text | اسم المحور |
| related_standards | array | قائمة معايير مرتبطة |
| target_audience | text | الجمهور المستهدف |
| expected_beneficiaries | number | عدد المستفيدين المتوقع |
| start_date | date | تاريخ البدء |
| end_date | date | تاريخ الانتهاء |
| budget | number | الميزانية |
| actual_cost | number | التكلفة الفعلية |
| leader_id | text | معرف القائد |
| leader_name | text | اسم القائد |
| team_members | array | أعضاء الفريق |
| priority | text | low / medium / high / urgent |
| impact_level | text | low / medium / high / very_high |
| location | text | الموقع |
| partners | text | الشركاء |
| notes | text | ملاحظات |
| status | text | planning / approved / in_progress / completed / on_hold / cancelled |
| progress_percentage | number | نسبة الإنجاز (0–100) |
| approval_date | date | تاريخ الاعتماد |
| approved_by | text | اسم المعتمد |

---

## 10. InitiativeKPI (مؤشرات أداء المبادرات)

| الحقل | النوع | وصف |
|-------|-------|-----|
| initiative_id | text | معرف المبادرة * |
| initiative_title | text | عنوان المبادرة (عرض) |
| kpi_name | text | اسم المؤشر * |
| description | text | الوصف |
| target_value | number | القيمة المستهدفة |
| current_value | number | القيمة الحالية |
| unit | text | وحدة القياس (مستفيد، جلسة، يوم...) |
| measurement_frequency | text | يومي / أسبوعي / شهري / ربع سنوي / سنوي |
| status | text | behind / at_risk / on_track / achieved |
| last_updated | date | آخر تحديث |
| notes | text | ملاحظات |

**استخدام filter:** `filter({ initiative_id: initiativeId })`.

---

## 11. Budget (الميزانيات)

| الحقل | النوع | وصف |
|-------|-------|-----|
| name | text | اسم الميزانية |
| fiscal_year | text | السنة المالية |
| start_date | date | تاريخ البدء |
| end_date | date | تاريخ الانتهاء |
| total_budget | number | إجمالي الميزانية |
| allocated_budget | number | المبلغ المخصص |
| spent_amount | number | المبلغ المنفق |
| remaining_budget | number | المتبقي |
| description | text | الوصف |
| notes | text | ملاحظات |
| status | text | draft / active |

---

## 12. BudgetAllocation (تخصيصات الميزانية)

| الحقل | النوع | وصف |
|-------|-------|-----|
| budget_id | text | معرف الميزانية |
| budget_name | text | اسم الميزانية |
| committee_id | text | معرف اللجنة |
| committee_name | text | اسم اللجنة |
| axis_id | text | معرف المحور |
| axis_name | text | اسم المحور |
| category | text | التصنيف |
| allocated_amount | number | المبلغ المخصص |
| notes | text | ملاحظات |

---

## 13. Transaction (المعاملات المالية)

| الحقل | النوع | وصف |
|-------|-------|-----|
| transaction_number | text | رقم المعاملة (مثال: T123456) |
| type | text | income / expense |
| category | text | التصنيف (قائمة ثابتة في التطبيق) |
| amount | number | المبلغ |
| description | text | الوصف |
| date | date | التاريخ |
| committee_id | text | معرف اللجنة |
| committee_name | text | اسم اللجنة |
| axis_id | text | معرف المحور |
| axis_name | text | اسم المحور |
| payment_method | text | نقدي / شيك / تحويل بنكي / بطاقة / أخرى |
| receipt_number | text | رقم الإيصال |
| beneficiary | text | المستفيد |
| attachment_url | text | رابط المرفق |
| notes | text | ملاحظات |
| status | text | pending / paid |

**استخدام list:** `list('-date')`.

---

## 14. FileUpload (الملفات المرفوعة)

| الحقل | النوع | وصف |
|-------|-------|-----|
| title | text | عنوان الملف * |
| description | text | الوصف |
| file_url | text | رابط الملف (بعد رفع عبر Core.UploadFile) |
| file_type | text | image / document / report / other |
| committee_id | text | معرف اللجنة |
| committee_name | text | اسم اللجنة |
| uploaded_by_name | text | اسم رافع الملف |
| uploaded_by_role | text | دور الرافع |
| status | text | pending_supervisor / pending_chairman / approved / rejected / returned |
| supervisor_approval | object | { approved_by, approved_at } |
| chairman_approval | object | { approved_by, approved_at } |
| rejection_reason | text | سبب الرفض أو الإعادة |

---

## 15. FamilySurvey (استبيان الأسرة)

استبيان مفصل حسب معايير منظمة الصحة العالمية. الحقول كثيرة؛ أهم المجموعات:

- **تعريف:** survey_number, family_head_name, group_number, volunteer_name, district, address
- **ديموغرافيا:** demographics_total, demographics_males, demographics_females، وفئات عمرية (infants, children_1_4, children_5_14, adults_15_44, adults_45_65, seniors_65_plus) مع total/males/females لكل فئة
- **تعليم:** children_enrolled_school_*, literate_*, skilled_members_*, skills_details
- **معيشة:** safe_water_access, has_toilet, has_bathroom, has_garbage_system, livelihood_patterns, income_less_than_dollar, income_sources, balanced_diet, access_to_healthy_markets
- **صحة أطفال وأمهات:** breastfeeding_*, births_*, birth_assisted_by, low_birth_weight_*, children_fully_vaccinated, infant_deaths_*, child_deaths_1_5_*, has_pregnant_woman, pregnant_*, maternal_death_*, married_women_15_49_count, contraception_users
- **صحة عامة:** smokers_count, has_chronic_diseases, chronic_diseases_details, has_disability, disability_details, deaths_from_diseases
- **مرافق ورضا:** access_to_health_facility, satisfied_with_health_services, access_to_sports_facilities, participate_in_sports, access_to_green_areas, satisfied_with_infrastructure, access_to_transport, contributed_to_social_services (مع حقول _details حيث يلزم)
- **عام:** notes, status (مثل: submitted / verified)

**استخدام list:** `list('-created_date')`.

---

## 16. UserPreferences (تفضيلات المستخدم)

| الحقل | النوع | وصف |
|-------|-------|-----|
| user_email | text | بريد المستخدم * (فريد) |
| email_notifications | boolean | إشعارات البريد |
| in_app_notifications | boolean | إشعارات داخل التطبيق |
| task_assigned_email | boolean | بريد عند تعيين مهمة |
| task_assigned_app | boolean | إشعار تطبيق عند تعيين مهمة |
| task_due_email | boolean | بريد عند اقتراب استحقاق مهمة |
| task_due_app | boolean | إشعار تطبيق عند الاستحقاق |

**استخدام filter:** `filter({ user_email: currentUser?.email })`. يُفترض سجل واحد لكل مستخدم.

---

## ملخص الكيانات (أسماء الجداول في Base44)

| اسم الكيان في الكود | الاسم المتوقع في Base44 |
|---------------------|-------------------------|
| TeamMember | TeamMember |
| Settings | Settings |
| Committee | Committee |
| Task | Task |
| Notification | Notification |
| Axis | Axis |
| Standard | Standard |
| Evidence | Evidence |
| Initiative | Initiative |
| InitiativeKPI | InitiativeKPI |
| Budget | Budget |
| BudgetAllocation | BudgetAllocation |
| Transaction | Transaction |
| FileUpload | FileUpload |
| FamilySurvey | FamilySurvey |
| UserPreferences | UserPreferences |

---

## دوال النظام المستخدمة (Functions)

- **sendVerificationCode** – إرسال رمز التحقق إلى البريد (المعامل: email)
- **verifyCode** – التحقق من الرمز (المعاملات: email, code)
- **checkTaskReminders** – فحص تذكيرات المهام (يُفترض أنها مجدولة في Base44)

---

## تكاملات (Integrations)

- **Core.UploadFile** – رفع ملف والحصول على `file_url` (و `file_url` يُخزَّن في Evidence أو FileUpload أو Settings للشعار).

---

تم استخراج هذا المخطط من الكود المصدري للتطبيق. عند إنشاء الكيانات في Base44 تأكد من تطابق أسماء الحقول مع الجدول أعلاه لضمان عمل التطبيق بدون أخطاء.
