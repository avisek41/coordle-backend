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

// Send email verification link
export const sendEmailVerificationLink = async (
  email: string,
  verificationToken: string,
  verificationUrl: string
): Promise<boolean> => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.MY_GMAIL || "noreply@coordle.com",
      to: email,
      subject: "Email Verification - Coordle",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify Your Email Address</h2>
          <p>Hello,</p>
          <p>Thank you for signing up with Coordle! Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p><strong>This verification link will expire in 24 hours.</strong></p>
          <p>If you didn't create an account with Coordle, please ignore this email.</p>
          <p>Best regards,<br>The Coordle Team</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email verification link sent:", info.messageId);

    // If using test account, show the preview URL
    if (info.messageId && info.messageId.includes("ethereal")) {
      console.log(
        "Test email sent. Preview URL:",
        nodemailer.getTestMessageUrl(info)
      );
    }

    return true;
  } catch (error) {
    console.error("Error sending email verification link:", error);
    return false;
  }
};

// Generate a secure random verification token
export const generateEmailVerificationToken = (): string => {
  return require("crypto").randomBytes(32).toString("hex");
};

// Send welcome email for invited users
export const sendWelcomeEmail = async (
  email: string,
  userName: string = "there"
): Promise<boolean> => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.MY_GMAIL || "noreply@coordle.com",
      to: email,
      subject: "Welcome to Coordle! 🎉",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #007bff; text-align: center; margin-bottom: 30px;">Welcome to Coordle! 🎉</h1>
            
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hi ${userName},</p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              You've been invited to join Coordle! We're excited to have you on board and can't wait to help you plan amazing trips with friends and family.
            </p>
            
            <div style="background-color: #e3f2fd; border-left: 4px solid #007bff; padding: 20px; margin: 30px 0; border-radius: 5px;">
              <h3 style="color: #007bff; margin-top: 0;">What you can do with Coordle:</h3>
              <ul style="color: #333; line-height: 1.8;">
                <li>🎯 Plan trips with friends and family</li>
                <li>🗺️ Organize activities and accommodations</li>
                <li>💬 Stay connected with trip chat</li>
                <li>📱 Access everything on mobile</li>
                <li>🤝 Collaborate with hosts and travelers</li>
              </ul>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              Your account is now ready to use. You can start exploring trips, join existing ones, or create your own adventure!
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${
                process.env.FRONTEND_URL || "http://localhost:3000"
              }/dashboard" 
                 style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px;">
                Get Started
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              If you have any questions or need help getting started, feel free to reach out to our support team.
            </p>
            
            <p style="color: #666; line-height: 1.6;">
              Happy travels!<br>
              <strong>The Coordle Team</strong>
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Welcome email sent:", info.messageId);

    // If using test account, show the preview URL
    if (info.messageId && info.messageId.includes("ethereal")) {
      console.log(
        "Test welcome email sent. Preview URL:",
        nodemailer.getTestMessageUrl(info)
      );
    }

    return true;
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return false;
  }
};
