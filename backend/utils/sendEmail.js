const { Resend } = require("resend");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "SewaHive <onboarding@resend.dev>";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

async function sendEmail(to, subject, html) {
  try {
    const recipient = String(to || "").trim();

    if (!recipient) {
      throw new Error("Recipient email is required.");
    }

    if (!isValidEmail(recipient)) {
      throw new Error(`Invalid recipient email: ${recipient}`);
    }

    if (!resend) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Email disabled: missing RESEND_API_KEY. Skipping send.");
        return { messageId: "dev-skip" };
      }

      throw new Error("Email service not configured.");
    }

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: recipient,
      subject: String(subject || "").trim(),
      html: String(html || ""),
    });

    if (error) {
      console.error("❌ Email sending failed:", error);
      throw new Error(error.message || "Email could not be sent.");
    }

    console.log("📧 Email sent successfully →", data?.id);
    return { messageId: data?.id };
  } catch (err) {
    console.error("❌ Email sending failed:", err.message || err);

    if (process.env.NODE_ENV !== "production") {
      console.warn("DEV fallback: skipping email send after failure.");
      return { messageId: "dev-skip" };
    }

    throw new Error("Email could not be sent.");
  }
}

module.exports = sendEmail;