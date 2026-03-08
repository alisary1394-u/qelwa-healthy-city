const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => {
	return String(str || '')
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
		.toLowerCase();
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
	if (getAppParamValue("clear_access_token") === 'true') {
		storage.removeItem('base44_access_token');
		storage.removeItem('token');
	}
	const safeHref = typeof window !== 'undefined' && window.location ? window.location.href : '';
	const explicitApiUrl = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
	const databaseUrl = String(import.meta.env.VITE_DATABASE_URL || import.meta.env.VITE_WEB_SYNC_URL || '').trim().replace(/\/+$/, '');
	const forceDatabaseBackend = import.meta.env.VITE_FORCE_DATABASE_BACKEND === 'true';
	const prodSameOrigin = import.meta.env.PROD && typeof window !== 'undefined' ? window.location.origin : '';
	const backendFunctionsOrigin =
		import.meta.env.VITE_USE_BACKEND_FUNCTIONS === 'true' && typeof window !== 'undefined' && window.location
			? window.location.origin
			: '';
	const resolvedApiUrl =
		explicitApiUrl ||
		(forceDatabaseBackend ? (databaseUrl || 'https://www.qeelwah.com') : '') ||
		prodSameOrigin ||
		backendFunctionsOrigin;
	const envUseLocalBackend = import.meta.env.VITE_USE_LOCAL_BACKEND === 'true';
	return {
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: safeHref }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
		useLocalBackend: envUseLocalBackend && !resolvedApiUrl,
		useSupabaseBackend: import.meta.env.VITE_USE_SUPABASE_BACKEND === 'true',
		supabaseUrl: String(import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, ''),
		supabaseAnonKey: String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim(),
		// التحقق بالبريد مُفعَّل افتراضياً.
		// لتعطيله مؤقتاً (أثناء البرمجة مثلاً) اضبط VITE_DISABLE_EMAIL_VERIFICATION=true ثم أعد البناء.
		disableEmailVerification: import.meta.env.VITE_DISABLE_EMAIL_VERIFICATION === 'true',
		// دوال الخلفية (Backend Functions): عند وجود apiUrl نستخدم سيرفر التطبيق (sendVerificationCode, verifyCode, createFirstGovernor...)
		// في الإنتاج: إن لم يُضبط VITE_API_URL نستخدم نفس النطاق (الواجهة والسيرفر معاً على Railway)
		// لضمان التفعيل على Railway: لا تضبط VITE_API_URL أو اضبط VITE_USE_BACKEND_FUNCTIONS=true
		apiUrl: resolvedApiUrl,
		// حماية إضافية: لا نسمح بإعادة البذر على السيرفر الحقيقي إلا بتفعيل صريح.
		allowServerReseed: import.meta.env.VITE_ALLOW_SERVER_RESEED === 'true',
	}
}


const params = getAppParams();

export const appParams = {
	...params
};

/** يعمل التطبيق محلياً دون إنترنت عند true */
export const useLocalBackend = () => params.useLocalBackend === true;

/** تحقق إذا كانت إعدادات الخلفية مضمّنة (ليست القيم البديلة) */
export function isBackendConfigured() {
	const id = params.appId;
	const url = params.appBaseUrl;
	const invalidId = !id || id === 'your_app_id' || id.length < 10;
	const invalidUrl = !url || url === 'your_backend_url' || !url.startsWith('http');
	return !invalidId && !invalidUrl;
}

/** @deprecated استخدم isBackendConfigured */
export const isBase44Configured = isBackendConfigured;
