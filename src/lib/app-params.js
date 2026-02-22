const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
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
	return {
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: safeHref }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
		useLocalBackend: import.meta.env.VITE_USE_LOCAL_BACKEND === 'true',
		useSupabaseBackend: import.meta.env.VITE_USE_SUPABASE_BACKEND === 'true',
		supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
		supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
		// دوال الخلفية (Backend Functions): عند وجود apiUrl نستخدم سيرفر التطبيق (sendVerificationCode, verifyCode, createFirstGovernor...)
		// في الإنتاج: إن لم يُضبط VITE_API_URL نستخدم نفس النطاق (الواجهة والسيرفر معاً على Railway)
		// لضمان التفعيل على Railway: لا تضبط VITE_API_URL أو اضبط VITE_USE_BACKEND_FUNCTIONS=true
		apiUrl: (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') ||
			(import.meta.env.PROD && typeof window !== 'undefined' ? window.location.origin : '') ||
			(import.meta.env.VITE_USE_BACKEND_FUNCTIONS === 'true' && typeof window !== 'undefined' && window.location ? window.location.origin : ''),
	}
}


const params = getAppParams();

export const appParams = {
	...params
};

/** يعمل التطبيق محلياً دون إنترنت عند true */
export const useLocalBackend = () => params.useLocalBackend === true;

/** تحقق إذا كانت إعدادات Base44 مضمّنة (ليست القيم البديلة) */
export function isBase44Configured() {
	const id = params.appId;
	const url = params.appBaseUrl;
	const invalidId = !id || id === 'your_app_id' || id.length < 10;
	const invalidUrl = !url || url === 'your_backend_url' || !url.startsWith('http');
	return !invalidId && !invalidUrl;
}
