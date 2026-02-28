import React, { createContext, useState, useContext, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

const SEED_MARKER_KEY = 'app_seed_completed_v1';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const useSupabaseBackend = appParams.useSupabaseBackend && appParams.supabaseUrl && appParams.supabaseAnonKey;
      const useServerBackend = !!appParams.apiUrl;
      const useManagedBackend = appParams.useLocalBackend || useSupabaseBackend || useServerBackend;
      const allowSeedOnServer = appParams.allowServerReseed === true;
      const shouldRunClientSeed =
        appParams.useLocalBackend ||
        useSupabaseBackend ||
        (useServerBackend && allowSeedOnServer);
      const seedNamespace = useSupabaseBackend
        ? 'supabase'
        : appParams.useLocalBackend
          ? 'local'
          : useServerBackend
            ? 'server'
            : 'unknown';
      const seedKey = `${SEED_MARKER_KEY}_${seedNamespace}`;
      const seedAlreadyCompleted = (() => {
        try {
          return typeof localStorage !== 'undefined' && localStorage.getItem(seedKey) === '1';
        } catch {
          return false;
        }
      })();

      if (useManagedBackend) {
        setAppPublicSettings({});
        setIsLoadingPublicSettings(false);
        // حماية الإنتاج: لا نشغّل بذر البيانات على السيرفر إلا بتفعيل صريح.
        if (shouldRunClientSeed && !seedAlreadyCompleted) {
          try {
            await Promise.resolve(api.seedDefaultGovernorIfNeeded?.() ?? null);
            await Promise.resolve(api.seedAxesAndStandardsIfNeeded?.());
            await Promise.resolve(api.seedCommitteesTeamInitiativesTasksIfNeeded?.());
            try {
              if (typeof localStorage !== 'undefined') localStorage.setItem(seedKey, '1');
            } catch {}
          } catch (e) {
            if (typeof console !== 'undefined') console.warn('Seed failed:', e);
          }
        } else if (useServerBackend && typeof console !== 'undefined') {
          console.info('[Auth] Server seed is disabled by default (set VITE_ALLOW_SERVER_RESEED=true only when explicitly needed).');
        }
        // الدخول فقط عبر نموذج تسجيل الدخول أو جلسة محفوظة سابقاً (لا دخول تلقائي)
        try {
          const currentUser = await api.auth.me();
          setUser(currentUser);
          setIsAuthenticated(true);
        } catch {
          setUser(null);
          setIsAuthenticated(false);
          setAuthError({ type: 'auth_required', message: 'Authentication required' });
        }
        setIsLoadingAuth(false);
        return;
      }

      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId },
        token: appParams.token,
        interceptResponses: true
      });

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({ type: 'auth_required', message: 'Authentication required' });
          } else if (reason === 'user_not_registered') {
            setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
          } else {
            setAuthError({ type: reason, message: appError.message });
          }
        } else {
          setAuthError({ type: 'unknown', message: appError.message || 'Failed to load app' });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await api.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    api.auth.logout();
    if (shouldRedirect && typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    api.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
