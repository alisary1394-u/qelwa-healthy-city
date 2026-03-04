/**
 * ==============================================
 * حماية الموقع من النسخ والسحب والذكاء الاصطناعي
 * نظام المدينة الصحية - محافظة قلوة
 * ==============================================
 */
(function() {
  'use strict';

  // ========== 1. منع النقر بالزر الأيمن ==========
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  });

  // ========== 2. منع تحديد النص ==========
  document.addEventListener('selectstart', function(e) {
    // السماح بالتحديد داخل حقول الإدخال فقط
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      return true;
    }
    e.preventDefault();
    return false;
  });

  // ========== 3. منع النسخ واللصق والقص ==========
  document.addEventListener('copy', function(e) {
    const tag = e.target.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return true;
    e.preventDefault();
    return false;
  });

  document.addEventListener('cut', function(e) {
    const tag = e.target.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return true;
    e.preventDefault();
    return false;
  });

  // ========== 4. منع السحب والإفلات ==========
  document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    return false;
  });

  document.addEventListener('drop', function(e) {
    e.preventDefault();
    return false;
  });

  // ========== 5. منع اختصارات لوحة المفاتيح الخطيرة ==========
  document.addEventListener('keydown', function(e) {
    // Ctrl+S (حفظ الصفحة)
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      return false;
    }
    // Ctrl+U (عرض المصدر)
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I (أدوات المطور)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+J (كونسول)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+C (فحص العناصر)
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      return false;
    }
    // F12 (أدوات المطور)
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    // Ctrl+A (تحديد الكل) - خارج حقول الإدخال
    if (e.ctrlKey && e.key === 'a') {
      const tag = e.target.tagName?.toLowerCase();
      if (tag !== 'input' && tag !== 'textarea') {
        e.preventDefault();
        return false;
      }
    }
    // Ctrl+P (طباعة)
    if (e.ctrlKey && e.key === 'p') {
      e.preventDefault();
      return false;
    }
  });

  // ========== 6. منع الطباعة ==========
  // إخفاء المحتوى عند محاولة الطباعة
  const printStyle = document.createElement('style');
  printStyle.textContent = `
    @media print {
      body * {
        display: none !important;
      }
      body::after {
        content: "⛔ طباعة هذا المحتوى غير مسموح بها - نظام المدينة الصحية محافظة قلوة";
        display: block !important;
        font-size: 24px;
        text-align: center;
        padding: 50px;
        direction: rtl;
      }
    }
  `;
  document.head.appendChild(printStyle);

  // ========== 7. CSS إضافي لمنع التحديد ==========
  const protectStyle = document.createElement('style');
  protectStyle.textContent = `
    body {
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
    }
    input, textarea, select, [contenteditable="true"] {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
    }
    img {
      pointer-events: none !important;
      -webkit-user-drag: none !important;
      -khtml-user-drag: none !important;
      -moz-user-drag: none !important;
      -o-user-drag: none !important;
      user-drag: none !important;
    }
  `;
  document.head.appendChild(protectStyle);

  // ========== 8. كشف أدوات المطور (DevTools) ==========
  let devtoolsOpen = false;
  
  // الطريقة 1: فحص عبر حجم النافذة
  function checkDevTools() {
    const widthThreshold = window.outerWidth - window.innerWidth > 160;
    const heightThreshold = window.outerHeight - window.innerHeight > 160;
    
    if (widthThreshold || heightThreshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        onDevToolsDetected();
      }
    } else {
      devtoolsOpen = false;
    }
  }

  // الطريقة 2: فحص عبر debugger
  function checkDebugger() {
    const start = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    const end = performance.now();
    if (end - start > 100) {
      onDevToolsDetected();
    }
  }

  function onDevToolsDetected() {
    console.clear();
    console.log(
      '%c⛔ تحذير أمني',
      'color: red; font-size: 40px; font-weight: bold;'
    );
    console.log(
      '%cهذا الموقع محمي. أي محاولة لنسخ أو سحب المحتوى مخالفة للقانون.',
      'color: red; font-size: 16px;'
    );
    console.log(
      '%cنظام المدينة الصحية - محافظة قلوة © جميع الحقوق محفوظة',
      'color: #666; font-size: 14px;'
    );
  }

  // تشغيل الفحص الدوري
  setInterval(checkDevTools, 1000);

  // ========== 9. منع iframe embedding ==========
  if (window.top !== window.self) {
    window.top.location = window.self.location;
  }

  // ========== 10. حماية من أدوات Web Scraping ==========
  // كشف headless browsers (أدوات السحب الآلي)
  function detectHeadlessBrowser() {
    const tests = [];
    
    // فحص webdriver
    if (navigator.webdriver) {
      tests.push('webdriver');
    }
    
    // فحص plugins
    if (navigator.plugins.length === 0) {
      tests.push('no-plugins');
    }
    
    // فحص languages
    if (!navigator.languages || navigator.languages.length === 0) {
      tests.push('no-languages');
    }

    // فحص automation flags
    if (window.callPhantom || window._phantom || window.__nightmare) {
      tests.push('phantom/nightmare');
    }

    // فحص Selenium
    if (document.documentElement.getAttribute('webdriver') ||
        window.domAutomation || window.domAutomationController) {
      tests.push('selenium');
    }

    // فحص headless Chrome
    if (/HeadlessChrome/.test(navigator.userAgent)) {
      tests.push('headless-chrome');
    }

    // فحص Puppeteer/Playwright
    if (navigator.userAgent.includes('Puppeteer') || 
        navigator.userAgent.includes('Playwright')) {
      tests.push('puppeteer/playwright');
    }

    if (tests.length >= 2) {
      console.warn('[Security] Automated browser detected:', tests.join(', '));
      document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;direction:rtl;font-family:Tajawal,sans-serif;">
          <div style="text-align:center;padding:40px;">
            <h1 style="color:#dc2626;font-size:2rem;">⛔ تم رصد وصول آلي</h1>
            <p style="color:#666;font-size:1.2rem;">هذا الموقع محمي ضد أدوات النسخ الآلي</p>
            <p style="color:#999;">نظام المدينة الصحية - محافظة قلوة</p>
          </div>
        </div>
      `;
    }
  }

  // ========== 11. honeypot لكشف البوتات ==========
  function createHoneypot() {
    const honeypot = document.createElement('a');
    honeypot.href = '/api/trap';
    honeypot.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;opacity:0;';
    honeypot.textContent = 'admin login';
    honeypot.setAttribute('aria-hidden', 'true');
    honeypot.tabIndex = -1;
    document.body.appendChild(honeypot);
  }

  // ========== 12. حماية الصور ==========
  function protectImages() {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.tagName === 'IMG') {
            node.setAttribute('draggable', 'false');
            node.addEventListener('contextmenu', function(e) { e.preventDefault(); });
          }
          if (node.querySelectorAll) {
            node.querySelectorAll('img').forEach(function(img) {
              img.setAttribute('draggable', 'false');
              img.addEventListener('contextmenu', function(e) { e.preventDefault(); });
            });
          }
        });
      });
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // ========== 13. حماية شاملة من لقطات الشاشة ==========
  // علامة عامة: المشرف العام يضعها true من React
  window.__ALLOW_SCREENSHOTS = false;

  function isScreenshotAllowed() {
    return window.__ALLOW_SCREENSHOTS === true;
  }

  // --- الغطاء الواقي الدائم ---
  var protectionOverlay = null;
  var overlayVisible = false;
  var winKeyTimer = null;
  var winKeyDown = false;

  function createProtectionOverlay() {
    if (protectionOverlay) return;
    protectionOverlay = document.createElement('div');
    protectionOverlay.id = 'screenshot-protection-overlay';
    protectionOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
      'background:linear-gradient(135deg,#1e3a5f 0%,#0f1b2d 100%);z-index:2147483647;' +
      'display:none;align-items:center;justify-content:center;direction:rtl;font-family:Tajawal,sans-serif;' +
      'pointer-events:all;transition:none;';
    protectionOverlay.innerHTML = '<div style="text-align:center;color:white;">' +
      '<div style="font-size:4rem;margin-bottom:20px;">🛡️</div>' +
      '<h2 style="font-size:1.8rem;margin-bottom:10px;">المحتوى محمي</h2>' +
      '<p style="color:#94a3b8;font-size:1.1rem;">لقطات الشاشة غير مسموح بها</p>' +
      '<p style="color:#64748b;font-size:0.85rem;margin-top:8px;">نظام المدينة الصحية - محافظة قلوة</p>' +
      '</div>';
    document.documentElement.appendChild(protectionOverlay);
  }

  // إنشاء الغطاء فوراً عند تحميل الصفحة ليكون جاهزاً
  if (document.readyState !== 'loading') {
    createProtectionOverlay();
  } else {
    document.addEventListener('DOMContentLoaded', createProtectionOverlay);
  }

  function showOverlayNow() {
    if (isScreenshotAllowed() || overlayVisible) return;
    createProtectionOverlay();
    protectionOverlay.style.display = 'flex';
    overlayVisible = true;
  }

  function hideOverlayDelayed(delay) {
    setTimeout(function() {
      if (protectionOverlay && overlayVisible) {
        protectionOverlay.style.display = 'none';
        overlayVisible = false;
      }
    }, delay || 500);
  }

  function clearClipboard() {
    try { navigator.clipboard.writeText('').catch(function(){}); } catch(ex) {}
    try {
      var c = document.createElement('canvas');
      c.width = 1; c.height = 1;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(0,0,1,1);
      c.toBlob(function(blob) {
        try {
          navigator.clipboard.write([new ClipboardItem({'image/png': blob})]).catch(function(){});
        } catch(e) {}
      });
    } catch(e) {}
  }

  // ★★★ الحيلة الرئيسية: إظهار الغطاء فوراً عند الضغط على مفتاح Windows ★★★
  // مفتاح Windows (Meta) يُضغط أولاً قبل أي اختصار تصوير:
  // Win+Shift+S → Meta keydown يأتي أولاً
  // Win+PrtScn → Meta keydown يأتي أولاً  
  // Win+G → Meta keydown يأتي أولاً
  // لذا نعرض الغطاء عند Meta keydown فوراً!

  document.addEventListener('keydown', function(e) {
    if (isScreenshotAllowed()) return;

    // ★ عند الضغط على مفتاح Windows/Meta → إظهار فوري
    if (e.key === 'Meta' || e.key === 'OS') {
      winKeyDown = true;
      showOverlayNow();
      // إذا كان مجرد ضغطة عابرة (مثل فتح قائمة Start)، نخفي بعد 3 ثوانٍ
      if (winKeyTimer) clearTimeout(winKeyTimer);
      winKeyTimer = setTimeout(function() {
        if (document.hasFocus() && !document.hidden) {
          hideOverlayDelayed(0);
        }
        winKeyDown = false;
      }, 3000);
      return;
    }

    // PrintScreen بأي شكل
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      showOverlayNow();
      e.preventDefault();
      e.stopImmediatePropagation();
      clearClipboard();
      hideOverlayDelayed(3000);
      return false;
    }

    // Ctrl+Shift+S
    if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
      showOverlayNow();
      e.preventDefault();
      e.stopImmediatePropagation();
      hideOverlayDelayed(3000);
      return false;
    }

    // Win+G (Game Bar)
    if (e.metaKey && (e.key === 'G' || e.key === 'g')) {
      showOverlayNow();
      e.preventDefault();
      e.stopImmediatePropagation();
      hideOverlayDelayed(3000);
      return false;
    }
  }, true); // capture phase — أسرع ما يمكن

  // عند رفع مفتاح Windows — إخفاء بعد تأخير (للسماح للمستخدم العادي)
  document.addEventListener('keyup', function(e) {
    if (isScreenshotAllowed()) return;

    if (e.key === 'Meta' || e.key === 'OS') {
      winKeyDown = false;
      // تأخير قصير: إذا كان الـ focus مازال هنا، أخفِ الغطاء
      setTimeout(function() {
        if (document.hasFocus() && !document.hidden && !winKeyDown) {
          hideOverlayDelayed(0);
        }
      }, 800);
    }

    // PrintScreen keyup — تنظيف الحافظة
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      showOverlayNow();
      clearClipboard();
      e.preventDefault();
      hideOverlayDelayed(3000);
    }
  }, true);

  // --- حماية عند فقدان التركيز (أداة القص / Alt+Tab / أي تبديل) ---
  document.addEventListener('visibilitychange', function() {
    if (isScreenshotAllowed()) return;
    if (document.hidden) {
      showOverlayNow();
    } else {
      hideOverlayDelayed(600);
    }
  });

  window.addEventListener('blur', function() {
    if (isScreenshotAllowed()) return;
    showOverlayNow();
  });

  window.addEventListener('focus', function() {
    if (isScreenshotAllowed()) return;
    hideOverlayDelayed(500);
  });

  // --- تنظيف الحافظة دورياً ---
  setInterval(function() {
    if (isScreenshotAllowed()) return;
    if (!document.hasFocus()) {
      clearClipboard();
    }
  }, 1500);

  // --- حظر Screen Capture API ---
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    var originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getDisplayMedia = function(constraints) {
      if (isScreenshotAllowed()) return originalGetDisplayMedia(constraints);
      return Promise.reject(new DOMException('Screen capture is not allowed', 'NotAllowedError'));
    };
  }

  // --- CSS حماية شاملة ---
  var screenshotStyle = document.createElement('style');
  screenshotStyle.textContent =
    '@media (display-mode: picture-in-picture) { body { visibility: hidden !important; } }' +
    '@media print { body * { display: none !important; } body::after { content: "⛔ طباعة غير مسموح بها"; display: block !important; font-size: 24px; text-align: center; padding: 50px; direction: rtl; } }';
  document.head.appendChild(screenshotStyle);

  // --- مراقبة حجم النافذة ---
  var lastW = window.outerWidth, lastH = window.outerHeight;
  setInterval(function() {
    if (isScreenshotAllowed()) return;
    if (Math.abs(window.outerWidth - lastW) > 200 || Math.abs(window.outerHeight - lastH) > 200) {
      showOverlayNow();
      hideOverlayDelayed(1500);
    }
    lastW = window.outerWidth;
    lastH = window.outerHeight;
  }, 400);

  // ========== 14. حماية الأجهزة المحمولة من لقطات الشاشة ==========
  var isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  var isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  var isAndroid = /Android/i.test(navigator.userAgent);
  var isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  if (isMobile || isTouchDevice) {

    // --- أ) كشف لقطة شاشة عبر تغير حجم الشاشة المفاجئ (Android) ---
    // عند أخذ لقطة شاشة على Android، يتغير حجم النافذة لحظياً
    var mobileLastW = screen.width, mobileLastH = screen.height;
    var lastResizeTime = 0;
    window.addEventListener('resize', function() {
      if (isScreenshotAllowed()) return;
      var now = Date.now();
      var wChanged = Math.abs(screen.width - mobileLastW) > 0;
      var hChanged = Math.abs(screen.height - mobileLastH) > 0;
      // لقطة شاشة على بعض الأجهزة تسبب resize سريع
      if (now - lastResizeTime < 500 && (wChanged || hChanged)) {
        showOverlayNow();
        clearClipboard();
        hideOverlayDelayed(3000);
      }
      lastResizeTime = now;
      mobileLastW = screen.width;
      mobileLastH = screen.height;
    });

    // --- ب) كشف لقطة شاشة عبر Visibility API (iOS + Android) ---
    // بعض الأجهزة تُطلق visibilitychange عند أخذ لقطة
    var lastVisibilityChange = 0;
    document.addEventListener('visibilitychange', function() {
      if (isScreenshotAllowed()) return;
      var now = Date.now();
      if (document.hidden) {
        lastVisibilityChange = now;
      } else {
        // العودة خلال أقل من 2 ثانية = لقطة شاشة محتملة
        if (now - lastVisibilityChange < 2000) {
          showOverlayNow();
          clearClipboard();
          hideOverlayDelayed(3000);
        }
      }
    });

    // --- ج) كشف لقطة شاشة عبر فقدان/استعادة التركيز السريع ---
    var lastBlurTime = 0;
    window.addEventListener('blur', function() {
      if (isScreenshotAllowed()) return;
      lastBlurTime = Date.now();
      showOverlayNow();
    });
    window.addEventListener('focus', function() {
      if (isScreenshotAllowed()) return;
      var now = Date.now();
      // Blur ثم Focus خلال أقل من 3 ثوانٍ = لقطة شاشة محتملة
      if (lastBlurTime > 0 && now - lastBlurTime < 3000) {
        clearClipboard();
      }
      hideOverlayDelayed(500);
    });

    // --- د) حماية عبر CSS خاصة بالموبايل ---
    var mobileProtectStyle = document.createElement('style');
    mobileProtectStyle.textContent =
      // منع التحديد على الشاشات اللمسية
      '* { -webkit-touch-callout: none !important; -webkit-tap-highlight-color: transparent !important; }' +
      // لا يمكن حفظ الصور بالضغط المطول
      'img, canvas, video, svg { -webkit-touch-callout: none !important; pointer-events: none !important; }' +
      // منع التكبير عبر القرص (pinch zoom) الذي قد يستخدم لالتقاط التفاصيل
      'html { touch-action: manipulation; }' +
      // إقفال اتجاه الشاشة على الوضع الطبيعي
      '@media screen and (orientation: landscape) {' +
      '  body::before {' +
      '    content: ""; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;' +
      '    z-index: 2147483646; pointer-events: none;' +
      '  }' +
      '}';
    document.head.appendChild(mobileProtectStyle);

    // --- هـ) منع حفظ الصور بالضغط المطول (Long Press) ---
    document.addEventListener('touchstart', function(e) {
      if (isScreenshotAllowed()) return;
      var tag = e.target.tagName ? e.target.tagName.toLowerCase() : '';
      if (tag === 'img' || tag === 'canvas' || tag === 'video') {
        e.target.style.pointerEvents = 'none';
        setTimeout(function() { e.target.style.pointerEvents = ''; }, 100);
      }
    }, { passive: true });

    // منع القائمة المنبثقة عند الضغط المطول
    document.addEventListener('touchstart', function() {
      if (isScreenshotAllowed()) return;
      var timer = setTimeout(function() {}, 500);
      document.addEventListener('touchend', function() { clearTimeout(timer); }, { once: true });
      document.addEventListener('touchmove', function() { clearTimeout(timer); }, { once: true });
    }, { passive: true });

    // --- و) حماية إضافية لـ iOS: كشف لقطة شاشة عبر حجم الفيديو ---
    if (isIOS) {
      // على iOS، بعض التطبيقات تطلق إشعاراً عند Screenshot
      // نعتمد على حيلة: إنشاء عنصر video فارغ مخفي
      // تغيّر حالة الفيديو يمكن أن يكشف بعض أحداث النظام
      try {
        var detector = document.createElement('video');
        detector.setAttribute('playsinline', '');
        detector.muted = true;
        detector.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
        document.documentElement.appendChild(detector);
        // مراقبة أحداث pause/play التي قد تحدث عند لقطة شاشة
        detector.addEventListener('pause', function() {
          if (isScreenshotAllowed()) return;
          showOverlayNow();
          clearClipboard();
          hideOverlayDelayed(3000);
        });
      } catch(ex) {}
    }

    // --- ز) حماية Android عبر Capacitor Plugin (FLAG_SECURE) ---
    // إذا كان التطبيق يعمل داخل Capacitor، نستدعي Plugin أصلي
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
      try {
        // استدعاء Plugin ScreenProtection
        var Plugins = window.Capacitor.Plugins;
        if (Plugins && Plugins.ScreenProtection) {
          if (!isScreenshotAllowed()) {
            Plugins.ScreenProtection.enable();
          }
        }
      } catch(ex) {
        console.warn('[Security] Capacitor ScreenProtection plugin not available');
      }
    }

    console.log('[Security] Mobile screenshot protection active (' + (isIOS ? 'iOS' : isAndroid ? 'Android' : 'Touch') + ')');
  }

  // ========== 15. حماية إضافية: منع تسجيل الشاشة على الموبايل ==========
  // كشف تسجيل الشاشة عبر mediaDevices
  if (navigator.mediaDevices) {
    navigator.mediaDevices.addEventListener('devicechange', function() {
      if (isScreenshotAllowed()) return;
      showOverlayNow();
      hideOverlayDelayed(2000);
    });
  }

  // ========== التشغيل ==========
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      detectHeadlessBrowser();
      createHoneypot();
      protectImages();
    });
  } else {
    detectHeadlessBrowser();
    createHoneypot();
    protectImages();
  }

  // رسالة الكونسول التحذيرية
  onDevToolsDetected();

})();
