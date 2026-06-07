const nodemailer = require("nodemailer");

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || `SewaHive <${EMAIL_USER}>`;

function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

const transporter =
  EMAIL_USER && EMAIL_PASS
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS,
        },
      })
    : null;

async function sendEmail(to, subject, html) {
  const recipient = String(to || "").trim();

  if (!recipient) {
    throw new Error("Recipient email is required.");
  }

  if (!isValidEmail(recipient)) {
    throw new Error("Invalid recipient email.");
  }

  if (!transporter) {
    throw new Error("SMTP email service is not configured.");
  }

  const info = await transporter.sendMail({
    from: EMAIL_FROM,
    to: recipient,
    subject: String(subject || "").trim(),
    html: String(html || ""),
  });

  console.log("Email sent:", {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  });

  return { messageId: info.messageId };
}

module.exports = sendEmail;