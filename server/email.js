/**
 * إرسال البريد الإلكتروني عبر SMTP (عند ضبط المتغيرات في البيئة)
 * المرسل الافتراضي: admin@qeelwah.com — المتغيرات في Railway: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS، واختياري: MAIL_FROM
 */
import nodemailer from 'nodemailer';

const DEFAULT_MAIL_FROM = 'admin@qeelwah.com';

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
    // للمنافذ 587 مع TLS (مثل GoDaddy)
    ...(port === 587 && !secure && { requireTLS: true }),
  });
  return transporter;
}

export function isEmailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** للتحقق من اتصال SMTP (للتشخيص) — لا يرسل بريداً */
export async function verifySmtpConnection() {
  const trans = getTransporter();
  if (!trans) return { ok: false, error: 'SMTP غير مضبوط: أضف SMTP_HOST و SMTP_USER و SMTP_PASS في Variables' };
  try {
    await trans.verify();
    return { ok: true };
  } catch (e) {
    const msg = e.message || e.code || String(e);
    console.error('[SMTP verify]', msg);
    return { ok: false, error: msg };
  }
}

export async function sendVerificationEmail(to, code) {
  const trans = getTransporter();
  if (!trans) return { ok: false, error: 'البريد غير مضبوط' };
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || DEFAULT_MAIL_FROM;
  try {
    await trans.sendMail({
      from: `"المدينة الصحية - قلوة" <${from}>`,
      to,
      subject: 'رمز التحقق - المدينة الصحية محافظة قلوة',
      text: `مرحباً،\n\nرمز التحقق الخاص بك هو: ${code}\n\nالرمز صالح لمدة 5 دقائق فقط.\n\nإذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.\n\nتحياتنا،\nفريق المدينة الصحية - محافظة قلوة`,
      html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 500px;">
        <p>مرحباً،</p>
        <p>رمز التحقق الخاص بك هو: <strong style="font-size: 1.2em; letter-spacing: 2px;">${code}</strong></p>
        <p>الرمز صالح لمدة 5 دقائق فقط.</p>
        <p>إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.</p>
        <p>تحياتنا،<br/>فريق المدينة الصحية - محافظة قلوة</p>
      </div>
    `,
    });
    return { ok: true };
  } catch (e) {
    const msg = e.message || String(e);
    console.error('[SMTP]', msg);
    return { ok: false, error: msg };
  }
}
