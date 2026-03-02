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
    setShowWarning(false);

    // تعيين مؤقت التحذير (قبل دقيقتين من انتهاء الوقت)
    warningRef.current = setTimeout(() => {
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
      setShowWarning(false);
      onTimeout();
    }, timeoutMs);
  }, [onTimeout, timeoutMs, warningMs, clearAllTimers]);

  const dismissWarning = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    // الأحداث التي تُعتبر نشاطاً من المستخدم
    const events = [
      'mousemove', 'mousedown', 'keydown', 'touchstart',
      'scroll', 'click', 'wheel'
    ];

    const handleActivity = () => {
      // فقط إعادة تعيين إذا لم يكن التحذير ظاهراً
      // (لتجنب إعادة تعيين عند تحريك الماوس أثناء ظهور التحذير عن غير قصد)
      if (!showWarning) {
        resetTimer();
      }
    };

    // تشغيل المؤقت عند البدء
    resetTimer();

    // تسجيل أحداث النشاط
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // مراقبة تغيير التبويب (visibility change)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // عند العودة للتبويب، تحقق هل انتهت المهلة
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= timeoutMs) {
          clearAllTimers();
          setShowWarning(false);
          onTimeout();
        } else {
          resetTimer();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // مراقبة التخزين المحلي (لمزامنة تسجيل الخروج بين التبويبات)
    const handleStorage = (e) => {
      if (e.key === 'idle_logout_signal' && e.newValue === 'true') {
        clearAllTimers();
        setShowWarning(false);
        onTimeout();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearAllTimers();
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('storage', handleStorage);
    };
  }, [resetTimer, clearAllTimers, onTimeout, timeoutMs, showWarning]);

  return { showWarning, remainingSeconds, dismissWarning };
}
