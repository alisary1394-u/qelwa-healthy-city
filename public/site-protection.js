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

  // ========== 13. حماية من لقطات الشاشة ==========
  // علامة عامة: المشرف العام يضعها true من React
  window.__ALLOW_SCREENSHOTS = false;

  function isScreenshotAllowed() {
    return window.__ALLOW_SCREENSHOTS === true;
  }

  // --- أ) اعتراض مفتاح PrintScreen وتنظيف الحافظة ---
  document.addEventListener('keyup', function(e) {
    if (isScreenshotAllowed()) return;
    // PrintScreen key
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      // تنظيف الحافظة فوراً
      try {
        navigator.clipboard.writeText('').catch(function(){});
      } catch(ex) {}
      // كتابة صورة فارغة للحافظة
      try {
        var canvas = document.createElement('canvas');
        canvas.width = 1; canvas.height = 1;
        canvas.toBlob(function(blob) {
          try {
            var item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).catch(function(){});
          } catch(ex2) {}
        });
      } catch(ex3) {}
      e.preventDefault();
    }
  });

  // --- ب) اعتراض Win+Shift+S و Ctrl+Shift+S ---
  document.addEventListener('keydown', function(e) {
    if (isScreenshotAllowed()) return;
    // Shift+S مع Meta (Windows key) أو Ctrl
    if (e.shiftKey && (e.key === 'S' || e.key === 's') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // PrintScreen مباشر
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      e.preventDefault();
      return false;
    }
  }, true);

  // --- ج) إخفاء المحتوى عند فقدان التركيز (Snipping Tool / Alt+Tab) ---
  var protectionOverlay = null;

  function createProtectionOverlay() {
    if (protectionOverlay) return;
    protectionOverlay = document.createElement('div');
    protectionOverlay.id = 'screenshot-protection-overlay';
    protectionOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
      'background:linear-gradient(135deg,#1e3a5f 0%,#0f1b2d 100%);z-index:999999;' +
      'display:flex;align-items:center;justify-content:center;direction:rtl;font-family:Tajawal,sans-serif;';
    protectionOverlay.innerHTML = '<div style="text-align:center;color:white;">' +
      '<div style="font-size:4rem;margin-bottom:20px;">🛡️</div>' +
      '<h2 style="font-size:1.5rem;margin-bottom:10px;">المحتوى محمي</h2>' +
      '<p style="color:#94a3b8;font-size:1rem;">لقطات الشاشة غير مسموح بها</p>' +
      '<p style="color:#64748b;font-size:0.85rem;margin-top:8px;">نظام المدينة الصحية - محافظة قلوة</p>' +
      '</div>';
  }

  function showProtectionOverlay() {
    if (isScreenshotAllowed()) return;
    createProtectionOverlay();
    if (!document.body.contains(protectionOverlay)) {
      document.body.appendChild(protectionOverlay);
    }
  }

  function hideProtectionOverlay() {
    if (protectionOverlay && document.body.contains(protectionOverlay)) {
      document.body.removeChild(protectionOverlay);
    }
  }

  // عند فقدان التركيز: إظهار الغطاء الواقي
  document.addEventListener('visibilitychange', function() {
    if (isScreenshotAllowed()) return;
    if (document.hidden) {
      showProtectionOverlay();
    } else {
      // تأخير قصير لضمان أن الـ Snipping Tool أخذ صورة الغطاء
      setTimeout(hideProtectionOverlay, 300);
    }
  });

  window.addEventListener('blur', function() {
    if (isScreenshotAllowed()) return;
    showProtectionOverlay();
  });

  window.addEventListener('focus', function() {
    setTimeout(hideProtectionOverlay, 200);
  });

  // --- د) تنظيف الحافظة دورياً من الصور ---
  setInterval(function() {
    if (isScreenshotAllowed()) return;
    if (document.hasFocus()) return; // لا نمسح أثناء الاستخدام العادي
    try {
      navigator.clipboard.writeText('').catch(function(){});
    } catch(ex) {}
  }, 2000);

  // --- هـ) CSS إضافي: حماية المحتوى من التصوير ---
  var screenshotStyle = document.createElement('style');
  screenshotStyle.textContent = 
    '@media screen {' +
    '  .screenshot-protect { position: relative; }' +
    '}' +
    '/* منع التقاط عبر Screen Capture API */' +
    '@media (display-mode: picture-in-picture) {' +
    '  body { visibility: hidden !important; }' +
    '}';
  document.head.appendChild(screenshotStyle);

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
