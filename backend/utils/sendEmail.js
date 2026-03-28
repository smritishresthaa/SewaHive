const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

const transporter =
  EMAIL_USER && EMAIL_PASS
    ? nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS,
        },
      })
    : null;

async function sendEmail(to, subject, html) {
  try {
    const recipient = String(to || '').trim();

    if (!recipient) {
      throw new Error('Recipient email is required.');
    }

    if (!isValidEmail(recipient)) {
      throw new Error(`Invalid recipient email: ${recipient}`);
    }

    if (!EMAIL_USER || !EMAIL_PASS || !transporter) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          'Email disabled: missing EMAIL_USER/EMAIL_PASS. Skipping send.'
        );
        return { messageId: 'dev-skip' };
      }

      throw new Error('Email service not configured.');
    }

    const info = await transporter.sendMail({
      from: `"SewaHive" <${EMAIL_USER}>`,
      to: recipient,
      subject: String(subject || '').trim(),
      html: String(html || ''),
    });

    console.log('📧 Email sent successfully →', info.messageId);
    return info;
  } catch (err) {
    console.error('❌ Email sending failed:', err.message || err);

    if (process.env.NODE_ENV !== 'production') {
      console.warn('DEV fallback: skipping email send after failure.');
      return { messageId: 'dev-skip' };
    }

    throw new Error('Email could not be sent.');
  }
}

module.exports = sendEmail;