/* ================================================================
   نظام المدينة الصحية - JavaScript العام
   ================================================================ */

'use strict';

// ===== تهيئة Bootstrap Tooltips =====
document.addEventListener('DOMContentLoaded', function () {
    // تفعيل tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(function (el) {
        new bootstrap.Tooltip(el, { trigger: 'hover' });
    });

    // تمييز التبويب النشط بناءً على URL
    highlightActiveNav();

    // HTML5 - حفظ آخر صفحة مزارة
    sessionStorage.setItem('lastPage', window.location.pathname);
});

// ===== تمييز الرابط النشط في شريط التنقل =====
function highlightActiveNav() {
    var path = window.location.pathname.toLowerCase();
    document.querySelectorAll('#navMenu .nav-link').forEach(function (link) {
        var href = link.getAttribute('href');
        if (href && path.endsWith(href.toLowerCase())) {
            link.classList.add('active');
        }
    });
}

// ===== تأثير تحميل الصفحة =====
window.addEventListener('load', function () {
    document.body.classList.add('animate-in');
});

// ===== تأكيد الحذف ===== 
function confirmDelete(message) {
    return confirm(message || 'هل أنت متأكد من الحذف؟');
}

// ===== أرقام متحركة (HTML5 Animation) =====
function animateNumber(element, target, duration) {
    var start = 0;
    var startTime = null;
    var el = document.getElementById(element);
    if (!el) return;

    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var ease = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(start + (target - start) * ease);
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ===== تنسيق التاريخ بالعربية =====
function formatDateAr(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ===== التحقق من نموذج HTML5 =====
function validateForm(formId) {
    var form = document.getElementById(formId);
    if (!form) return true;
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return false;
    }
    return true;
}

// ===== تبديل حالة المهمة بدون إعادة تحميل =====
function quickToggleTask(taskId, newStatus) {
    var url = 'TaskHandler.ashx?id=' + encodeURIComponent(taskId) + '&status=' + encodeURIComponent(newStatus);
    fetch(url, { method: 'POST', credentials: 'same-origin' })
        .then(function (res) {
            if (res.ok) location.reload();
        })
        .catch(function () {
            console.error('خطأ في تحديث المهمة');
        });
}

// ===== طباعة الصفحة =====
function printPage() {
    window.print();
}

// ===== HTML5 - localStorage للتفضيلات =====
var QelwaApp = {
    savePreference: function (key, value) {
        try { localStorage.setItem('qelwa_' + key, JSON.stringify(value)); } catch (e) {}
    },
    getPreference: function (key, defaultValue) {
        try {
            var val = localStorage.getItem('qelwa_' + key);
            return val !== null ? JSON.parse(val) : defaultValue;
        } catch (e) { return defaultValue; }
    }
};

// ===== تأثير Ripple على الأزرار =====
document.addEventListener('click', function (e) {
    var btn = e.target.closest('.btn');
    if (!btn) return;
    var ripple = document.createElement('span');
    var rect = btn.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height);
    ripple.style.cssText = 'position:absolute;border-radius:50%;background:rgba(255,255,255,0.3);' +
        'width:' + size + 'px;height:' + size + 'px;' +
        'top:' + (e.clientY - rect.top - size / 2) + 'px;' +
        'left:' + (e.clientX - rect.left - size / 2) + 'px;' +
        'animation:ripple .5s ease-out;pointer-events:none;';
    var style = document.createElement('style');
    style.textContent = '@keyframes ripple{from{transform:scale(0);opacity:1}to{transform:scale(2);opacity:0}}';
    if (!document.getElementById('rippleStyle')) {
        style.id = 'rippleStyle';
        document.head.appendChild(style);
    }
    if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);
    setTimeout(function () { ripple.remove(); }, 500);
});
