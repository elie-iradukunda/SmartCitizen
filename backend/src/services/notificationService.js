import nodemailer from 'nodemailer';

const enabled = (value) => ['true', '1', 'yes'].includes(String(value || '').toLowerCase());

const smtpConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const twilioConfigured = () => Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);

const mailTransport = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: enabled(process.env.SMTP_SECURE),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const normalizePhone = (phone = '') => String(phone || '').replace(/[^\d+]/g, '');

export const notificationService = {
  async sendEmail({ to, subject, text, html }) {
    if (!to || !smtpConfigured()) {
      if (process.env.NOTIFICATION_DEBUG === 'true') {
        console.log('[notification:email:skipped]', { to, subject });
      }
      return { sent: false, reason: 'smtp-not-configured' };
    }

    await mailTransport().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html
    });
    return { sent: true };
  },

  async sendSms({ to, body }) {
    const phone = normalizePhone(to);
    if (!phone || !twilioConfigured()) {
      if (process.env.NOTIFICATION_DEBUG === 'true') {
        console.log('[notification:sms:skipped]', { to: phone, body });
      }
      return { sent: false, reason: 'twilio-not-configured' };
    }

    const credentials = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: process.env.TWILIO_FROM,
        To: phone,
        Body: body
      })
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Twilio SMS failed: ${details}`);
    }
    return { sent: true };
  },

  async sendComplaintUpdate({ user, phone, trackingNumber, title, message }) {
    const subject = `${title} - ${trackingNumber}`;
    const text = `${message}\n\nTracking number: ${trackingNumber}`;
    const jobs = [
      this.sendEmail({ to: user?.email, subject, text }),
      this.sendSms({ to: phone || user?.phone, body: text })
    ];
    const results = await Promise.allSettled(jobs);
    results
      .filter((result) => result.status === 'rejected')
      .forEach((result) => console.error('[notification:complaint-update]', result.reason?.message || result.reason));
    return results;
  },

  async sendPasswordReset({ user, resetLink, token, expiresInMinutes }) {
    const publicBase = process.env.PUBLIC_APP_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    const absoluteLink = resetLink.startsWith('http') ? resetLink : `${publicBase}${resetLink}`;
    const text = [
      `Hello ${user.fullName},`,
      '',
      `Use this link to reset your Smart Citizen password. It expires in ${expiresInMinutes} minutes:`,
      absoluteLink,
      '',
      `Demo token: ${token}`
    ].join('\n');
    return this.sendEmail({
      to: user.email,
      subject: 'Reset your Smart Citizen password',
      text,
      html: `<p>Hello ${user.fullName},</p><p>Use this link to reset your Smart Citizen password. It expires in ${expiresInMinutes} minutes:</p><p><a href="${absoluteLink}">${absoluteLink}</a></p>`
    });
  }
};
