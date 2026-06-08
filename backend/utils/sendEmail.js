const sgMail = require("@sendgrid/mail");

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_FROM = process.env.EMAIL_FROM || `SewaHive <${EMAIL_USER}>`;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

async function sendEmail(to, subject, html) {
  const recipient = String(to || "").trim();

  if (!recipient) throw new Error("Recipient email is required.");
  if (!isValidEmail(recipient)) throw new Error("Invalid recipient email.");
  if (!SENDGRID_API_KEY) throw new Error("SendGrid API key is missing.");

  const [response] = await sgMail.send({
    to: recipient,
    from: EMAIL_FROM,
    subject: String(subject || "").trim(),
    html: String(html || ""),
  });

  console.log("Email sent:", {
    provider: "sendgrid",
    statusCode: response?.statusCode,
  });

  return { messageId: response?.headers?.["x-message-id"] };
}

module.exports = sendEmail;