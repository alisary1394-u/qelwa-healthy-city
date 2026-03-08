import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Hook لمراقبة عدم النشاط وتسجيل خروج المستخدم تلقائياً.
 * 
 * @param {Function} onTimeout - دالة تُنفَّذ عند انتهاء مهلة عدم النشاط (عادةً logout)
 * @param {number} timeoutMs - مهلة عدم النشاط بالمللي ثانية (افتراضي: 20 دقيقة)
 * @param {number} warningMs - وقت التحذير قبل انتهاء المهلة (افتراضي: دقيقتان)
 */
export function useIdleTimeout(onTimeout, timeoutMs = 20 * 60 * 1000, warningMs = 2 * 60 * 1000) {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const countdownRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  // ref لتتبع حالة التحذير بدون إعادة تشغيل الـ effect
  const showWarningRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => { onTimeoutRef.current = onTimeout; }, [onTimeout]);

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    timeoutRef.current = null;
    warningRef.current = null;
    countdownRef.current = null;
  }, []);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    clearAllTimers();
    showWarningRef.current = false;
    setShowWarning(false);

    // تعيين مؤقت التحذير (قبل دقيقتين من انتهاء الوقت)
    warningRef.current = setTimeout(() => {
      showWarningRef.current = true;
      setShowWarning(true);
      setRemainingSeconds(Math.ceil(warningMs / 1000));

      // العد التنازلي كل ثانية
      countdownRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, timeoutMs - warningMs);

    // تعيين مؤقت تسجيل الخروج
    timeoutRef.current = setTimeout(() => {
      clearAllTimers();
      showWarningRef.current = false;
      setShowWarning(false);
      onTimeoutRef.current();
    }, timeoutMs);
  }, [timeoutMs, warningMs, clearAllTimers]);

  const dismissWarning = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click', 'wheel'];

    const handleActivity = () => {
      // لا نُعيد التعيين أثناء ظهور التحذير (قراءة من ref لا تُعيد تشغيل الـ effect)
      if (!showWarningRef.current) {
        resetTimer();
      }
    };

    // تشغيل المؤقت عند البدء
    resetTimer();

    events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));

    // مراقبة تغيير التبويب
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= timeoutMs) {
          clearAllTimers();
          showWarningRef.current = false;
          setShowWarning(false);
          onTimeoutRef.current();
        } else if (!showWarningRef.current) {
          resetTimer();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // مزامنة تسجيل الخروج بين التبويبات
    const handleStorage = (e) => {
      if (e.key === 'idle_logout_signal' && e.newValue === 'true') {
        clearAllTimers();
        showWarningRef.current = false;
        setShowWarning(false);
        onTimeoutRef.current();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearAllTimers();
      events.forEach(event => window.removeEventListener(event, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('storage', handleStorage);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTimer, clearAllTimers, timeoutMs]);
  // ملاحظة: showWarning مُزالة من القائمة عمداً — نستخدم showWarningRef بدلاً منها
  // لمنع إعادة تشغيل الـ effect (وإعادة تعيين المؤقت) عند ظهور التحذير

  return { showWarning, remainingSeconds, dismissWarning };
}
