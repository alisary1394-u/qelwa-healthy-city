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

  // --- الغطاء الواقي الدائم (يظهر فوراً عند أي محاولة تصوير) ---
  var protectionOverlay = null;
  var overlayVisible = false;

  function createProtectionOverlay() {
    if (protectionOverlay) return;
    protectionOverlay = document.createElement('div');
    protectionOverlay.id = 'screenshot-protection-overlay';
    protectionOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
      'background:linear-gradient(135deg,#1e3a5f 0%,#0f1b2d 100%);z-index:2147483647;' +
      'display:flex;align-items:center;justify-content:center;direction:rtl;font-family:Tajawal,sans-serif;' +
      'pointer-events:all;';
    protectionOverlay.innerHTML = '<div style="text-align:center;color:white;">' +
      '<div style="font-size:4rem;margin-bottom:20px;">🛡️</div>' +
      '<h2 style="font-size:1.8rem;margin-bottom:10px;">المحتوى محمي</h2>' +
      '<p style="color:#94a3b8;font-size:1.1rem;">لقطات الشاشة غير مسموح بها</p>' +
      '<p style="color:#64748b;font-size:0.85rem;margin-top:8px;">نظام المدينة الصحية - محافظة قلوة</p>' +
      '</div>';
    // إضافة الغطاء مسبقاً لكن مخفي
    protectionOverlay.style.display = 'none';
    document.documentElement.appendChild(protectionOverlay);
  }

  function showProtectionOverlay() {
    if (isScreenshotAllowed() || overlayVisible) return;
    createProtectionOverlay();
    if (protectionOverlay) {
      protectionOverlay.style.display = 'flex';
      overlayVisible = true;
    }
  }

  function hideProtectionOverlay() {
    if (protectionOverlay && overlayVisible) {
      protectionOverlay.style.display = 'none';
      overlayVisible = false;
    }
  }

  // --- أ) اعتراض PrintScreen وتنظيف الحافظة فوراً ---
  document.addEventListener('keyup', function(e) {
    if (isScreenshotAllowed()) return;
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      // عرض الغطاء فوراً
      showProtectionOverlay();
      // تنظيف الحافظة
      try { navigator.clipboard.writeText('').catch(function(){}); } catch(ex) {}
      try {
        var canvas = document.createElement('canvas');
        canvas.width = 1; canvas.height = 1;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(0, 0, 1, 1);
        canvas.toBlob(function(blob) {
          try {
            var item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).catch(function(){});
          } catch(ex2) {}
        });
      } catch(ex3) {}
      e.preventDefault();
      // إخفاء بعد ثانيتين
      setTimeout(hideProtectionOverlay, 2000);
    }
  });

  // --- ب) اعتراض جميع اختصارات التصوير ---
  document.addEventListener('keydown', function(e) {
    if (isScreenshotAllowed()) return;

    var blocked = false;

    // PrintScreen (مباشر أو مع أي مفتاح)
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      blocked = true;
    }
    // Win+Shift+S (أداة القص)
    if (e.shiftKey && (e.key === 'S' || e.key === 's') && (e.metaKey || e.ctrlKey)) {
      blocked = true;
    }
    // Win+PrtScn
    if (e.metaKey && (e.key === 'PrintScreen' || e.keyCode === 44)) {
      blocked = true;
    }
    // Alt+PrintScreen
    if (e.altKey && (e.key === 'PrintScreen' || e.keyCode === 44)) {
      blocked = true;
    }
    // Ctrl+PrintScreen
    if (e.ctrlKey && (e.key === 'PrintScreen' || e.keyCode === 44)) {
      blocked = true;
    }
    // Win+G (Game Bar recording)
    if (e.metaKey && (e.key === 'G' || e.key === 'g')) {
      blocked = true;
    }
    // Win+Alt+PrtScn (Game Bar screenshot)
    if (e.metaKey && e.altKey && (e.key === 'PrintScreen' || e.keyCode === 44)) {
      blocked = true;
    }

    if (blocked) {
      showProtectionOverlay();
      e.preventDefault();
      e.stopImmediatePropagation();
      // تنظيف الحافظة
      try { navigator.clipboard.writeText('').catch(function(){}); } catch(ex) {}
      setTimeout(hideProtectionOverlay, 2000);
      return false;
    }
  }, true);

  // --- ج) حماية عند فقدان التركيز (Snipping Tool / Alt+Tab / تبديل نوافذ) ---
  // عند إخفاء التبويب
  document.addEventListener('visibilitychange', function() {
    if (isScreenshotAllowed()) return;
    if (document.hidden) {
      showProtectionOverlay();
    } else {
      setTimeout(hideProtectionOverlay, 500);
    }
  });

  // عند فقدان تركيز النافذة (أداة القص، Alt+Tab)
  window.addEventListener('blur', function() {
    if (isScreenshotAllowed()) return;
    showProtectionOverlay();
  });

  // عند استعادة التركيز
  window.addEventListener('focus', function() {
    if (isScreenshotAllowed()) return;
    setTimeout(hideProtectionOverlay, 400);
  });

  // --- د) تنظيف الحافظة دورياً عندما لا يكون المتصفح في التركيز ---
  setInterval(function() {
    if (isScreenshotAllowed()) return;
    if (document.hasFocus()) return;
    try { navigator.clipboard.writeText('').catch(function(){}); } catch(ex) {}
  }, 1500);

  // --- هـ) حظر Screen Capture API (مشاركة الشاشة / تسجيل الشاشة) ---
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    var originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getDisplayMedia = function(constraints) {
      if (isScreenshotAllowed()) {
        return originalGetDisplayMedia(constraints);
      }
      console.warn('[Security] Screen capture blocked');
      return Promise.reject(new DOMException('Screen capture is not allowed', 'NotAllowedError'));
    };
  }

  // --- و) CSS شامل: حماية المحتوى من التصوير والتسجيل ---
  var screenshotStyle = document.createElement('style');
  screenshotStyle.textContent =
    '/* إخفاء المحتوى في وضع Picture-in-Picture */' +
    '@media (display-mode: picture-in-picture) {' +
    '  body { visibility: hidden !important; }' +
    '  body::after { visibility: visible !important; content: "محتوى محمي"; display:flex; align-items:center; justify-content:center; height:100vh; font-size:2rem; color:white; background:#1e3a5f; }' +
    '}' +
    '/* حماية الطباعة */' +
    '@media print {' +
    '  body * { display: none !important; }' +
    '  body::after { content: "⛔ طباعة هذا المحتوى غير مسموح بها"; display: block !important; font-size: 24px; text-align: center; padding: 50px; direction: rtl; }' +
    '}';
  document.head.appendChild(screenshotStyle);

  // --- ز) مراقبة تغيرات حجم النافذة (قد تشير لأداة تصوير) ---
  var lastWidth = window.outerWidth;
  var lastHeight = window.outerHeight;
  setInterval(function() {
    if (isScreenshotAllowed()) return;
    var wDiff = Math.abs(window.outerWidth - lastWidth);
    var hDiff = Math.abs(window.outerHeight - lastHeight);
    // تغير مفاجئ كبير → قد تكون أداة تصوير
    if (wDiff > 200 || hDiff > 200) {
      showProtectionOverlay();
      setTimeout(hideProtectionOverlay, 1500);
    }
    lastWidth = window.outerWidth;
    lastHeight = window.outerHeight;
  }, 500);

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
