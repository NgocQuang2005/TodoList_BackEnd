// src/utils/email.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail(to, subject, text) {
  try {
    const info = await transporter.sendMail({
      from: `"Ngọc Quang(Todo App) 👻" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log("📩 Email sent:", info.messageId);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw new Error("Could not send email");
  }
}

module.exports = { sendEmail };
