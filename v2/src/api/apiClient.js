import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { localBackend } from '@/api/localBackend';
import { supabaseBackend } from '@/api/supabaseBackend';
import { apiBackend } from '@/api/apiBackend';

const { appId, token, functionsVersion, appBaseUrl, useLocalBackend, useSupabaseBackend, apiUrl } = appParams;

function isObjectLike(value) {
  return value !== null && typeof value === 'object';
}

function isNetworkError(error) {
  if (!error) return false;
  const message = String(error?.message || error).toLowerCase();
  if (error?.code === 'ERR_NETWORK') return true;
  if (typeof error?.status === 'number' && error.status > 0) return false;
  return (
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('network error') ||
    message.includes('network request failed') ||
    message.includes('load failed') ||
    message.includes('networkerror')
  );
}

/**
 * يغلّف أي Backend خارجي بحيث لو حدث خطأ شبكة يتحول تلقائياً إلى localBackend.
 * هذا يمنع توقف تسجيل الدخول في البيئات المحلية عند وجود API URL قديم أو غير متاح.
 */
function createNetworkFallbackProxy(primary, fallback, path = []) {
  return new Proxy({}, {
    get(_, prop) {
      const primaryValue = primary?.[prop];
      const fallbackValue = fallback?.[prop];
      const propPath = [...path, String(prop)];

      if (typeof primaryValue === 'function' || typeof fallbackValue === 'function') {
        return async (...args) => {
          if (typeof primaryValue === 'function') {
            try {
              return await primaryValue.apply(primary, args);
            } catch (error) {
              if (!isNetworkError(error) || typeof fallbackValue !== 'function') {
                throw error;
              }
              if (typeof console !== 'undefined' && console.warn) {
                console.warn(`[v2] network fallback -> localBackend (${propPath.join('.')})`, error);
              }
            }
          }

          if (typeof fallbackValue === 'function') {
            return await fallbackValue.apply(fallback, args);
          }

          const missingError = new Error(`API method not available: ${propPath.join('.')}`);
          missingError.code = 'API_METHOD_MISSING';
          throw missingError;
        };
      }

      if (isObjectLike(primaryValue) || isObjectLike(fallbackValue)) {
        return createNetworkFallbackProxy(
          isObjectLike(primaryValue) ? primaryValue : {},
          isObjectLike(fallbackValue) ? fallbackValue : {},
          propPath
        );
      }

      return primaryValue ?? fallbackValue;
    }
  });
}

let api;
let primaryApi = localBackend;

// في V2 نعطي أولوية للخلفية المحلية لتفادي أي فشل fetch في بيئات التطوير المحلية.
const isLocalHostRuntime = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
const isDevRuntime = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV === true;
const preferLocalBackend = isDevRuntime || useLocalBackend || isLocalHostRuntime;

if (preferLocalBackend) {
  primaryApi = localBackend;
} else if (apiUrl) {
  primaryApi = apiBackend;
} else if (useSupabaseBackend && appParams.supabaseUrl && appParams.supabaseAnonKey) {
  primaryApi = supabaseBackend;
} else {
  const hasValidBase = typeof appBaseUrl === 'string' && appBaseUrl.startsWith('http') && !appBaseUrl.includes('your_backend');
  const serverUrl = hasValidBase ? appBaseUrl.replace(/\/$/, '') : 'https://base44.app';
  const hasValidAppId = typeof appId === 'string' && appId.length > 10 && !appId.includes('your_app');
  if (!hasValidAppId && typeof window !== 'undefined') {
    console.warn('[التطبيق] ضع في .env.local: VITE_BASE44_APP_ID و VITE_BASE44_APP_BASE_URL ثم أعد تشغيل التطبيق.');
  }
  primaryApi = createClient({
    appId: appId || 'unknown',
    token,
    functionsVersion,
    serverUrl,
    requiresAuth: false,
    appBaseUrl: hasValidBase ? appBaseUrl : undefined
  });
}

api = primaryApi === localBackend
  ? localBackend
  : createNetworkFallbackProxy(primaryApi, localBackend);

/** تحقق أن دوال الخلفية (سيرفر التطبيق) مفعلة */
export function isBackendFunctionsEnabled() {
  return primaryApi === apiBackend;
}

export { api };
