import { api } from '@/api/apiClient';

function openSecureDialog({
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  confirmVariant = 'default',
  askPassword = false,
}) {
  if (typeof document === 'undefined') return Promise.resolve({ confirmed: false, value: '' });

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(15,23,42,.55)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'z-index:99999',
      'padding:16px',
    ].join(';');

    const dialog = document.createElement('div');
    dialog.style.cssText = [
      'width:min(520px, 100%)',
      'background:#fff',
      'border:1px solid #e2e8f0',
      'border-radius:12px',
      'box-shadow:0 20px 50px rgba(0,0,0,.20)',
      'padding:18px',
      'direction:rtl',
      'font-family:inherit',
    ].join(';');

    const titleEl = document.createElement('h3');
    titleEl.textContent = title || 'تأكيد';
    titleEl.style.cssText = 'margin:0 0 8px 0;font-size:18px;font-weight:700;color:#0f172a;';

    const messageEl = document.createElement('p');
    messageEl.textContent = message || '';
    messageEl.style.cssText = 'margin:0 0 14px 0;font-size:14px;line-height:1.8;color:#334155;';

    const input = document.createElement('input');
    if (askPassword) {
      input.type = 'password';
      input.placeholder = 'أدخل كلمة مرور الدخول';
      input.style.cssText = [
        'width:100%',
        'height:40px',
        'border:1px solid #cbd5e1',
        'border-radius:8px',
        'padding:0 12px',
        'font-size:14px',
        'margin:0 0 14px 0',
        'box-sizing:border-box',
      ].join(';');
    }

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = cancelText;
    cancelBtn.style.cssText = [
      'height:36px',
      'padding:0 14px',
      'border:1px solid #cbd5e1',
      'background:#fff',
      'color:#0f172a',
      'border-radius:8px',
      'cursor:pointer',
    ].join(';');

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.textContent = confirmText;
    const isDanger = confirmVariant === 'danger';
    confirmBtn.style.cssText = [
      'height:36px',
      'padding:0 14px',
      `border:1px solid ${isDanger ? '#dc2626' : '#2563eb'}`,
      `background:${isDanger ? '#dc2626' : '#2563eb'}`,
      'color:#fff',
      'border-radius:8px',
      'cursor:pointer',
    ].join(';');

    if (askPassword) confirmBtn.disabled = true;

    const cleanup = (result) => {
      window.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      resolve(result);
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cleanup({ confirmed: false, value: '' });
      }
      if (event.key === 'Enter' && (!askPassword || input.value.trim())) {
        event.preventDefault();
        cleanup({ confirmed: true, value: askPassword ? input.value : '' });
      }
    };

    cancelBtn.onclick = () => cleanup({ confirmed: false, value: '' });
    confirmBtn.onclick = () => cleanup({ confirmed: true, value: askPassword ? input.value : '' });
    overlay.onclick = (event) => {
      if (event.target === overlay) cleanup({ confirmed: false, value: '' });
    };

    if (askPassword) {
      input.oninput = () => {
        confirmBtn.disabled = !input.value.trim();
      };
    }

    dialog.appendChild(titleEl);
    dialog.appendChild(messageEl);
    if (askPassword) dialog.appendChild(input);
    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    window.addEventListener('keydown', onKeyDown);

    if (askPassword) {
      input.focus();
    } else {
      confirmBtn.focus();
    }
  });
}

async function verifyCurrentUserPassword(password) {
  const currentUser = await api.auth.me();
  const nationalId = String(currentUser?.national_id || '').trim();
  const email = String(currentUser?.email || '').trim().toLowerCase();

  const members = await api.entities.TeamMember.list();
  const member = members.find((m) => {
    const byNationalId = nationalId && String(m.national_id || '').trim() === nationalId;
    const byEmail = email && String(m.email || '').trim().toLowerCase() === email;
    return byNationalId || byEmail;
  });

  if (!member) return false;
  return String(member.password || '') === String(password || '');
}

export async function requireSecureDeleteConfirmation(itemLabel = 'هذا العنصر') {
  if (typeof window === 'undefined') return false;

  const warningStep = await openSecureDialog({
    title: 'تحذير قبل الحذف',
    message: `أنت على وشك حذف ${itemLabel}. هذا الإجراء قد يؤثر على البيانات المرتبطة.`,
    confirmText: 'متابعة',
    confirmVariant: 'danger',
  });
  if (!warningStep.confirmed) return false;

  const passwordStep = await openSecureDialog({
    title: 'تأكيد الهوية',
    message: 'لتأكيد الحذف، أدخل كلمة مرور الدخول للحساب الحالي.',
    confirmText: 'تحقق',
    askPassword: true,
  });
  if (!passwordStep.confirmed) return false;

  const isValid = await verifyCurrentUserPassword(passwordStep.value);
  if (!isValid) {
    await openSecureDialog({
      title: 'فشل التحقق',
      message: 'كلمة المرور غير صحيحة. تم إلغاء عملية الحذف.',
      confirmText: 'إغلاق',
      cancelText: 'إغلاق',
    });
    return false;
  }

  const finalStep = await openSecureDialog({
    title: 'تأكيد نهائي',
    message: `تم التحقق من كلمة المرور. هل تريد حذف ${itemLabel} نهائيًا؟`,
    confirmText: 'حذف نهائي',
    confirmVariant: 'danger',
  });

  return finalStep.confirmed;
}
