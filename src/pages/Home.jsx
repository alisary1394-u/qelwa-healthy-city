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
import { Loader2, MapPin, Users, Target, Heart, Leaf, Shield, ArrowLeft, ArrowRight, Building2, Globe } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { changeLanguage, isRTL } from '@/i18n';

export default function Home() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const [displayedVerificationCode, setDisplayedVerificationCode] = useState('');
  const [pendingAuth, setPendingAuth] = useState(null);
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

  const completeLogin = (member, token) => {
    if (!member) return false;
    const navItems = getNavItemsForRole(member.role || 'volunteer');
    const firstPage = navItems[0]?.name || 'Dashboard';
    const userEmail = member.email || (member.role === 'governor' ? 'admin@qeelwah.com' : `member-${member.national_id}@local`);
    if (typeof api.auth.setUser === 'function') {
      api.auth.setUser({
        email: userEmail,
        full_name: member.full_name,
        user_role: member.role === 'governor' ? 'admin' : 'user',
        role: member.role,
        national_id: member.national_id,
      }, token);
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
        setError(t('login.errors.idLength'));
        setLoading(false);
        return;
      }
      const { user, token } = await api.auth.login(nationalId, password);

      if (isEmailVerificationTemporarilyDisabled) {
        completeLogin(user, token);
        setLoading(false);
        return;
      }

      const email = user.email;
      if (!email) {
        setError(t('login.errors.noEmail'));
        setLoading(false);
        return;
      }

      setPendingAuth({ user, token });
      setMemberEmail(email);
      const codeSent = await sendVerificationCodeEmail(email);
      if (codeSent) {
        setStep(2);
        setResendTimer(60);
      }
      setLoading(false);
    } catch (err) {
      if (typeof console !== 'undefined') console.error('[Login] failed:', err);
      const msg = (err && (err.message || err.error_description || err.details)) || t('login.errors.generalError');
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
        setError(result.message || t('login.errors.sendCodeFailed'));
        return false;
      }
      return true;
    } catch (err) {
      setError(t('login.errors.sendCodeRetry'));
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
        if (pendingAuth) {
          completeLogin(pendingAuth.user, pendingAuth.token);
        } else {
          setError(t('login.errors.userNotRegistered'));
          setLoading(false);
        }
      } else {
        setError(result.message || t('login.errors.wrongCode'));
        setLoading(false);
      }
    } catch (err) {
      setError(t('login.errors.verifyError'));
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    setError('');
    await sendVerificationCodeEmail(memberEmail);
    setResendTimer(60);
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
    { icon: Heart, title: t('home.features.health'), desc: t('home.features.healthDesc'), color: 'text-primary' },
    { icon: Target, title: t('home.features.standards'), desc: t('home.features.standardsDesc'), color: 'text-secondary' },
    { icon: Shield, title: t('home.features.tracking'), desc: t('home.features.trackingDesc'), color: 'text-secondary' },
    { icon: Leaf, title: t('home.features.sustainability'), desc: t('home.features.sustainabilityDesc'), color: 'text-primary' },
  ];

  const ArrowIcon = rtl ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-background" dir={rtl ? 'rtl' : 'ltr'}>
      {/* Language Selector - Top Right */}
      <div className="absolute top-4 z-50" style={{ [rtl ? 'left' : 'right']: '1rem' }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
          className="bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 border border-white/20 gap-2 rounded-xl"
        >
          <Globe className="w-4 h-4" />
          <span>{i18n.language === 'ar' ? 'English' : 'العربية'}</span>
        </Button>
      </div>
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
                  <img src={currentSetting.logo_url} alt={t('common.name')} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-xl" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-xl">
                    <span className="text-3xl font-bold">{currentSetting.logo_text || (rtl ? 'ق' : 'Q')}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm text-white/60 mb-0.5">{t('home.systemManagement')}</p>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                    {currentSetting.city_name || t('home.healthyCity')}
                  </h1>
                </div>
              </div>
              
              <p className="text-lg md:text-xl text-white/80 mb-3 leading-relaxed">
                {currentSetting.city_location || (rtl ? 'محافظة قلوة' : 'Qelwa Governorate')} — {t('home.bahaRegion')}
              </p>
              <p className="text-white/60 text-base leading-relaxed mb-8 max-w-lg">
                {t('home.systemDescription')}
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
                  <p className="text-xs text-white/50">{t('home.stats.population')}</p>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div>
                  <p className="text-3xl font-bold text-white">80</p>
                  <p className="text-xs text-white/50">{t('home.stats.internationalStandards')}</p>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div>
                  <p className="text-3xl font-bold text-white">9</p>
                  <p className="text-xs text-white/50">{t('home.stats.mainAxes')}</p>
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
                  <CardTitle className="text-xl">{t('login.title')}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {step === 1 ? t('login.subtitle') : t('login.emailVerification')}
                  </p>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  {step === 1 ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                      {isEmailVerificationTemporarilyDisabled && (
                        <div className="bg-warning/10 border border-warning/30 text-warning-foreground p-3 rounded-xl text-sm">
                          {t('login.verificationDisabled')}
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{t('login.nationalId')}</Label>
                        <Input
                          type="text"
                          value={nationalId}
                          onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder={t('login.nationalIdPlaceholder')}
                          required
                          maxLength={10}
                          inputMode="numeric"
                          className="h-11 text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{t('login.password')}</Label>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={t('login.passwordPlaceholder')}
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

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 text-base font-semibold gradient-primary hover:opacity-90 transition-opacity"
                      >
                        {loading && <Loader2 className={`w-5 h-5 ${rtl ? 'ml-2' : 'mr-2'} animate-spin`} />}
                        {isEmailVerificationTemporarilyDisabled ? t('login.directLogin') : t('login.loginButton')}
                        {!loading && <ArrowIcon className={`w-4 h-4 ${rtl ? 'mr-2' : 'ml-2'}`} />}
                      </Button>

                      <div className="text-center text-sm text-muted-foreground pt-3 border-t">
                        <p>{t('login.contactAdmin')} <span className="font-semibold text-primary">{t('login.systemAdmin')}</span></p>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyCode} className="space-y-4">
                      <div className="bg-info/10 border border-info/30 p-4 rounded-xl text-sm text-center">
                        <p className="font-semibold mb-1">{t('login.verificationSent')}</p>
                        <p className="text-muted-foreground">{t('login.verificationSentTo')} {memberEmail}</p>
                      </div>

                      {displayedVerificationCode && (
                        <div className="bg-warning/10 border border-warning/30 p-4 rounded-xl text-center">
                          <p className="text-sm text-muted-foreground mb-1">{t('login.devCode')}</p>
                          <p className="text-2xl font-bold text-warning tracking-widest">{displayedVerificationCode}</p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>{t('login.verificationCode')}</Label>
                        <Input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder={t('login.verificationCodePlaceholder')}
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
                        {loading && <Loader2 className={`w-5 h-5 ${rtl ? 'ml-2' : 'mr-2'} animate-spin`} />}
                        {t('login.verifyAndLogin')}
                      </Button>

                      <div className="flex items-center justify-between text-sm pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => { setStep(1); setVerificationCode(''); setDisplayedVerificationCode(''); setError(''); }}
                          className="text-muted-foreground"
                        >
                          {t('common.back')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleResendCode}
                          disabled={resendTimer > 0}
                          className="text-primary"
                        >
                          {resendTimer > 0 ? t('login.resendIn', { seconds: resendTimer }) : t('login.resendCode')}
                        </Button>
                      </div>

                      <p className="text-center text-xs text-muted-foreground pt-2 border-t">{t('login.codeValid')}</p>
                    </form>
                  )}
                </CardContent>
              </Card>

              {/* Forgot password hint */}
              <div className="max-w-md mx-auto lg:mx-0 lg:mr-auto mt-3">
                <div className="text-center text-sm text-white/50 bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                  {t('login.forgotPassword')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">{t('home.footer')} — {currentSetting.city_location || (rtl ? 'محافظة قلوة' : 'Qelwa Governorate')}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{t('home.copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  );
}