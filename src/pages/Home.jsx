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
import { Loader2, MapPin, Users, Target, Heart, Leaf, Shield, ArrowLeft, Building2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
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
  const isEmailVerificationTemporarilyDisabled = appParams.disableEmailVerification === true;
  const apiBaseUrl = (appParams.apiUrl || '').replace(/\/$/, '');

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

  React.useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const completeLogin = (member) => {
    if (!member) return false;
    const navItems = getNavItemsForRole(member.role || 'volunteer');
    const firstPage = navItems[0]?.name || 'Dashboard';
    const userEmail = member.email || (member.role === 'governor' ? 'admin@qeelwah.com' : `member-${member.national_id}@local`);
    if (typeof api.auth.setUser === 'function') {
      api.auth.setUser({
        email: userEmail,
        full_name: member.full_name,
        user_role: member.role === 'governor' ? 'admin' : 'user',
        national_id: member.national_id,
      });
      window.location.href = createPageUrl(firstPage);
    } else {
      api.auth.redirectToLogin(createPageUrl(firstPage));
    }
    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (nationalId.length !== 10) {
        setError('رقم الهوية يجب أن يتكون من 10 أرقام');
        setLoading(false);
        return;
      }
      const members = await api.entities.TeamMember.list();
      const member = members.find(m => m.national_id === nationalId);
      
      if (!member) {
        setError('رقم الهوية الوطنية غير مسجل في النظام');
        setLoading(false);
        return;
      }

      if (member.password !== password) {
        setError('كلمة المرور غير صحيحة');
        setLoading(false);
        return;
      }

      if (isEmailVerificationTemporarilyDisabled) {
        completeLogin(member);
        setLoading(false);
        return;
      }

      if (!member.email) {
        setError('البريد الإلكتروني غير مسجل. يرجى التواصل مع الإدارة.');
        setLoading(false);
        return;
      }

      setMemberEmail(member.email);
      const codeSent = await sendVerificationCodeEmail(member.email);
      if (codeSent) {
        setStep(2);
        setResendTimer(60);
      }
      setLoading(false);
    } catch (err) {
      if (typeof console !== 'undefined') console.error('[Login] failed:', err);
      const msg = (err && (err.message || err.error_description || err.details)) || 'حدث خطأ. يرجى المحاولة مرة أخرى.';
      setError(String(msg));
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
      const result = await api.functions.verifyCode({ email: memberEmail, code: verificationCode });
      if (result.success) {
        const members = await api.entities.TeamMember.list();
        const member = members.find(m => m.national_id === nationalId);
        if (member) {
          completeLogin(member);
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

    if (regNationalId.trim().length !== 10) {
      setError('رقم الهوية يجب أن يتكون من 10 أرقام');
      setRegisterLoading(false);
      return;
    }

    const onSuccess = () => {
      setRegisterSuccess('تم تسجيلك كمشرف عام. يمكنك الآن تسجيل الدخول.');
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
      try {
        const members = await api.entities.TeamMember.list();
        if (members.length === 0) {
          await api.entities.TeamMember.create({ ...payload, role: 'governor', status: 'active' });
          onSuccess();
          setRegisterLoading(false);
          return;
        }
      } catch (_) {}
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      const status = err?.response?.status;
      const detail = status === 404
        ? 'الدالة غير منشورة. انشر الدوال ثم أعد المحاولة.'
        : status === 403
          ? 'الطلب مرفوض. جرّب الطريقة اليدوية أدناه.'
          : msg || 'فشل التسجيل. جرّب الطريقة اليدوية أدناه.';
      setError(detail);
    }
    setRegisterLoading(false);
  };

  if (isAuth === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // إذا كان المستخدم مسجل دخول بالفعل، انتقل للوحة الرئيسية
  if (isAuth === true && currentUser) {
    const navItems = getNavItemsForRole(currentUser.user_role === 'admin' ? 'governor' : (currentUser.role || 'volunteer'));
    const firstPage = navItems[0]?.name || 'Dashboard';
    window.location.href = createPageUrl(firstPage);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const features = [
    { icon: Heart, title: 'الصحة والبيئة', desc: 'معايير صحية وبيئية دولية معتمدة من منظمة الصحة العالمية', color: 'text-primary' },
    { icon: Target, title: '80 معياراً دولياً', desc: '9 محاور رئيسية تغطي جميع جوانب المدينة الصحية', color: 'text-secondary' },
    { icon: Shield, title: 'متابعة شاملة', desc: 'نظام متكامل لإدارة المهام والأدلة والتقارير', color: 'text-secondary' },
    { icon: Leaf, title: 'التنمية المستدامة', desc: 'تطوير مستدام لجودة الحياة والخدمات المجتمعية', color: 'text-primary' },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 gradient-primary" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.12)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08)_0%,transparent_50%)]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[85vh] py-12 lg:py-0">
            
            {/* Left: Info */}
            <div className="text-white animate-in order-2 lg:order-1">
              <div className="flex items-center gap-3 mb-6">
                {currentSetting.logo_url ? (
                  <img src={currentSetting.logo_url} alt="شعار" className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-xl" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-xl">
                    <span className="text-3xl font-bold">{currentSetting.logo_text || 'ق'}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm text-white/60 mb-0.5">نظام إدارة</p>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                    {currentSetting.city_name || 'المدينة الصحية'}
                  </h1>
                </div>
              </div>
              
              <p className="text-lg md:text-xl text-white/80 mb-3 leading-relaxed">
                {currentSetting.city_location || 'محافظة قلوة'} — منطقة الباحة
              </p>
              <p className="text-white/60 text-base leading-relaxed mb-8 max-w-lg">
                نظام إدارة متكامل لتفعيل المدينة الصحية وفق معايير منظمة الصحة العالمية، 
                يتابع الإنجاز عبر 9 محاور و80 معياراً دولياً.
              </p>

              {/* Feature cards */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                {features.map((f, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 hover:bg-white/15 transition-colors">
                    <f.icon className={`w-5 h-5 mb-2 ${f.color}`} />
                    <p className="text-sm font-semibold text-white">{f.title}</p>
                    <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-3xl font-bold text-white">~31K</p>
                  <p className="text-xs text-white/50">نسمة</p>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div>
                  <p className="text-3xl font-bold text-white">80</p>
                  <p className="text-xs text-white/50">معيار دولي</p>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div>
                  <p className="text-3xl font-bold text-white">9</p>
                  <p className="text-xs text-white/50">محاور رئيسية</p>
                </div>
              </div>
            </div>

            {/* Right: Login Form */}
            <div className="order-1 lg:order-2 animate-in" style={{ animationDelay: '150ms' }}>
              <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur-xl max-w-md mx-auto lg:mx-0 lg:mr-auto">
                <CardHeader className="text-center pb-4">
                  <div className="w-14 h-14 rounded-2xl gradient-primary mx-auto mb-3 flex items-center justify-center shadow-lg">
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                  <CardTitle className="text-xl">تسجيل الدخول</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {step === 1 ? 'للموظفين والأعضاء المسجلين' : 'التحقق من البريد الإلكتروني'}
                  </p>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  {step === 1 ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                      {isEmailVerificationTemporarilyDisabled && (
                        <div className="bg-warning/10 border border-warning/30 text-warning-foreground p-3 rounded-xl text-sm">
                          تم تعطيل التحقق بالبريد مؤقتاً أثناء مرحلة البرمجة.
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">رقم الهوية الوطنية</Label>
                        <Input
                          type="text"
                          value={nationalId}
                          onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="أدخل رقم الهوية (10 أرقام)"
                          required
                          maxLength={10}
                          inputMode="numeric"
                          className="h-11 text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">كلمة المرور</Label>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="أدخل كلمة المرور"
                          required
                          className="h-11 text-base"
                        />
                      </div>

                      {error && (
                        <div className="bg-destructive/10 border border-destructive/30 text-destructive p-3 rounded-xl text-sm flex items-start gap-2">
                          <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}

                      {registerSuccess && (
                        <div className="bg-success/10 border border-success/30 text-success p-3 rounded-xl text-sm">
                          {registerSuccess}
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 text-base font-semibold gradient-primary hover:opacity-90 transition-opacity"
                      >
                        {loading && <Loader2 className="w-5 h-5 ml-2 animate-spin" />}
                        {isEmailVerificationTemporarilyDisabled ? 'دخول مباشر' : 'متابعة'}
                        {!loading && <ArrowLeft className="w-4 h-4 mr-2" />}
                      </Button>

                      <div className="text-center text-sm text-muted-foreground pt-3 border-t">
                        <p>للحصول على حساب، تواصل مع <span className="font-semibold text-primary">مدير النظام</span></p>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="mt-1 text-warning"
                          onClick={() => setShowRegisterGovernor(!showRegisterGovernor)}
                        >
                          {showRegisterGovernor ? 'إخفاء نموذج التسجيل' : 'أول مرة؟ سجّل كمشرف'}
                        </Button>
                      </div>

                      {showRegisterGovernor && (
                        <div className="mt-3 pt-3 border-t bg-muted/50 rounded-xl p-4">
                          <p className="text-sm font-semibold mb-3">تسجيل المشرف الأول</p>
                          <form onSubmit={handleRegisterGovernor} className="space-y-3">
                            <div>
                              <Label className="text-xs">الاسم الكامل</Label>
                              <Input value={regFullName} onChange={(e) => setRegFullName(e.target.value)} placeholder="الاسم الكامل" required className="mt-1 h-9" />
                            </div>
                            <div>
                              <Label className="text-xs">رقم الهوية الوطنية</Label>
                              <Input value={regNationalId} onChange={(e) => setRegNationalId(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 أرقام" required maxLength={10} inputMode="numeric" className="mt-1 h-9" />
                            </div>
                            <div>
                              <Label className="text-xs">البريد الإلكتروني</Label>
                              <Input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="example@email.com" required className="mt-1 h-9" />
                            </div>
                            <div>
                              <Label className="text-xs">كلمة المرور</Label>
                              <Input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="كلمة المرور" required className="mt-1 h-9" />
                            </div>
                            <Button type="submit" disabled={registerLoading} variant="secondary" size="sm" className="w-full">
                              {registerLoading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                              تسجيلني كمشرف
                            </Button>
                          </form>
                        </div>
                      )}
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyCode} className="space-y-4">
                      <div className="bg-info/10 border border-info/30 p-4 rounded-xl text-sm text-center">
                        <p className="font-semibold mb-1">📧 تم إرسال رمز التحقق</p>
                        <p className="text-muted-foreground">إلى بريدك: {memberEmail}</p>
                      </div>

                      {displayedVerificationCode && (
                        <div className="bg-warning/10 border border-warning/30 p-4 rounded-xl text-center">
                          <p className="text-sm text-muted-foreground mb-1">رمز التحقق (وضع التطوير):</p>
                          <p className="text-2xl font-bold text-warning tracking-widest">{displayedVerificationCode}</p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>رمز التحقق (4 أرقام)</Label>
                        <Input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="أدخل رمز التحقق"
                          required
                          maxLength={6}
                          className="h-12 text-xl text-center tracking-[0.5em]"
                        />
                      </div>

                      {error && (
                        <div className="bg-destructive/10 border border-destructive/30 text-destructive p-3 rounded-xl text-sm">
                          {error}
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={loading || verificationCode.length !== 4}
                        className="w-full h-12 text-base gradient-primary hover:opacity-90 transition-opacity"
                      >
                        {loading && <Loader2 className="w-5 h-5 ml-2 animate-spin" />}
                        تحقق ودخول
                      </Button>

                      <div className="flex items-center justify-between text-sm pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => { setStep(1); setVerificationCode(''); setDisplayedVerificationCode(''); setError(''); }}
                          className="text-muted-foreground"
                        >
                          رجوع
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleResendCode}
                          disabled={resendTimer > 0}
                          className="text-primary"
                        >
                          {resendTimer > 0 ? `إعادة الإرسال (${resendTimer}ث)` : 'إعادة إرسال الرمز'}
                        </Button>
                      </div>

                      <p className="text-center text-xs text-muted-foreground pt-2 border-t">الرمز صالح لمدة 5 دقائق</p>
                    </form>
                  )}
                </CardContent>
              </Card>

              {/* Forgot password hint */}
              <div className="max-w-md mx-auto lg:mx-0 lg:mr-auto mt-3">
                <div className="text-center text-sm text-white/50 bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                  💡 نسيت كلمة المرور؟ تواصل مع مسؤول النظام
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">نظام المدينة الصحية — {currentSetting.city_location || 'محافظة قلوة'}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">© {new Date().getFullYear()} جميع الحقوق محفوظة لـ علي الشهري</p>
        </div>
      </footer>
    </div>
  );
}