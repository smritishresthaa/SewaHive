// utils/sendEmail.js
const nodemailer = require("nodemailer");

async function sendEmail(to, subject, html) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Email disabled: missing EMAIL_USER/EMAIL_PASS. Skipping send.");
        return { messageId: "dev-skip" };
      }

      throw new Error("Email service not configured.");
    }

    // Create transporter using Gmail + App Password
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // Gmail requires SSL
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Actual email send
    const info = await transporter.sendMail({
      from: `"SewaHive" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("📧 Email sent successfully →", info.messageId);
    return info;
    
  } catch (err) {
    console.error("❌ Email sending failed:", err);
    if (process.env.NODE_ENV !== "production") {
      console.warn("DEV fallback: skipping email send after failure.");
      return { messageId: "dev-skip" };
    }

    throw new Error("Email could not be sent.");
  }
}

module.exports = sendEmail;
