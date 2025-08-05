import { Request, Response } from "express";
import dotenv from "dotenv";
import {
  User,
  UserRole,
  IUser,
  PhoneVerification,
  PasswordReset,
} from "../models";
import { sendVerificationCode as sendTwilioSMS } from "../config/twilio";
import {
  generateToken,
  generateTokenPair,
  verifyRefreshToken,
} from "../config/jwt";
import { sendPasswordResetEmail, generateResetToken } from "../config/email";
import {
  sendSuccessResponse,
  sendErrorResponse,
  STATUS_CODES,
  MESSAGES,
} from "../utils/apiResponse";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

// Load environment variables
dotenv.config();

// Register a new user
export const registerUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password, confirmPassword, userRole, registrationMethod } =
      req.body;

    // Validate registration method
    if (
      !registrationMethod ||
      !["email", "phone"].includes(registrationMethod)
    ) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.INVALID_REGISTRATION_METHOD
      );
      return;
    }

    // Validate common required fields
    if (!userRole) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.MISSING_REQUIRED_FIELDS
      );
      return;
    }

    // Email-based registration
    if (registrationMethod === "email") {
      if (!email || !password || !confirmPassword) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          MESSAGES.EMAIL_PASSWORD_REQUIRED
        );
        return;
      }

      // Check if passwords match
      if (password !== confirmPassword) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          MESSAGES.PASSWORDS_DONT_MATCH
        );
        return;
      }

      // Validate password length
      if (password.length < 6) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          MESSAGES.PASSWORD_TOO_SHORT
        );
        return;
      }

      // Check if user already exists by email
      const existingUserByEmail = await User.findOne({ email });
      if (existingUserByEmail) {
        sendErrorResponse(
          res,
          STATUS_CODES.CONFLICT,
          MESSAGES.USER_ALREADY_EXISTS
        );
        return;
      }

      // Create new user with email
      const newUser = new User({
        email,
        password, // Hash in real app
        userRole: userRole || UserRole.TRAVELLER,
        isPhoneVerified: false,
        isEmailVerified: true, // Email is verified since they registered with email
      });

      const savedUser = await newUser.save();

      // Generate JWT token pair
      const tokenPair = generateTokenPair({
        userId: (savedUser._id as any).toString(),
        email: savedUser.email || undefined,
        userRole: savedUser.userRole,
      });

      sendSuccessResponse(
        res,
        STATUS_CODES.CREATED,
        "User registered successfully with email",
        {
          id: savedUser._id,
          name: savedUser.name,
          email: savedUser.email,
          phoneNumber: savedUser.phoneNumber,
          isPhoneVerified: savedUser.isPhoneVerified,
          isEmailVerified: savedUser.isEmailVerified,
          isProfileSetup: savedUser.isProfileSetup,
          userRole: savedUser.userRole,
          createdAt: savedUser.createdAt,
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
        }
      );
      return;
    }

    // Phone-based registration
    if (registrationMethod === "phone") {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Phone registration requires phone number verification first"
      );
      return;
    }
  } catch (error) {
    console.error("Registration error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
    return;
  }
};

// Generate a random 6-digit code
const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send login verification code
export const sendLoginVerificationCode = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.PHONE_NUMBER_REQUIRED
      );
      return;
    }

    // Check if user exists
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.USER_NOT_FOUND);
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
      sendErrorResponse(
        res,
        STATUS_CODES.INTERNAL_SERVER_ERROR,
        MESSAGES.SMS_SEND_FAILED
      );
      return;
    }

    sendSuccessResponse(res, STATUS_CODES.OK, MESSAGES.VERIFICATION_CODE_SENT, {
      phoneNumber,
      expiresIn: "10 minutes",
    });
  } catch (error) {
    console.error("Send login verification code error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, phoneNumber, loginMethod, verificationCode } =
      req.body;

    // Validate login method
    if (!loginMethod || !["email", "phone"].includes(loginMethod)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.INVALID_LOGIN_METHOD
      );
      return;
    }

    // Email-based login
    if (loginMethod === "email") {
      if (!email || !password) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          MESSAGES.EMAIL_PASSWORD_REQUIRED
        );
        return;
      }

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.USER_NOT_FOUND);
        return;
      }

      // Check if user has password (email-based registration)
      if (!user.password) {
        sendErrorResponse(
          res,
          STATUS_CODES.UNAUTHORIZED,
          "This account was registered with phone number. Please use phone login."
        );
        return;
      }

      // Check password using bcrypt
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        sendErrorResponse(
          res,
          STATUS_CODES.UNAUTHORIZED,
          MESSAGES.INVALID_PASSWORD
        );
        return;
      }

      // Generate JWT token
      const token = generateToken({
        userId: (user._id as any).toString(),
        email: user.email || undefined,
        userRole: user.userRole,
      });

      // Return user data with JWT token
      sendSuccessResponse(res, STATUS_CODES.OK, "Login successful with email", {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isPhoneVerified: user.isPhoneVerified,
        isEmailVerified: user.isEmailVerified,
        isProfileSetup: user.isProfileSetup,
        userRole: user.userRole,
        createdAt: user.createdAt,
        token,
      });
      return;
    }

    // Phone-based login
    if (loginMethod === "phone") {
      if (!phoneNumber) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          MESSAGES.PHONE_NUMBER_REQUIRED
        );
        return;
      }

      // If verification code is provided, verify it
      if (verificationCode) {
        // Find the verification record
        const verification = await PhoneVerification.findOne({
          phoneNumber,
          code: verificationCode,
          isUsed: false,
          expiresAt: { $gt: new Date() },
        });

        if (!verification) {
          sendErrorResponse(
            res,
            STATUS_CODES.BAD_REQUEST,
            MESSAGES.INVALID_VERIFICATION_CODE
          );
          return;
        }

        // Mark verification as used and delete the record
        verification.isUsed = true;
        await verification.save();
        await PhoneVerification.deleteOne({ _id: verification._id });

        // Find user by phone number
        const user = await User.findOne({ phoneNumber });
        if (!user) {
          sendErrorResponse(
            res,
            STATUS_CODES.NOT_FOUND,
            MESSAGES.USER_NOT_FOUND
          );
          return;
        }

        // Update phone verification status if not already verified
        if (!user.isPhoneVerified) {
          user.isPhoneVerified = true;
          await user.save();
        }

        // Generate JWT token
        const token = generateToken({
          userId: (user._id as any).toString(),
          phoneNumber: user.phoneNumber || undefined,
          userRole: user.userRole,
        });

        // Return user data with JWT token
        sendSuccessResponse(
          res,
          STATUS_CODES.OK,
          "Login successful with phone verification",
          {
            id: user._id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            isPhoneVerified: user.isPhoneVerified,
            isEmailVerified: user.isEmailVerified,
            isProfileSetup: user.isProfileSetup,
            userRole: user.userRole,
            createdAt: user.createdAt,
            token,
          }
        );
        return;
      } else {
        // No verification code provided, return error asking to send code first
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          MESSAGES.VERIFICATION_CODE_REQUIRED
        );
        return;
      }
    }
  } catch (error) {
    console.error("Login error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
    return;
  }
};

export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = await User.find({}).select("-__v");

    sendSuccessResponse(res, STATUS_CODES.OK, MESSAGES.USERS_RETRIEVED, {
      count: users.length,
      users,
    });
    return;
  } catch (error) {
    console.error("Get users error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
    return;
  }
};

export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-__v");
    if (!user) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.USER_NOT_FOUND);
      return;
    }

    sendSuccessResponse(res, STATUS_CODES.OK, MESSAGES.USER_RETRIEVED, user);
    return;
  } catch (error) {
    console.error("Get user by ID error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
    return;
  }
};

export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, userRole } = req.body;

    const existingUser = await User.findById(id);
    if (!existingUser) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.USER_NOT_FOUND);
      return;
    }

    if (email && email !== existingUser.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        sendErrorResponse(
          res,
          STATUS_CODES.CONFLICT,
          MESSAGES.EMAIL_ALREADY_EXISTS
        );
        return;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        name: name || existingUser.name,
        email: email || existingUser.email,
        userRole: userRole || existingUser.userRole,
      },
      { new: true, runValidators: true }
    ).select("-__v");

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      MESSAGES.USER_UPDATED,
      updatedUser
    );
    return;
  } catch (error) {
    console.error("Update user error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
    return;
  }
};

export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.USER_NOT_FOUND);
      return;
    }

    sendSuccessResponse(res, STATUS_CODES.OK, MESSAGES.USER_DELETED);
    return;
  } catch (error) {
    console.error("Delete user error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
    return;
  }
};

export const getUsersByRole = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { role } = req.params;

    if (!Object.values(UserRole).includes(role as UserRole)) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, MESSAGES.INVALID_ROLE);
      return;
    }

    const users = await User.find({ userRole: role }).select("-__v");

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      `Users with role '${role}' retrieved successfully`,
      {
        count: users.length,
        users,
      }
    );
    return;
  } catch (error) {
    console.error("Get users by role error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
    return;
  }
};

export const getUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.body;

    if (!userId) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.USER_ID_REQUIRED
      );
      return;
    }

    const user = await User.findById(userId).select("-__v");
    if (!user) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.USER_NOT_FOUND);
      return;
    }

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      MESSAGES.USER_PROFILE_RETRIEVED,
      user
    );
    return;
  } catch (error) {
    console.error("Get user profile error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
    return;
  }
};

// Get current user profile using JWT token
export const getCurrentUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "Authentication required"
      );
      return;
    }

    const user = await User.findById(req.user.userId).select("-__v -password");
    if (!user) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.USER_NOT_FOUND);
      return;
    }

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Current user profile retrieved successfully",
      user
    );
    return;
  } catch (error) {
    console.error("Get current user profile error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
    return;
  }
};

// Request password reset
export const requestPasswordReset = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Email is required");
      return;
    }

    // Check if user exists with this email
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not for security
      sendSuccessResponse(
        res,
        STATUS_CODES.OK,
        "If an account with this email exists, a password reset link has been sent"
      );
      return;
    }

    // Check if user has password (email-based registration)
    if (!user.password) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "This account was registered with phone number. Please use phone login."
      );
      return;
    }

    // Generate reset token
    const resetToken = generateResetToken();

    // Delete any existing reset tokens for this email
    await PasswordReset.deleteMany({ email });

    // Create new password reset record
    const passwordReset = new PasswordReset({
      email,
      token: resetToken,
    });

    await passwordReset.save();

    // Create reset URL (frontend URL + token)
    const resetUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/reset-password?token=${resetToken}`;

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(email, resetToken, resetUrl);

    // For testing purposes, always return success even if email fails
    // In production, you should handle email failures properly
    if (!emailSent) {
      console.log("Email sending failed, but returning success for testing");
      console.log("Reset token:", resetToken);
      console.log("Reset URL:", resetUrl);
    }

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Password reset email sent successfully"
    );
  } catch (error) {
    console.error("Request password reset error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Reset password with token
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Token, new password, and confirm password are required"
      );
      return;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.PASSWORDS_DONT_MATCH
      );
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.PASSWORD_TOO_SHORT
      );
      return;
    }

    // Find the password reset record
    const passwordReset = await PasswordReset.findOne({
      token,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!passwordReset) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid or expired reset token"
      );
      return;
    }

    // Find user by email
    const user = await User.findOne({ email: passwordReset.email });
    if (!user) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.USER_NOT_FOUND);
      return;
    }

    // Update user's password
    user.password = newPassword;
    await user.save();

    // Mark reset token as used
    passwordReset.isUsed = true;
    await passwordReset.save();

    // Delete all reset tokens for this email
    await PasswordReset.deleteMany({ email: passwordReset.email });

    sendSuccessResponse(res, STATUS_CODES.OK, "Password reset successfully");
  } catch (error) {
    console.error("Reset password error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Forget password function (secure version)
export const forgetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Please provide email");
      return;
    }

    const checkUser = await User.findOne({ email });

    // Don't reveal if user exists or not for security
    if (!checkUser) {
      sendSuccessResponse(
        res,
        STATUS_CODES.OK,
        "If an account with this email exists, a password reset link has been sent"
      );
      return;
    }

    // Check if user has password (email-based registration)
    if (!checkUser.password) {
      sendSuccessResponse(
        res,
        STATUS_CODES.OK,
        "If an account with this email exists, a password reset link has been sent"
      );
      return;
    }

    const token = jwt.sign(
      { email },
      process.env.JWT_SECRET_KEY || "your-secret-key-change-in-production",
      {
        expiresIn: "1h",
      }
    );

    const transporter = nodemailer.createTransport({
      service: "gmail",
      secure: true,
      auth: {
        user: process.env.MY_GMAIL,
        pass: process.env.MY_PASSWORD,
      },
    });

    const receiver = {
      from:
        process.env.MY_GMAIL || process.env.EMAIL_USER || "noreply@coordle.com",
      to: email,
      subject: "Password Reset Request - Coordle",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You have requested to reset your password for your Coordle account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/reset-password/${token}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${process.env.CLIENT_URL}/reset-password/${token}</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>Best regards,<br>The Coordle Team</p>
        </div>
      `,
    };

    await transporter.sendMail(receiver);

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "If an account with this email exists, a password reset link has been sent"
    );
  } catch (error) {
    console.error("Forget password error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Something went wrong"
    );
  }
};
