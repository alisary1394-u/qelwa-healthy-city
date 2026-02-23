import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createPageUrl } from '@/utils';
import { getNavItemsForRole } from '@/lib/permissions';
import { appParams } from '@/lib/app-params';
import { Loader2, MapPin, Users, Building2, Target, Smartphone } from "lucide-react";
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: credentials, 2: Email verification
  const [verificationCode, setVerificationCode] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [showRegisterGovernor, setShowRegisterGovernor] = useState(false);
  const [regFullName, setRegFullName] = useState('');
  const [regNationalId, setRegNationalId] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [displayedVerificationCode, setDisplayedVerificationCode] = useState('');
  const navigate = useNavigate();

  const { data: isAuth } = useQuery({
    queryKey: ['isAuth'],
    queryFn: () => api.auth.isAuthenticated()
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
    enabled: isAuth === true
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.entities.Settings.list()
  });

  const currentSetting = settings[0] || {};

  // Allow viewing home page even when authenticated

  React.useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get all team members
      const members = await api.entities.TeamMember.list();
      
      // Find member with matching national ID
      const member = members.find(m => m.national_id === nationalId);
      
      if (!member) {
        setError('رقم الهوية الوطنية غير مسجل في النظام');
        setLoading(false);
        return;
      }

      // Check password
      if (member.password !== password) {
        setError('كلمة المرور غير صحيحة');
        setLoading(false);
        return;
      }

      // Check if member has email
      if (!member.email) {
        setError('البريد الإلكتروني غير مسجل. يرجى التواصل مع الإدارة.');
        setLoading(false);
        return;
      }

      // Send verification code
      setMemberEmail(member.email);
      const codeSent = await sendVerificationCodeEmail(member.email);
      if (codeSent) {
        setStep(2);
        setResendTimer(60);
      }
      setLoading(false);
    } catch (err) {
      setError('حدث خطأ. يرجى المحاولة مرة أخرى.');
      setLoading(false);
    }
  };

  const sendVerificationCodeEmail = async (email) => {
    setDisplayedVerificationCode('');
    setError('');
    try {
      const result = await api.functions.sendVerificationCode({ email });
      if (!result.success) {
        setError(result.message || 'فشل إرسال رمز التحقق');
        return false;
      }
      return true;
    } catch (err) {
      setError('فشل إرسال رمز التحقق. يرجى المحاولة مرة أخرى.');
      return false;
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await api.functions.verifyCode({ 
        email: memberEmail, 
        code: verificationCode 
      });

      if (result.success) {
        const members = await api.entities.TeamMember.list();
        const member = members.find(m => m.national_id === nationalId);

        if (member && member.email) {
          const navItems = getNavItemsForRole(member.role || 'volunteer');
          const firstPage = navItems[0]?.name || 'Dashboard';
          if (typeof api.auth.setUser === 'function') {
            api.auth.setUser({
              email: member.email,
              full_name: member.full_name,
              user_role: member.role === 'governor' ? 'admin' : 'user',
              national_id: member.national_id,
            });
            window.location.href = createPageUrl(firstPage);
          } else {
            api.auth.redirectToLogin(createPageUrl(firstPage));
          }
        } else {
          setError('المستخدم غير مسجل. يرجى التواصل مع الإدارة.');
          setLoading(false);
        }
      } else {
        setError(result.message || 'رمز التحقق غير صحيح');
        setLoading(false);
      }
    } catch (err) {
      setError('حدث خطأ في التحقق. يرجى المحاولة مرة أخرى.');
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    setError('');
    await sendVerificationCodeEmail(memberEmail);
    setResendTimer(60);
  };

  const handleRegisterGovernor = async (e) => {
    e.preventDefault();
    setError('');
    setRegisterSuccess('');
    setRegisterLoading(true);
    const payload = {
      full_name: regFullName.trim(),
      national_id: regNationalId.trim(),
      email: regEmail.trim().toLowerCase(),
      password: regPassword,
    };

    const onSuccess = () => {
      setRegisterSuccess('تم تسجيلك كمشرف عام. يمكنك الآن تسجيل الدخول من النموذج أعلاه.');
      setShowRegisterGovernor(false);
      setNationalId(regNationalId);
      setPassword(regPassword);
      setRegFullName('');
      setRegNationalId('');
      setRegEmail('');
      setRegPassword('');
    };

    try {
      const res = await api.functions.invoke('createFirstGovernor', payload);
      const result = res?.data ?? res;
      if (result?.success) {
        onSuccess();
        setRegisterLoading(false);
        return;
      }
      setError(result?.message || 'فشل التسجيل');
    } catch (err) {
      if (typeof console !== 'undefined' && console.error) console.error('createFirstGovernor error:', err);
      // بديل: إنشاء العضو مباشرة إن لم يكن هناك أعضاء
      try {
        const members = await api.entities.TeamMember.list();
        if (members.length === 0) {
          await api.entities.TeamMember.create({
            ...payload,
            role: 'governor',
            status: 'active',
          });
          onSuccess();
          setRegisterLoading(false);
          return;
        }
      } catch (_) {}
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      const status = err?.response?.status;
      const detail = status === 404
        ? 'الدالة غير منشورة على هذا التطبيق. انشر الدوال من مجلد المشروع ثم أعد المحاولة.'
        : status === 403
          ? 'الطلب مرفوض. جرّب الطريقة اليدوية أدناه (إضافة سجل من لوحة الإدارة).'
          : msg || 'فشل التسجيل. جرّب الطريقة اليدوية أدناه.';
      setError(detail);
    }
    setRegisterLoading(false);
  };

  if (isAuth === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-green-600 to-blue-600 text-white py-12 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 text-center">
          {currentSetting.logo_url ? (
            <img 
              src={currentSetting.logo_url} 
              alt="شعار المدينة" 
              className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-4 border-white/20"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl font-bold">{currentSetting.logo_text || 'ق'}</span>
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-bold mb-3">{currentSetting.city_name || 'المدينة الصحية'}</h1>
          <p className="text-xl md:text-2xl text-green-100 mb-2">{currentSetting.city_location || 'محافظة قلوة'}</p>
          <p className="text-white/90">نظام إدارة متكامل لتفعيل المدينة الصحية</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Info Section */}
          <div className="space-y-6">
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <MapPin className="w-6 h-6" />
                  عن محافظة قلوة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gradient-to-l from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    محافظة تتبع لمنطقة الباحة وتقع في الجزء الجنوبي الغربي للمنطقة في إقليم تهامة، 
                    بين خطي طول (41/42) وخطي عرض (19/20). تُعد <span className="font-semibold text-blue-700">خامس أكبر تجمع سكاني بالمنطقة</span> بحوالي <span className="font-semibold">31 ألف نسمة</span>. 
                    تتميز بطبيعة جبلية وأودية خصبة، وتشتهر بزراعة الحبوب والفواكه.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <Users className="w-8 h-8 text-blue-600 mb-2" />
                    <p className="text-sm text-gray-500">عدد السكان</p>
                    <p className="text-2xl font-bold text-blue-600">~31,000</p>
                    <p className="text-xs text-gray-500 mt-1">نسمة</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <Target className="w-8 h-8 text-purple-600 mb-2" />
                    <p className="text-sm text-gray-500">الارتفاع</p>
                    <p className="text-2xl font-bold text-purple-600">400</p>
                    <p className="text-xs text-gray-500 mt-1">متر عن البحر</p>
                  </div>
                </div>

                <div className="bg-gradient-to-l from-blue-100 to-green-100 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">📍 المراكز الإدارية (5 مراكز):</h4>
                  <div className="space-y-1 text-sm text-blue-800">
                    <div>• مركز الشعراء</div>
                    <div>• مركز وادي ريم</div>
                    <div>• مركز بالسود وآل سويدي</div>
                    <div>• مركز المحمدية</div>
                    <div>• مركز الشعب</div>
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <h4 className="font-semibold text-amber-900 mb-2">🌤️ المناخ</h4>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    حار صيفاً، معتدل دافئ شتاءً. تُعد <span className="font-semibold">وجهة سياحية شتوية بارزة</span> بفضل طبيعتها الخلابة وجوها الدافئ.
                  </p>
                </div>

                <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                  <h4 className="font-semibold text-teal-900 mb-2">🏛️ المعالم الأثرية والسياحية</h4>
                  <div className="space-y-2 text-sm text-teal-800">
                    <div>• <span className="font-semibold">قرى الخلف والخليف التراثية:</span> اشتهرت بالعلم والعلماء قديماً</div>
                    <div>• <span className="font-semibold">الحصون القديمة:</span> مبنية من الصخور ومزينة بحجارة المرو</div>
                    <div>• <span className="font-semibold">جبل شدا الأعلى:</span> يحتوي على نقوش أثرية</div>
                    <div>• <span className="font-semibold">جبل نيس:</span> يحتوي على نقوش أثرية</div>
                    <div>• <span className="font-semibold">منتزه الفرشة:</span> من أبرز المنتزهات الطبيعية</div>
                  </div>
                </div>

                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                  <h4 className="font-semibold text-emerald-900 mb-2">🌱 الطبيعة والزراعة</h4>
                  <p className="text-sm text-emerald-800 leading-relaxed">
                    تتميز بأوديتها الخضراء ومزارعها، وتشتهر بزراعة الحبوب والفواكه. 
                    كما تشتهر <span className="font-semibold">بزراعة البن السعودي</span> وهو <span className="font-semibold">الأجود والأغلى في السعودية</span>.
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">🎯 رؤية المدينة الصحية</h4>
                  <p className="text-sm text-green-800 leading-relaxed">
                    تفعيل محافظة قلوة كمدينة صحية وفق معايير منظمة الصحة العالمية، 
                    من خلال تحسين جودة الحياة والخدمات الصحية والبيئية والاجتماعية 
                    لجميع السكان، بمشاركة مجتمعية فاعلة.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Login Section */}
          <div className="lg:sticky lg:top-6">
            <Card className="border-2 border-green-200 shadow-xl">
              <CardHeader className="bg-gradient-to-l from-green-50 to-blue-50">
                <CardTitle className="text-center text-2xl">تسجيل الدخول</CardTitle>
                <p className="text-center text-sm text-gray-600">
                  {step === 1 ? 'للموظفين والأعضاء المسجلين فقط' : 'التحقق من البريد الإلكتروني'}
                </p>
              </CardHeader>
              <CardContent className="p-6">
                {step === 1 ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label>رقم الهوية الوطنية</Label>
                      <Input
                        type="text"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        placeholder="أدخل رقم الهوية الوطنية"
                        required
                        className="text-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>كلمة المرور</Label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="أدخل كلمة المرور"
                        required
                        className="text-lg"
                      />
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-l from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-lg py-6"
                    >
                      {loading && <Loader2 className="w-5 h-5 ml-2 animate-spin" />}
                      متابعة
                    </Button>

                    {registerSuccess && (
                      <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg text-sm">
                        {registerSuccess}
                      </div>
                    )}

                    <div className="text-center text-sm text-gray-500 pt-4 border-t">
                      <p>للحصول على حساب، يرجى التواصل مع</p>
                      <p className="font-semibold text-blue-600">مدير النظام</p>
                      <Button
                        type="button"
                        variant="link"
                        className="mt-2 text-amber-700"
                        onClick={() => setShowRegisterGovernor(!showRegisterGovernor)}
                      >
                        {showRegisterGovernor ? 'إخفاء نموذج التسجيل' : 'أول مرة؟ سجّل نفسك كمشرف'}
                      </Button>
                    </div>

                    {showRegisterGovernor && (
                      <div className="mt-4 pt-4 border-t border-amber-200 bg-amber-50/50 rounded-lg p-4">
                        <p className="text-sm font-semibold text-amber-900 mb-3">تسجيل المشرف الأول (مرة واحدة فقط)</p>
                        <form onSubmit={handleRegisterGovernor} className="space-y-3">
                          <div>
                            <Label className="text-xs">الاسم الكامل</Label>
                            <Input value={regFullName} onChange={(e) => setRegFullName(e.target.value)} placeholder="الاسم الكامل" required className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">رقم الهوية الوطنية</Label>
                            <Input value={regNationalId} onChange={(e) => setRegNationalId(e.target.value)} placeholder="رقم الهوية" required className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">البريد الإلكتروني</Label>
                            <Input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="example@email.com" required className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">كلمة المرور</Label>
                            <Input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="كلمة المرور" required className="mt-1" />
                          </div>
                          <Button type="submit" disabled={registerLoading} variant="secondary" className="w-full border-amber-300 text-amber-900 hover:bg-amber-100">
                            {registerLoading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                            تسجيلني كمشرف
                          </Button>
                          <div className="mt-3 pt-3 border-t border-amber-200 text-xs text-amber-900">
                            <p className="font-semibold mb-1">إن لم ينجح: أضف نفسك من لوحة الإدارة</p>
                            <ol className="list-decimal list-inside space-y-0.5 pr-1">
                              <li>ادخل إلى لوحة الإدارة وافتح تطبيقك.</li>
                              <li>من القائمة: Data (البيانات) → TeamMember.</li>
                              <li>Add row / إضافة سطر.</li>
                              <li>املأ: full_name، national_id، email، password، role = governor، status = active.</li>
                              <li>احفظ ثم جرّب تسجيل الدخول هنا بنفس رقم الهوية وكلمة المرور.</li>
                            </ol>
                          </div>
                        </form>
                      </div>
                    )}
                  </form>
                ) : (
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800 text-center">
                      <p className="font-semibold mb-1">📧 تم إرسال رمز التحقق</p>
                      <p>إلى بريدك الإلكتروني: {memberEmail}</p>
                    </div>

                    {displayedVerificationCode && (
                      <div className="bg-amber-50 border border-amber-300 p-4 rounded-lg text-center">
                        <p className="text-sm text-amber-900 mb-1">وضع محلي — رمز التحقق:</p>
                        <p className="text-2xl font-bold text-amber-700 tracking-widest">{displayedVerificationCode}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>رمز التحقق (6 أرقام)</Label>
                      <Input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="أدخل رمز التحقق"
                        required
                        maxLength={6}
                        className="text-lg text-center tracking-widest"
                      />
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading || verificationCode.length !== 6}
                      className="w-full bg-gradient-to-l from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-lg py-6"
                    >
                      {loading && <Loader2 className="w-5 h-5 ml-2 animate-spin" />}
                      تحقق ودخول
                    </Button>

                    <div className="flex items-center justify-between text-sm pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setStep(1);
                          setVerificationCode('');
                          setDisplayedVerificationCode('');
                          setError('');
                        }}
                        className="text-gray-600"
                      >
                        رجوع
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleResendCode}
                        disabled={resendTimer > 0}
                        className="text-blue-600"
                      >
                        {resendTimer > 0 ? `إعادة الإرسال (${resendTimer}ث)` : 'إعادة إرسال الرمز'}
                      </Button>
                    </div>

                    <div className="text-center text-xs text-gray-500 pt-2 border-t">
                      <p>الرمز صالح لمدة 5 دقائق</p>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card className="mt-4 bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center text-sm text-blue-800">
                <p className="font-semibold mb-1">💡 هل نسيت كلمة المرور؟</p>
                <p>يرجى التواصل مع مسؤول النظام لإعادة تعيينها</p>
              </CardContent>
            </Card>
          </div>
        </div>


      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-300">نظام المدينة الصحية - محافظة قلوة</p>
          <p className="text-sm text-gray-400 mt-2">© {new Date().getFullYear()} جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
}