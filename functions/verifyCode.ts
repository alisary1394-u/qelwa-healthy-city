export default async function verifyCode({ email, code }, context) {
  const { base44 } = context;
  
  // Find verification code
  const codes = await base44.asServiceRole.entities.VerificationCode.filter({ 
    email, 
    code,
    verified: false 
  });
  
  if (codes.length === 0) {
    return {
      success: false,
      message: "رمز التحقق غير صحيح"
    };
  }
  
  const verificationCode = codes[0];
  
  // Check if expired
  const now = new Date();
  const expiresAt = new Date(verificationCode.expires_at);
  
  if (now > expiresAt) {
    return {
      success: false,
      message: "رمز التحقق منتهي الصلاحية"
    };
  }
  
  // Mark as verified
  await base44.asServiceRole.entities.VerificationCode.update(verificationCode.id, {
    verified: true
  });
  
  return {
    success: true,
    message: "تم التحقق بنجاح"
  };
}