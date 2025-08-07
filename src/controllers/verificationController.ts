import { Request, Response } from "express";
import { User, PhoneVerification, EmailVerificationLink } from "../models";
import { sendVerificationCode as sendTwilioSMS } from "../config/twilio";
import {
  sendEmailVerificationLink as sendEmailVerificationLinkEmail,
  generateEmailVerificationToken,
} from "../config/email";

// Generate a random 6-digit code
const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification code
export const sendVerificationCode = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
      return;
    }

    // Check if phone number is already verified for an existing user
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser && existingUser.isPhoneVerified) {
      res.status(400).json({
        success: false,
        message: "Phone number is already verified for another user",
      });
      return;
    }

    // Generate verification code
    const code = generateVerificationCode();

    // Delete any existing verification codes for this phone number
    await PhoneVerification.deleteMany({ phoneNumber });

    // Create new verification record
    const verification = new PhoneVerification({
      phoneNumber,
      code,
    });

    await verification.save();

    // Send SMS via Twilio
    const smsSent = await sendTwilioSMS(phoneNumber, code);

    if (!smsSent) {
      res.status(500).json({
        success: false,
        message: "Failed to send verification code. Please try again.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Verification code sent successfully",
      data: {
        phoneNumber,
        expiresIn: "10 minutes",
      },
    });
  } catch (error) {
    console.error("Send verification code error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while sending verification code",
    });
  }
};

// Verify phone number
export const verifyPhoneNumber = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      res.status(400).json({
        success: false,
        message: "Phone number and verification code are required",
      });
      return;
    }

    // Find the verification record
    const verification = await PhoneVerification.findOne({
      phoneNumber,
      code,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!verification) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired verification code",
      });
      return;
    }

    // Mark verification as used and delete the record
    verification.isUsed = true;
    await verification.save();

    // Delete the verification record after successful verification
    await PhoneVerification.deleteOne({ _id: verification._id });

    // Create or update user with verified phone number
    let user = await User.findOne({ phoneNumber });
    if (user) {
      // Update existing user
      user.isPhoneVerified = true;
      await user.save();
    } else {
      // Create new user with verified phone and default values
      user = new User({
        phoneNumber,
        name: "", // Empty string for name
        isPhoneVerified: true,
        isEmailVerified: false, // Email verification pending
        userRole: "traveller", // Default role
      });
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: "Phone number verified successfully",
      data: {
        phoneNumber,
        isPhoneVerified: true,
        isEmailVerified: user.isEmailVerified,
        userId: user._id,
      },
    });
  } catch (error) {
    console.error("Verify phone number error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while verifying phone number",
    });
  }
};

// Resend verification code
export const resendVerificationCode = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
      return;
    }

    // Check if there's a recent verification attempt (within 1 minute)
    const recentVerification = await PhoneVerification.findOne({
      phoneNumber,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) }, // 1 minute ago
    });

    if (recentVerification) {
      res.status(429).json({
        success: false,
        message: "Please wait 1 minute before requesting another code",
      });
      return;
    }

    // Generate new verification code
    const code = generateVerificationCode();

    // Delete any existing verification codes for this phone number
    await PhoneVerification.deleteMany({ phoneNumber });

    // Create new verification record
    const verification = new PhoneVerification({
      phoneNumber,
      code,
    });

    await verification.save();

    // Send SMS via Twilio
    const smsSent = await sendTwilioSMS(phoneNumber, code);

    if (!smsSent) {
      res.status(500).json({
        success: false,
        message: "Failed to send verification code. Please try again.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Verification code resent successfully",
      data: {
        phoneNumber,
        expiresIn: "10 minutes",
      },
    });
  } catch (error) {
    console.error("Resend verification code error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while resending verification code",
    });
  }
};

// Register user after phone verification
export const registerUserAfterVerification = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { phoneNumber, name, userRole } = req.body;

    if (!phoneNumber || !name) {
      res.status(400).json({
        success: false,
        message: "Phone number and name are required",
      });
      return;
    }

    // Check if user exists and is verified
    const existingUser = await User.findOne({
      phoneNumber,
      isPhoneVerified: true,
    });

    if (!existingUser) {
      res.status(400).json({
        success: false,
        message: "Phone number must be verified before registration",
      });
      return;
    }

    // Update existing user with additional info
    existingUser.name = name;
    if (userRole) {
      existingUser.userRole = userRole;
    }
    // Keep email verification status as is (false for phone-only registration)
    await existingUser.save();

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: existingUser._id,
          name: existingUser.name,
          phoneNumber: existingUser.phoneNumber,
          isPhoneVerified: existingUser.isPhoneVerified,
          isEmailVerified: existingUser.isEmailVerified,
          isProfileSetup: existingUser.isProfileSetup || false,
          userRole: existingUser.userRole,
        },
      },
    });
  } catch (error) {
    console.error("Register user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while registering user",
    });
  }
};

// Send email verification link
export const sendEmailVerificationLink = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });
      return;
    }

    // Check if email is already verified for an existing user
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isEmailVerified) {
      res.status(400).json({
        success: false,
        message: "Email is already verified for another user",
      });
      return;
    }

    // Generate verification token
    const token = generateEmailVerificationToken();

    // Delete any existing verification links for this email
    await EmailVerificationLink.deleteMany({ email });

    // Create new verification record
    const verification = new EmailVerificationLink({
      email,
      token,
    });

    await verification.save();

    // Construct verification URL
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const verificationUrl = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(
      email
    )}`;

    // Send email verification link
    const emailSent = await sendEmailVerificationLinkEmail(
      email,
      token,
      verificationUrl
    );

    if (!emailSent) {
      res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Email verification link sent successfully",
      data: {
        email,
        expiresIn: "24 hours",
      },
    });
  } catch (error) {
    console.error("Send email verification link error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while sending verification email",
    });
  }
};

// Verify email address
export const verifyEmailAddress = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      res.status(400).json({
        success: false,
        message: "Verification token and email are required",
      });
      return;
    }

    // Find the verification record
    const verification = await EmailVerificationLink.findOne({
      email,
      token,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!verification) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired verification link",
      });
      return;
    }

    // Mark verification as used
    verification.isUsed = true;
    await verification.save();

    // Delete the verification record after successful verification
    await EmailVerificationLink.deleteOne({ _id: verification._id });

    // Create or update user with verified email
    let user = await User.findOne({ email });
    if (user) {
      // Update existing user
      user.isEmailVerified = true;
      await user.save();
    } else {
      // Create new user with verified email and default values
      user = new User({
        email,
        name: "", // Empty string for name
        isPhoneVerified: false, // Phone verification pending
        isEmailVerified: true,
        userRole: "traveller", // Default role
      });
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: "Email address verified successfully",
      data: {
        email,
        isEmailVerified: true,
        isPhoneVerified: user.isPhoneVerified,
        userId: user._id,
      },
    });
  } catch (error) {
    console.error("Verify email address error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while verifying email address",
    });
  }
};

// Resend email verification link
export const resendEmailVerificationLink = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });
      return;
    }

    // Check if there's a recent verification attempt (within 5 minutes)
    const recentVerification = await EmailVerificationLink.findOne({
      email,
      createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) }, // 5 minutes ago
    });

    if (recentVerification) {
      res.status(429).json({
        success: false,
        message:
          "Please wait 5 minutes before requesting another verification link",
      });
      return;
    }

    // Generate new verification token
    const token = generateEmailVerificationToken();

    // Delete any existing verification links for this email
    await EmailVerificationLink.deleteMany({ email });

    // Create new verification record
    const verification = new EmailVerificationLink({
      email,
      token,
    });

    await verification.save();

    // Construct verification URL
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const verificationUrl = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(
      email
    )}`;

    // Send email verification link
    const emailSent = await sendEmailVerificationLinkEmail(
      email,
      token,
      verificationUrl
    );

    if (!emailSent) {
      res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Email verification link resent successfully",
      data: {
        email,
        expiresIn: "24 hours",
      },
    });
  } catch (error) {
    console.error("Resend email verification link error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while resending verification email",
    });
  }
};
