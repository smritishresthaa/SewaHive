// backend/utils/notifications.js
let twilioClient;
try {
  const twilio = require('twilio');
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = new twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
} catch (err) {
  console.warn('Twilio not configured or failed to load:', err.message);
}

let transporter;
try {
  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
} catch (err) {
  console.warn('Nodemailer not configured or failed to load:', err.message);
}

async function sendPush(to, message) {
  // TODO: integrate FCM here – for now just act as a stub
  return { ok: true };
}

async function sendSMS(to, message) {
  if (!twilioClient) return { ok: false, reason: 'twilio_not_configured' };
  if (!to) return { ok: false, reason: 'no_recipient' };

  const from = process.env.TWILIO_FROM;
  const res = await twilioClient.messages.create({ to, from, body: message });
  return { ok: true, sid: res.sid };
}

async function sendEmail(to, subject, html) {
  if (!transporter) return { ok: false, reason: 'email_not_configured' };
  if (!to) return { ok: false, reason: 'no_recipient' };

  const res = await transporter.sendMail({
    to,
    from: process.env.EMAIL_USER,
    subject,
    html,
  });

  return { ok: true, messageId: res.messageId };
}

module.exports = { sendPush, sendSMS, sendEmail };
