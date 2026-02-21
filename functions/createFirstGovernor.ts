/**
 * تسجيل المشرف الأول فقط (عند عدم وجود أي أعضاء).
 * يُستدعى من صفحة الرئيسية عند "تسجيل كمشرف".
 * يجب أن تكون هذه الدالة قابلة للاستدعاء بدون تسجيل دخول (إن أردت ذلك من لوحة Base44).
 */
export default async function createFirstGovernor(
  { full_name, national_id, email, password },
  context
) {
  const { base44 } = context;

  const members = await base44.asServiceRole.entities.TeamMember.list();
  if (members.length > 0) {
    return {
      success: false,
      message: "يوجد أعضاء مسجلون بالفعل. استخدم تسجيل الدخول أو تواصل مع مدير النظام.",
    };
  }

  if (!full_name || !national_id || !email || !password) {
    return {
      success: false,
      message: "جميع الحقول (الاسم، رقم الهوية، البريد، كلمة المرور) مطلوبة.",
    };
  }

  await base44.asServiceRole.entities.TeamMember.create({
    full_name: full_name.trim(),
    national_id: String(national_id).trim(),
    email: email.trim().toLowerCase(),
    password: password,
    role: "governor",
    status: "active",
  });

  return {
    success: true,
    message: "تم تسجيلك كمشرف عام. يمكنك الآن تسجيل الدخول من النموذج أعلاه.",
  };
}
