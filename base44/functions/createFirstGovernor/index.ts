import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({})) as {
      full_name?: string;
      national_id?: string;
      email?: string;
      password?: string;
    };

    const { full_name, national_id, email, password } = body;

    const members = await base44.asServiceRole.entities.TeamMember.list();
    if (members.length > 0) {
      return Response.json({
        success: false,
        message:
          "يوجد أعضاء مسجلون بالفعل. استخدم تسجيل الدخول أو تواصل مع مدير النظام.",
      });
    }

    if (!full_name || !national_id || !email || !password) {
      return Response.json({
        success: false,
        message:
          "جميع الحقول (الاسم، رقم الهوية، البريد، كلمة المرور) مطلوبة.",
      });
    }

    await base44.asServiceRole.entities.TeamMember.create({
      full_name: String(full_name).trim(),
      national_id: String(national_id).trim(),
      email: String(email).trim().toLowerCase(),
      password: String(password),
      role: "governor",
      status: "active",
    });

    return Response.json({
      success: true,
      message:
        "تم تسجيلك كمشرف عام. يمكنك الآن تسجيل الدخول من النموذج أعلاه.",
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
      },
      { status: 500 }
    );
  }
});
