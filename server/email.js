/**
 * إرسال البريد: إما عبر SMTP أو عبر Resend (HTTP).
 * إذا وُجد RESEND_API_KEY يُستخدم Resend (لا يحتاج SMTP — يناسب Railway عند حجب المنافذ).
 * وإلا: SMTP (GoDaddy/Office 365/Gmail). المتغيرات: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS؛ اختياري: MAIL_FROM, SMTP_SECURE
 */
import nodemailer from 'nodemailer';

const DEFAULT_MAIL_FROM = 'admin@qeelwah.com';

const SUBJECT = 'رمز التحقق - المدينة الصحية محافظة قلوة';
const textBody = (code) =>
  `مرحباً،\n\nرمز التحقق الخاص بك هو: ${code}\n\nالرمز صالح لمدة 5 دقائق فقط.\n\nإذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.\n\nتحياتنا،\nفريق المدينة الصحية - محافظة قلوة`;
const htmlBody = (code) => `
<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 500px;">
  <p>مرحباً،</p>
  <p>رمز التحقق الخاص بك هو: <strong style="font-size: 1.2em; letter-spacing: 2px;">${code}</strong></p>
  <p>الرمز صالح لمدة 5 دقائق فقط.</p>
  <p>إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.</p>
  <p>تحياتنا،<br/>فريق المدينة الصحية - محافظة قلوة</p>
</div>`;

function useResend() {
  return !!(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim());
}

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 20000,
    greetingTimeout: 15000,
    ...(port === 587 && !secure && { requireTLS: true }),
  });
  return transporter;
}

export function isEmailConfigured() {
  if (useResend()) return true;
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** للتحقق من اتصال البريد (للتشخيص) */
export async function verifySmtpConnection() {
  if (useResend()) {
    return { ok: true }; // Resend يعمل عبر HTTPS ولا نحتاج فحص اتصال
  }
  const trans = getTransporter();
  if (!trans) return { ok: false, error: 'SMTP غير مضبوط. أضف SMTP_HOST و SMTP_USER و SMTP_PASS، أو استخدم RESEND_API_KEY.' };
  try {
    await trans.verify();
    return { ok: true };
  } catch (e) {
    const msg = e.message || e.code || String(e);
    console.error('[SMTP verify]', msg);
    return { ok: false, error: msg };
  }
}

async function sendViaResend(to, from, subject, text, html) {
  const key = process.env.RESEND_API_KEY.trim();
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      from: `"المدينة الصحية - قلوة" <${from}>`,
      to: [to],
      subject,
      text,
      html,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status >= 400) {
    const err = data.message || data.error?.message || `HTTP ${res.status}`;
    throw new Error(err);
  }
  return { ok: true };
}

export async function sendVerificationEmail(to, code) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || DEFAULT_MAIL_FROM;
  const subject = SUBJECT;
  const text = textBody(code);
  const html = htmlBody(code);

  if (useResend()) {
    try {
      await sendViaResend(to, from, subject, text, html);
      return { ok: true };
    } catch (e) {
      const msg = e.message || String(e);
      console.error('[Resend]', msg);
      return { ok: false, error: msg };
    }
  }

  const trans = getTransporter();
  if (!trans) return { ok: false, error: 'البريد غير مضبوط' };
  try {
    await trans.sendMail({
      from: `"المدينة الصحية - قلوة" <${from}>`,
      to,
      subject,
      text,
      html,
    });
    return { ok: true };
  } catch (e) {
    const msg = e.message || String(e);
    console.error('[SMTP]', msg);
    return { ok: false, error: msg };
  }
}
