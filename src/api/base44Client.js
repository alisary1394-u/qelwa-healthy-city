import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { localBackend } from '@/api/localBackend';
import { supabaseBackend } from '@/api/supabaseBackend';
import { apiBackend } from '@/api/apiBackend';

const { appId, token, functionsVersion, appBaseUrl, useLocalBackend, useSupabaseBackend, apiUrl } = appParams;

let base44;

// دوال الخلفية (Backend Functions): عند وجود apiUrl نستخدم سيرفر التطبيق (apiBackend) — sendVerificationCode, verifyCode, createFirstGovernor...
if (apiUrl) {
  base44 = apiBackend;
} else if (useSupabaseBackend && appParams.supabaseUrl && appParams.supabaseAnonKey) {
  base44 = supabaseBackend;
} else if (useLocalBackend) {
  base44 = localBackend;
} else {
  const hasValidBase = typeof appBaseUrl === 'string' && appBaseUrl.startsWith('http') && !appBaseUrl.includes('your_backend');
  const serverUrl = hasValidBase ? appBaseUrl.replace(/\/$/, '') : 'https://base44.app';
  const hasValidAppId = typeof appId === 'string' && appId.length > 10 && !appId.includes('your_app');
  if (!hasValidAppId && typeof window !== 'undefined') {
    console.warn('[Base44] ضع في .env.local: VITE_BASE44_APP_ID و VITE_BASE44_APP_BASE_URL ثم أعد تشغيل التطبيق.');
  }
  base44 = createClient({
    appId: appId || 'unknown',
    token,
    functionsVersion,
    serverUrl,
    requiresAuth: false,
    appBaseUrl: hasValidBase ? appBaseUrl : undefined
  });
}

/** تحقق أن دوال الخلفية (سيرفر التطبيق) مفعلة — sendVerificationCode, verifyCode, createFirstGovernor */
export function isBackendFunctionsEnabled() {
  return base44 === apiBackend;
}

export { base44 };
