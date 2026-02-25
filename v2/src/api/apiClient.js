import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { localBackend } from '@/api/localBackend';
import { supabaseBackend } from '@/api/supabaseBackend';
import { apiBackend } from '@/api/apiBackend';

const { appId, token, functionsVersion, appBaseUrl, useLocalBackend, useSupabaseBackend, apiUrl } = appParams;

let api;

// في V2 نعطي أولوية للخلفية المحلية لتفادي أي فشل fetch في بيئات التطوير المحلية.
const isLocalHostRuntime = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
const isDevRuntime = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV === true;
const preferLocalBackend = isDevRuntime || useLocalBackend || isLocalHostRuntime;

if (preferLocalBackend) {
  api = localBackend;
} else if (apiUrl) {
  api = apiBackend;
} else if (useSupabaseBackend && appParams.supabaseUrl && appParams.supabaseAnonKey) {
  api = supabaseBackend;
} else {
  const hasValidBase = typeof appBaseUrl === 'string' && appBaseUrl.startsWith('http') && !appBaseUrl.includes('your_backend');
  const serverUrl = hasValidBase ? appBaseUrl.replace(/\/$/, '') : 'https://base44.app';
  const hasValidAppId = typeof appId === 'string' && appId.length > 10 && !appId.includes('your_app');
  if (!hasValidAppId && typeof window !== 'undefined') {
    console.warn('[التطبيق] ضع في .env.local: VITE_BASE44_APP_ID و VITE_BASE44_APP_BASE_URL ثم أعد تشغيل التطبيق.');
  }
  api = createClient({
    appId: appId || 'unknown',
    token,
    functionsVersion,
    serverUrl,
    requiresAuth: false,
    appBaseUrl: hasValidBase ? appBaseUrl : undefined
  });
}

/** تحقق أن دوال الخلفية (سيرفر التطبيق) مفعلة */
export function isBackendFunctionsEnabled() {
  return api === apiBackend;
}

export { api };
