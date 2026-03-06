/**
 * AI Auto-Translation Service
 * Uses MyMemory (free, no API key) with intelligent caching.
 * Translates dynamic user-entered data (names, descriptions, etc.)
 */

const CACHE_KEY = 'auto_translations_cache';
const MAX_CACHE_SIZE = 2000; // max entries
const BATCH_DELAY = 80; // ms debounce for batching

// ─── Built-in dictionary for known values ────────────────────
// These translations are guaranteed and don't depend on external API.
const BUILTIN_TRANSLATIONS = {
  'ar>en': {
    // Default district names
    'حي الشفاء': 'Al-Shifa Neighborhood',
    'حي الخالدية': 'Al-Khalidiyah Neighborhood',
    'حي الصفاء': 'Al-Safa Neighborhood',
    'حي النسيم': 'Al-Naseem Neighborhood',
    'حي العزيزية': 'Al-Aziziyah Neighborhood',
    'حي الشروق': 'Al-Shorouk Neighborhood',
    // Common role titles
    'متطوع اللجنة الرئيسية': 'Main Committee Volunteer',
    'متطوع لجنة الحوكمة والشراكات': 'Governance & Partnerships Committee Volunteer',
    'متطوع لجنة المشاركة المجتمعية': 'Community Participation Committee Volunteer',
    'متطوع لجنة البنية التحتية': 'Infrastructure Committee Volunteer',
    'متطوع لجنة الصحة': 'Health Committee Volunteer',
    'متطوع لجنة التعليم': 'Education Committee Volunteer',
    'متطوع لجنة البيئة': 'Environment Committee Volunteer',
    // Common labels
    'أخرى': 'Other',
    'غير محدد': 'Unspecified',
    // Axis names
    'تنظيم المجتمع والتوعية': 'Community Organization & Awareness',
    'المعلومات المجتمعية': 'Community Information',
    'المياه والبيئة والغذاء': 'Water, Environment & Food',
    'التنمية الصحية': 'Health Development',
    'الطوارئ والاستجابة': 'Emergency & Response',
    'التعليم ومحو الأمية': 'Education & Literacy',
    'المهارات والتدريب': 'Skills & Training',
    'القروض الصغيرة': 'Microloans',
    // Common committee names
    'اللجنة الرئيسية': 'Main Committee',
    'لجنة الحوكمة والشراكات': 'Governance & Partnerships Committee',
    'لجنة المشاركة المجتمعية': 'Community Participation Committee',
    'لجنة البنية التحتية': 'Infrastructure Committee',
    'لجنة الصحة': 'Health Committee',
    'لجنة التعليم': 'Education Committee',
    'لجنة البيئة': 'Environment Committee',
    // Common category/tag labels
    'مشاركة مجتمعية': 'Community Participation',
    'بيئة خضراء': 'Green Environment',
    'صحة ورعاية': 'Health & Care',
    'الحوكمة والشراكات': 'Governance & Partnerships',
    'المشاركة المجتمعية': 'Community Participation',
    'البيئة والاستدامة': 'Environment & Sustainability',
    // Common locations
    'مدينة قلوة': 'Qelwa City',
    'محافظة قلوة': 'Qelwa Governorate',
  },
};

function builtinLookup(text, from, to) {
  const key = `${from}>${to}`;
  return BUILTIN_TRANSLATIONS[key]?.[text] || null;
}

// ─── Cache helpers ───────────────────────────────────────────
function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch { return {}; }
}

function saveCache(cache) {
  try {
    // Trim if too large
    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE_SIZE) {
      const trimmed = {};
      keys.slice(-MAX_CACHE_SIZE).forEach(k => { trimmed[k] = cache[k]; });
      localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
  } catch { /* quota exceeded – ignore */ }
}

function cacheKey(text, from, to) {
  return `${from}>${to}:${text}`;
}

// ─── Language detection ──────────────────────────────────────
const AR_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const EN_RE = /[a-zA-Z]/;

export function detectLanguage(text) {
  if (!text) return 'unknown';
  const arCount = (text.match(new RegExp(AR_RE.source, 'g')) || []).length;
  const enCount = (text.match(new RegExp(EN_RE.source, 'g')) || []).length;
  if (arCount > enCount) return 'ar';
  if (enCount > arCount) return 'en';
  return arCount > 0 ? 'ar' : 'unknown';
}

// ─── Translation API ─────────────────────────────────────────
async function callTranslationAPI(text, from, to) {
  // MyMemory – free, 5 000 chars/day without key, 50 000 with email
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      let translated = data.responseData.translatedText;
      // MyMemory sometimes returns ALL-CAPS for short strings; fix
      if (translated === translated.toUpperCase() && translated.length < 60) {
        translated = translated.charAt(0).toUpperCase() + translated.slice(1).toLowerCase();
      }
      return translated;
    }
    return null;
  } catch (err) {
    console.warn('[AutoTranslate] API error:', err.message);
    return null;
  }
}

// ─── Request queue (batching + dedup) ────────────────────────
let pendingQueue = new Map(); // text -> { from, to, resolvers[] }
let batchTimer = null;

function processBatch() {
  const batch = new Map(pendingQueue);
  pendingQueue.clear();
  batchTimer = null;
  
  const cache = loadCache();
  
  batch.forEach(async ({ text, from, to, resolvers }) => {
    const key = cacheKey(text, from, to);
    // Double-check cache
    if (cache[key]) {
      resolvers.forEach(r => r(cache[key]));
      return;
    }
    
    const result = await callTranslationAPI(text, from, to);
    if (result) {
      cache[key] = result;
      saveCache(cache);
      resolvers.forEach(r => r(result));
    } else {
      resolvers.forEach(r => r(text)); // fallback = original
    }
  });
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Translate a single text string.
 * Returns cached result immediately if available, otherwise fetches.
 * @param {string} text - The text to translate
 * @param {string} targetLang - Target language ('ar' or 'en')
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, targetLang) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return text;
  
  const sourceLang = detectLanguage(text);
  
  // Already in target language or undetermined
  if (sourceLang === targetLang || sourceLang === 'unknown') return text;
  
  const from = sourceLang;
  const to = targetLang;
  
  // Check built-in dictionary first
  const builtin = builtinLookup(text, from, to);
  if (builtin) return builtin;
  
  // Check cache
  const cache = loadCache();
  const key = cacheKey(text, from, to);
  if (cache[key]) return cache[key];
  
  // Queue for batch processing
  return new Promise((resolve) => {
    const queueKey = `${from}>${to}:${text}`;
    if (pendingQueue.has(queueKey)) {
      pendingQueue.get(queueKey).resolvers.push(resolve);
    } else {
      pendingQueue.set(queueKey, { text, from, to, resolvers: [resolve] });
    }
    
    if (batchTimer) clearTimeout(batchTimer);
    batchTimer = setTimeout(processBatch, BATCH_DELAY);
  });
}

/**
 * Synchronous cache lookup – returns cached translation or original.
 * Use this when you need instant results (no loading state).
 * @param {string} text
 * @param {string} targetLang
 * @returns {string}
 */
export function translateTextSync(text, targetLang) {
  if (!text || typeof text !== 'string') return text;
  const sourceLang = detectLanguage(text);
  if (sourceLang === targetLang || sourceLang === 'unknown') return text;
  
  // Check built-in dictionary first
  const builtin = builtinLookup(text, sourceLang, targetLang);
  if (builtin) return builtin;
  
  const cache = loadCache();
  const key = cacheKey(text, sourceLang, targetLang);
  return cache[key] || text;
}

/**
 * Pre-translate an array of texts (e.g. when data loads).
 * Useful for batch-translating lists of names/descriptions.
 * @param {string[]} texts
 * @param {string} targetLang
 * @returns {Promise<Map<string, string>>} Map of original → translated
 */
export async function translateBatch(texts, targetLang) {
  const results = new Map();
  const toTranslate = [];
  const cache = loadCache();
  
  for (const text of texts) {
    if (!text || typeof text !== 'string') { results.set(text, text); continue; }
    const sourceLang = detectLanguage(text);
    if (sourceLang === targetLang || sourceLang === 'unknown') {
      results.set(text, text);
      continue;
    }
    // Check built-in dictionary first
    const builtin = builtinLookup(text, sourceLang, targetLang);
    if (builtin) {
      results.set(text, builtin);
      continue;
    }
    const key = cacheKey(text, sourceLang, targetLang);
    if (cache[key]) {
      results.set(text, cache[key]);
    } else {
      toTranslate.push({ text, from: sourceLang, to: targetLang });
    }
  }
  
  // Translate uncached in parallel (limited concurrency)
  const CONCURRENCY = 3;
  for (let i = 0; i < toTranslate.length; i += CONCURRENCY) {
    const chunk = toTranslate.slice(i, i + CONCURRENCY);
    const translated = await Promise.all(
      chunk.map(async ({ text, from, to }) => {
        const result = await callTranslationAPI(text, from, to);
        return { text, from, to, result };
      })
    );
    translated.forEach(({ text, from, to, result }) => {
      if (result) {
        cache[cacheKey(text, from, to)] = result;
        results.set(text, result);
      } else {
        results.set(text, text);
      }
    });
  }
  
  saveCache(cache);
  return results;
}

/**
 * Clear translation cache.
 */
export function clearTranslationCache() {
  localStorage.removeItem(CACHE_KEY);
}
