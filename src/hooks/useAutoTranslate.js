import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { translateText, translateTextSync, translateBatch } from '@/utils/translationService';

/**
 * Hook: auto-translate a single text string based on current language.
 * Returns the translated text (or original while loading).
 *
 * @param {string} text - original text
 * @returns {{ translated: string, isTranslating: boolean }}
 */
export function useAutoTranslate(text) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [translated, setTranslated] = useState(() => translateTextSync(text, lang));
  const [isTranslating, setIsTranslating] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    if (!text) { setTranslated(text); return; }

    // Try sync first
    const sync = translateTextSync(text, lang);
    setTranslated(sync);
    if (sync !== text) return; // cache hit

    // Async fetch
    setIsTranslating(true);
    translateText(text, lang).then((result) => {
      if (mountedRef.current) {
        setTranslated(result);
        setIsTranslating(false);
      }
    });
  }, [text, lang]);

  return { translated, isTranslating };
}

/**
 * Hook: auto-translate an array of texts.
 * Returns a Map<original, translated>.
 *
 * @param {string[]} texts
 * @returns {{ translations: Map<string, string>, isTranslating: boolean }}
 */
export function useAutoTranslateBatch(texts) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [translations, setTranslations] = useState(new Map());
  const [isTranslating, setIsTranslating] = useState(false);
  const mountedRef = useRef(true);
  const prevKey = useRef('');

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    if (!texts || texts.length === 0) return;

    const key = texts.join('|') + '|' + lang;
    if (key === prevKey.current) return;
    prevKey.current = key;

    // Build initial from sync cache
    const initial = new Map();
    let allCached = true;
    texts.forEach(t => {
      const sync = translateTextSync(t, lang);
      initial.set(t, sync);
      if (sync === t) allCached = false;
    });
    setTranslations(initial);
    if (allCached) return;

    // Fetch missing
    setIsTranslating(true);
    translateBatch(texts, lang).then((result) => {
      if (mountedRef.current) {
        setTranslations(result);
        setIsTranslating(false);
      }
    });
  }, [texts, lang]);

  return { translations, isTranslating };
}

/**
 * Hook: get a translate function for on-demand translation.
 * @returns {(text: string) => Promise<string>}
 */
export function useTranslateFunction() {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  return useCallback(
    (text) => translateText(text, lang),
    [lang]
  );
}
