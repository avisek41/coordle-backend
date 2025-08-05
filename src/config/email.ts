import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create transporter for sending emails
const createTransporter = () => {
  // Default to Gmail SMTP
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MY_GMAIL,
      pass: process.env.MY_PASSWORD, // Use app password for Gmail
    },
  });
};

// Send password reset email
export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  resetUrl: string
): Promise<boolean> => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.MY_GMAIL,
      to: email,
      subject: "Password Reset Request - Coordle",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You have requested to reset your password for your Coordle account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>Best regards,<br>The Coordle Team</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Password reset email sent:", info.messageId);

    // If using test account, show the preview URL
    if (info.messageId && info.messageId.includes("ethereal")) {
      console.log(
        "Test email sent. Preview URL:",
        nodemailer.getTestMessageUrl(info)
      );
    }

    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
};

// Send email verification code for 2FA
export const sendEmailVerificationCode = async (
  email: string,
  verificationCode: string
): Promise<boolean> => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.MY_GMAIL || "noreply@coordle.com",
      to: email,
      subject: "Email Verification Code - Coordle",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Verification Code</h2>
          <p>Hello,</p>
          <p>Your email verification code is:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f8f9fa; border: 2px solid #007bff; border-radius: 10px; padding: 20px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #007bff;">
              ${verificationCode}
            </div>
          </div>
          <p><strong>This code will expire in 10 minutes.</strong></p>
          <p>If you didn't request this verification code, please ignore this email.</p>
          <p>Best regards,<br>The Coordle Team</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email verification code sent:", info.messageId);

    // If using test account, show the preview URL
    if (info.messageId && info.messageId.includes("ethereal")) {
      console.log(
        "Test email sent. Preview URL:",
        nodemailer.getTestMessageUrl(info)
      );
    }

    return true;
  } catch (error) {
    console.error("Error sending email verification code:", error);
    return false;
  }
};

// Generate a random 6-digit verification code
export const generateEmailVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate a secure random token
export const generateResetToken = (): string => {
  return require("crypto").randomBytes(32).toString("hex");
};
