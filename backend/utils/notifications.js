// utils/notifications.js
const axios = require("axios");
const { normalizeNepalPhone, isValidNepalMobile } = require("./phone");

// ----------------------------------------------
// EMAIL
// ----------------------------------------------
let transporter;
try {
  const nodemailer = require("nodemailer");
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
} catch (err) {
  console.warn("Nodemailer not configured or failed to load:", err.message);
}

// ----------------------------------------------
// PUSH (STUB)
// ----------------------------------------------
async function sendPush() {
  return { ok: true };
}

// ----------------------------------------------
// AAKASH SMS
// ----------------------------------------------
async function sendSMS(to, message, opts = {}) {
  const mockMode = opts.mockMode || process.env.SMS_MOCK_MODE === "true";

  if (!to) {
    return { ok: false, reason: "no_recipient" };
  }

  const phone = normalizeNepalPhone(to);

  if (!isValidNepalMobile(phone)) {
    return { ok: false, reason: "invalid_nepal_phone" };
  }

  const text = String(message || "").trim();
  if (!text) {
    return { ok: false, reason: "empty_message" };
  }

  if (mockMode) {
    console.log(`[MOCK SMS] To: ${phone} | Msg: ${text}`);
    return { ok: true, mock: true };
  }

  if (!process.env.AAKASH_SMS_TOKEN) {
    return { ok: false, reason: "missing_aakash_token" };
  }

  try {
    const response = await axios.post(
      "https://sms.aakashsms.com/sms/v3/send",
      {
        auth_token: process.env.AAKASH_SMS_TOKEN,
        to: phone,
        text,
      },
      {
        timeout: 15000,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = response?.data || {};
    const ok = data.error === false;

    if (!ok) {
      console.error("Aakash SMS API error:", data);
      return {
        ok: false,
        reason: "aakash_api_error",
        data,
      };
    }

    console.log(`Aakash SMS sent to ${phone}`);
    return {
      ok: true,
      data,
    };
  } catch (err) {
    const errorPayload = err?.response?.data || err.message;
    console.error("Aakash SMS request failed:", errorPayload);
    return {
      ok: false,
      reason: "request_failed",
      error: errorPayload,
    };
  }
}

// ----------------------------------------------
// EMAIL
// ----------------------------------------------
async function sendEmail(to, subject, html) {
  if (!transporter) return { ok: false, reason: "email_not_configured" };
  if (!to) return { ok: false, reason: "no_recipient" };

  const res = await transporter.sendMail({
    to,
    from: process.env.EMAIL_USER,
    subject,
    html,
  });

  return { ok: true, messageId: res.messageId };
}

module.exports = { sendPush, sendSMS, sendEmail };