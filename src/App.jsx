import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Suspense, useEffect, useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { getHostCityTemplate } from '@/lib/city-hosts';

const MINISTRY_SELECTED_CITY_KEY = 'ministry_selected_city_id';

const { Pages, Layout, mainPage } = pagesConfig;
// على الدومين الرئيسي (وزارة) الصفحة الرئيسية هي MinistryDashboard، على سب دومينات المدن هي Dashboard
const _hostCity = getHostCityTemplate();
const _isMinistryHost = _hostCity?.isMinistry === true;
const mainPageKey = _isMinistryHost ? 'MinistryDashboard' : (mainPage ?? Object.keys(Pages)[0]);
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;
const HomePage = Pages['Home'];

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const [selectedMinistryCityId, setSelectedMinistryCityId] = useState(() => {
    try {
      return localStorage.getItem(MINISTRY_SELECTED_CITY_KEY) || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    const handleMinistryCitySelected = (event) => {
      const nextId = String(event?.detail?.cityId || '');
      setSelectedMinistryCityId(nextId);
    };
    window.addEventListener('ministry-city-selected', handleMinistryCitySelected);
    return () => window.removeEventListener('ministry-city-selected', handleMinistryCitySelected);
  }, []);

  const hostCity = getHostCityTemplate();
  const isMinistryHost = hostCity?.isMinistry === true;
  const shouldLockToMinistryDashboard = isMinistryHost && !selectedMinistryCityId;

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // عند طلب تسجيل الدخول: نعرض صفحة الرئيسية (تسجيل الدخول بالهوية وكلمة المرور) داخل التطبيق
  if (authError?.type === 'auth_required') {
    return (
      <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div></div>}>
        <Routes>
          <Route path="*" element={
            HomePage
              ? <HomePage />
              : (
                <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
                  <p className="text-muted-foreground">يجب تسجيل الدخول. انتقل إلى الصفحة الرئيسية.</p>
                </div>
              )
          } />
        </Routes>
      </Suspense>
    );
  }

  // Handle other auth errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  // Render the main app
  return (
    <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>}>
      <Routes>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              shouldLockToMinistryDashboard && path !== 'MinistryDashboard'
                ? <Navigate to="/MinistryDashboard" replace />
                : (
                  <LayoutWrapper currentPageName={path}>
                    <Page />
                  </LayoutWrapper>
                )
            }
          />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
