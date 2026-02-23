export default async function sendVerificationCode({ email }, context) {
  const { base44 } = context;
  
  // Generate 6-digit code
  const code = Math.floor(1000 + Math.random() * 9000).toString(); // 4 أرقام
  
  // Set expiration to 5 minutes from now
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  
  // Delete old codes for this email
  const oldCodes = await base44.asServiceRole.entities.VerificationCode.filter({ email });
  for (const oldCode of oldCodes) {
    await base44.asServiceRole.entities.VerificationCode.delete(oldCode.id);
  }
  
  // Save new code
  await base44.asServiceRole.entities.VerificationCode.create({
    email,
    code,
    expires_at: expiresAt,
    verified: false
  });
  
  // Send email with verification code
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: "رمز التحقق - المدينة الصحية قلوة",
      body: `
        مرحباً،
        
        رمز التحقق الخاص بك هو: ${code}
        
        الرمز صالح لمدة 5 دقائق فقط.
        
        إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.
        
        تحياتنا،
        فريق المدينة الصحية - محافظة قلوة
      `
    });
    
    return {
      success: true,
      message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني"
    };
  } catch (error) {
    return {
      success: false,
      message: "فشل إرسال رمز التحقق"
    };
  }
}