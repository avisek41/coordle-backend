import { Request, Response } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import {
  User,
  UserRole,
  IUser,
  PhoneVerification,
  PasswordReset,
  Trip,
  Payment,
  Plan,
  Invite,
  InviteType,
} from "../models";
import { sendVerificationCode as sendTwilioSMS } from "../config/twilio";
import { generateAccessToken } from "../config/jwt";
import {
  sendPasswordResetEmail,
  generateResetToken,
  sendWelcomeEmail,
} from "../config/email";
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
    const {
      email,
      password,
      confirmPassword,
      userRole,
      registrationMethod,
      isInvited,
    } = req.body;

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
      if (!email) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Email is required for email-based registration"
        );
        return;
      }

      // Validate password if provided
      if (password || confirmPassword) {
        if (!password || !confirmPassword) {
          sendErrorResponse(
            res,
            STATUS_CODES.BAD_REQUEST,
            "Both password and confirmPassword are required if password is provided"
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
        ...(password && { password }), // Only include password if provided
        userRole: userRole || UserRole.TRAVELLER,
        isPhoneVerified: false,
        isEmailVerified: false, // Email needs to be verified after registration
      });

      const savedUser = await newUser.save();

      // Send welcome email if this is an invited registration
      if (isInvited && savedUser.email) {
        try {
          const userName = savedUser.name || savedUser.firstName || "there";
          await sendWelcomeEmail(savedUser.email, userName);
          console.log(
            `Welcome email sent to ${savedUser.email} for invited user`
          );
        } catch (error) {
          console.error("Error sending welcome email:", error);
          // Don't fail the registration if welcome email fails
        }
      }

      // Generate JWT token
      const tokenPayload: any = {
        userId: (savedUser._id as any).toString(),
        userRole: savedUser.userRole,
      };
      if (savedUser.email) {
        tokenPayload.email = savedUser.email;
      }
      const token = generateAccessToken(tokenPayload);

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
          token,
          // Additional info for invited users
          ...(isInvited && {
            inviteInfo: {
              isInvited: true,
              welcomeEmailSent: true,
              userRef: `/users/${savedUser._id}`,
            },
          }),
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
      const tokenPayload: any = {
        userId: (user._id as any).toString(),
        userRole: user.userRole,
      };
      if (user.email) {
        tokenPayload.email = user.email;
      }
      const token = generateAccessToken(tokenPayload);

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
        const token = generateAccessToken({
          userId: (user._id as any).toString(),
          phoneNumber: user.phoneNumber,
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

    if (!id) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "User ID is required");
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid user ID format"
      );
      return;
    }

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

    if (!id) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "User ID is required");
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid user ID format"
      );
      return;
    }

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

    if (!id) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "User ID is required");
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid user ID format"
      );
      return;
    }

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
    const { userId } = req.params;

    if (!userId) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.USER_ID_REQUIRED
      );
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid user ID format"
      );
      return;
    }

    const user = await User.findById(userId).select("-__v").populate({
      path: "planId",
      select:
        "planName planVariant price currency features allowedHost trialDays",
    });
    if (!user) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.USER_NOT_FOUND);
      return;
    }

    // Normalize plan shape: expose currentPlan and keep planId as ObjectId
    const userObj: any = user.toObject ? user.toObject() : (user as any);
    if (
      userObj.planId &&
      typeof userObj.planId === "object" &&
      "planName" in userObj.planId
    ) {
      const plan: any = userObj.planId;
      userObj.currentPlan = {
        _id: plan._id,
        planName: plan.planName,
        planVariant: plan.planVariant,
        price: plan.price,
        currency: plan.currency,
        features: plan.features,
        allowedHost: plan.allowedHost,
        trialDays: plan.trialDays,
      };
      userObj.planId = plan._id;
    }

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      MESSAGES.USER_PROFILE_RETRIEVED,
      userObj
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

    const user = await User.findById(req.user.userId)
      .select("-__v -password")
      .populate({
        path: "planId",
        select:
          "planName planVariant price currency features allowedHost trialDays",
      });
    if (!user) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.USER_NOT_FOUND);
      return;
    }

    // Normalize plan shape: expose currentPlan and keep planId as ObjectId
    const currentUserObj: any = user.toObject ? user.toObject() : (user as any);
    if (
      currentUserObj.planId &&
      typeof currentUserObj.planId === "object" &&
      "planName" in currentUserObj.planId
    ) {
      const plan: any = currentUserObj.planId;
      currentUserObj.currentPlan = {
        _id: plan._id,
        planName: plan.planName,
        planVariant: plan.planVariant,
        price: plan.price,
        currency: plan.currency,
        features: plan.features,
        allowedHost: plan.allowedHost,
        trialDays: plan.trialDays,
      };
      currentUserObj.planId = plan._id;
    }

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Current user profile retrieved successfully",
      currentUserObj
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

// Get current user plan information only
export const getCurrentUserPlan = async (
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

    // Find the most recent successful payment for the user
    const latestPayment = await Payment.findOne({
      userId: req.user.userId,
      status: "succeeded",
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "planId",
        select:
          "planName planVariant price currency features allowedHost trialDays",
      });

    let planInfo = null;
    if (
      latestPayment &&
      latestPayment.planId &&
      typeof latestPayment.planId === "object" &&
      "planName" in latestPayment.planId
    ) {
      const plan = latestPayment.planId as any;
      planInfo = {
        planName: plan.planName,
        planVariant: plan.planVariant,
        price: plan.price,
        currency: plan.currency,
        features: plan.features,
        allowedHost: plan.allowedHost,
        trialDays: plan.trialDays,
        paymentDate: latestPayment.createdAt,
        paymentStatus: latestPayment.status,
      };
    }

    if (!planInfo) {
      sendSuccessResponse(res, STATUS_CODES.OK, MESSAGES.NO_ACTIVE_PLAN, {
        currentPlan: null,
      });
      return;
    }

    sendSuccessResponse(res, STATUS_CODES.OK, MESSAGES.USER_PLAN_RETRIEVED, {
      currentPlan: planInfo,
    });
    return;
  } catch (error) {
    console.error("Get current user plan error:", error);
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

// Setup user profile
export const setupProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "Authentication required"
      );
      return;
    }

    const {
      firstName,
      lastName,
      preferredName,
      phoneNumber,
      pronouns,
      country,
      country_code,
      state,
      postalCode,
      preferredAirport,
      racialEthnic,
      ageDemographic,
      foodAllergies,
      dietaryRestrictions,
      genderIdentity,
      sexualOrientation,
      disabilityStatus,
    } = req.body;

    // Find user by ID from JWT token
    const user = await User.findById(req.user.userId);
    if (!user) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.USER_NOT_FOUND);
      return;
    }

    // Check if phone number is being updated and if it's already taken by another user
    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      const existingUserWithPhone = await User.findOne({
        phoneNumber,
        _id: { $ne: user._id },
      });
      if (existingUserWithPhone) {
        sendErrorResponse(
          res,
          STATUS_CODES.CONFLICT,
          "Phone number is already registered with another account"
        );
        return;
      }
    }

    // Update user profile with provided fields (all optional)
    const updateData: any = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (preferredName !== undefined) updateData.preferredName = preferredName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (pronouns !== undefined) updateData.pronouns = pronouns;
    if (country !== undefined) updateData.country = country;
    if (country_code !== undefined) updateData.country_code = country_code;
    if (state !== undefined) updateData.state = state;
    if (postalCode !== undefined) updateData.postalCode = postalCode;
    if (preferredAirport !== undefined)
      updateData.preferredAirport = preferredAirport;
    if (racialEthnic !== undefined) updateData.racialEthnic = racialEthnic;
    if (ageDemographic !== undefined)
      updateData.ageDemographic = ageDemographic;
    if (foodAllergies !== undefined) updateData.foodAllergies = foodAllergies;
    if (dietaryRestrictions !== undefined)
      updateData.dietaryRestrictions = dietaryRestrictions;
    if (genderIdentity !== undefined)
      updateData.genderIdentity = genderIdentity;
    if (sexualOrientation !== undefined)
      updateData.sexualOrientation = sexualOrientation;
    if (disabilityStatus !== undefined)
      updateData.disabilityStatus = disabilityStatus;

    // Mark profile as setup if any field was provided
    if (Object.keys(updateData).length > 0) {
      updateData.isProfileSetup = true;
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(user._id, updateData, {
      new: true,
      runValidators: true,
    }).select("-__v -password");

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Profile updated successfully",
      updatedUser
    );
    return;
  } catch (error) {
    console.error("Setup profile error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
    return;
  }
};

// Check email verification status and redirect accordingly
export const checkEmailVerificationStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Email is required");
      return;
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      // User doesn't exist, send to registration
      sendSuccessResponse(res, STATUS_CODES.OK, "User not found", {
        action: "register",
        message: "Please register with this email",
      });
      return;
    }

    // Check email verification status
    if (!user.isEmailVerified) {
      // Email not verified, send to verification screen
      sendSuccessResponse(res, STATUS_CODES.OK, "Email not verified", {
        action: "verify_email",
        message: "Please verify your email address",
        email: user.email,
        userId: user._id,
      });
      return;
    }

    // Email is verified, check if user has password
    if (!user.password) {
      // Email verified but no password, send to create password screen
      sendSuccessResponse(
        res,
        STATUS_CODES.OK,
        "Email verified, password required",
        {
          action: "create_password",
          message: "Please create a password for your account",
          email: user.email,
          userId: user._id,
        }
      );
      return;
    }

    // Email is verified and password exists, send to login screen
    sendSuccessResponse(res, STATUS_CODES.OK, "Email verified", {
      action: "login",
      message: "Please login with your password",
      email: user.email,
      userId: user._id,
    });
  } catch (error) {
    console.error("Check email verification status error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Check if user exists by phone number
export const checkUserByPhone = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Phone number is required"
      );
      return;
    }

    // Check if user exists
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      sendSuccessResponse(res, STATUS_CODES.OK, "User not found", {
        exists: false,
        action: "register",
        message: "User does not exist. Please use registration flow.",
      });
      return;
    }

    // User exists, return user info
    sendSuccessResponse(res, STATUS_CODES.OK, "User found", {
      exists: true,
      action: "login",
      message: "User exists. Please use login flow.",
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        isPhoneVerified: user.isPhoneVerified,
        isEmailVerified: user.isEmailVerified,
        isProfileSetup: user.isProfileSetup,
        userRole: user.userRole,
      },
    });
  } catch (error) {
    console.error("Check user by phone error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Check if user exists by email
export const checkUserByEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Email is required");
      return;
    }

    // Find user by email
    const user = await User.findOne({ email }).select(
      "_id email name userRole"
    );

    if (user) {
      sendSuccessResponse(res, STATUS_CODES.OK, "User found", {
        exists: true,
        userId: user._id,
        email: user.email,
        name: user.name,
        userRole: user.userRole,
      });
    } else {
      sendSuccessResponse(res, STATUS_CODES.OK, "User not found", {
        exists: false,
        email,
      });
    }
  } catch (error) {
    console.error("Check user by email error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Check multiple users by emails (for bulk invites)
export const checkUsersByEmails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Emails array is required and must not be empty"
      );
      return;
    }

    // Validate email format for all emails
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    const invalidEmails = emails.filter((email) => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        `Invalid email format: ${invalidEmails.join(", ")}`
      );
      return;
    }

    // Find all users by emails
    const users = await User.find({ email: { $in: emails } }).select(
      "_id email name userRole"
    );

    // Create a map of existing users
    const existingUsersMap = new Map();
    users.forEach((user) => {
      existingUsersMap.set(user.email, {
        exists: true,
        userId: user._id,
        email: user.email,
        name: user.name,
        userRole: user.userRole,
      });
    });

    // Create response for all emails
    const results = emails.map((email) => {
      if (existingUsersMap.has(email)) {
        return existingUsersMap.get(email);
      } else {
        return {
          exists: false,
          email,
        };
      }
    });

    const existingCount = users.length;
    const newCount = emails.length - existingCount;

    sendSuccessResponse(res, STATUS_CODES.OK, "Users check completed", {
      results,
      summary: {
        total: emails.length,
        existing: existingCount,
        new: newCount,
      },
    });
  } catch (error) {
    console.error("Check users by emails error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Register multiple users (for bulk invites) - Enhanced version that checks existence internally
export const registerMultipleUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { users } = req.body;

    if (!users || !Array.isArray(users) || users.length === 0) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Users array is required and must not be empty"
      );
      return;
    }

    const results = [];
    const errors = [];
    const existingUsers = [];
    const newUsers = [];

    // Step 1: Extract emails and validate format
    const emails = users.map((user) => user.email).filter(Boolean);

    // Validate email format for all emails
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    const invalidEmails = emails.filter((email) => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        `Invalid email format: ${invalidEmails.join(", ")}`
      );
      return;
    }

    // Step 2: Check which users already exist
    const existingUsersFromDB = await User.find({
      email: { $in: emails },
    }).select("_id email name userRole");

    // Create a map of existing users
    const existingUsersMap = new Map();
    existingUsersFromDB.forEach((user) => {
      existingUsersMap.set(user.email, {
        exists: true,
        userId: user._id,
        email: user.email,
        name: user.name,
        userRole: user.userRole,
      });
    });

    // Step 3: Process each user
    for (const userData of users) {
      try {
        const {
          email,
          password,
          confirmPassword,
          userRole = "traveller",
          registrationMethod = "email",
          isInvited = true,
        } = userData;

        // Validate required fields
        if (!email) {
          errors.push({
            email: "undefined",
            error: "Email is required",
          });
          continue;
        }

        // Check if user already exists
        if (existingUsersMap.has(email)) {
          const existingUser = existingUsersMap.get(email);
          existingUsers.push(existingUser);
          results.push({
            email,
            success: true,
            exists: true,
            userId: existingUser.userId,
            message: "User already exists",
          });
          continue;
        }

        // Validate password if provided
        if (password || confirmPassword) {
          if (!password || !confirmPassword) {
            errors.push({
              email,
              error:
                "Both password and confirmPassword are required if password is provided",
            });
            continue;
          }

          if (password !== confirmPassword) {
            errors.push({
              email,
              error: "Password and confirm password do not match",
            });
            continue;
          }

          if (password.length < 6) {
            errors.push({
              email,
              error: "Password must be at least 6 characters long",
            });
            continue;
          }
        }

        // Create new user
        const newUser = new User({
          email,
          ...(password && { password }),
          userRole,
          isPhoneVerified: false,
          isEmailVerified: false,
        });

        const savedUser = await newUser.save();

        // Send welcome email if this is an invited registration
        if (isInvited && savedUser.email) {
          try {
            const userName = savedUser.name || savedUser.firstName || "there";
            await sendWelcomeEmail(savedUser.email, userName);
            console.log(
              `Welcome email sent to ${savedUser.email} for invited user`
            );
          } catch (error) {
            console.error("Error sending welcome email:", error);
            // Don't fail the registration if welcome email fails
          }
        }

        newUsers.push({
          exists: false,
          userId: savedUser._id,
          email: savedUser.email,
          name: savedUser.name,
          userRole: savedUser.userRole,
        });

        results.push({
          email,
          success: true,
          exists: false,
          userId: savedUser._id,
          message: "User registered successfully",
        });
      } catch (error) {
        console.error(`Error registering user ${userData.email}:`, error);
        errors.push({
          email: userData.email,
          error: (error as Error).message || "Registration failed",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = errors.length;

    sendSuccessResponse(res, STATUS_CODES.OK, "Bulk registration completed", {
      results,
      errors,
      summary: {
        total: users.length,
        successful: successCount,
        failed: errorCount,
        existing: existingUsers.length,
        new: newUsers.length,
      },
      // Provide all user IDs (both existing and new) for easy trip addition
      allUsers: [...existingUsers, ...newUsers],
    });
  } catch (error) {
    console.error("Bulk registration error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Combined API: Register users and add to trip in one call
export const inviteUsersToTrip = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { tripId, users } = req.body;
    const currentUser = (req as any).user;

    if (!currentUser) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User authentication required"
      );
      return;
    }

    if (!tripId || !users || !Array.isArray(users) || users.length === 0) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Trip ID and users array are required"
      );
      return;
    }

    // Validate tripId format
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid trip ID format"
      );
      return;
    }

    // Step 1: Check if trip exists and user has permission
    const trip = await Trip.findById(tripId);
    if (!trip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND);
      return;
    }

    // Check if current user is trip owner or host
    const currentUserRef = `/users/${currentUser.userId}`;
    const isOwner = trip.owner_id === currentUser.userId;
    const isHost = trip.hosts.includes(currentUserRef);

    if (!isOwner && !isHost) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Only trip owners and hosts can invite users to trips"
      );
      return;
    }

    // Get current user's plan for inheritance
    let currentUserPlanId = null;
    if (isOwner) {
      // If current user is owner, get their plan
      const currentUserData = await User.findById(currentUser.userId);
      if (currentUserData && currentUserData.planId) {
        currentUserPlanId = currentUserData.planId;
      }
    }

    const results = [];
    const errors = [];
    const existingUsers = [];
    const newUsers = [];
    let addedToTripCount = 0;

    // Step 2: Extract emails and phone numbers, validate format
    const emails = users.map((user) => user.email).filter(Boolean);
    const phoneNumbers = users.map((user) => user.phoneNumber).filter(Boolean);

    // Validate email format for all emails
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    const invalidEmails = emails.filter((email) => !emailRegex.test(email));

    // Validate phone number format for all phone numbers
    const phoneRegex = /^\+[1-9]\d{7,14}$/;
    const invalidPhoneNumbers = phoneNumbers.filter(
      (phone) => !phoneRegex.test(phone)
    );

    if (invalidEmails.length > 0) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        `Invalid email format: ${invalidEmails.join(", ")}`
      );
      return;
    }

    if (invalidPhoneNumbers.length > 0) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        `Invalid phone number format: ${invalidPhoneNumbers.join(", ")}`
      );
      return;
    }

    // Step 3: Check which users already exist (by email or phone)
    const existingUsersFromDB = await User.find({
      $or: [{ email: { $in: emails } }, { phoneNumber: { $in: phoneNumbers } }],
    }).select("_id email phoneNumber name userRole planId");

    // Create maps of existing users
    const existingUsersByEmail = new Map();
    const existingUsersByPhone = new Map();

    existingUsersFromDB.forEach((user) => {
      if (user.email) {
        existingUsersByEmail.set(user.email, {
          exists: true,
          userId: user._id,
          email: user.email,
          phoneNumber: user.phoneNumber,
          name: user.name,
          userRole: user.userRole,
          planId: user.planId,
        });
      }
      if (user.phoneNumber) {
        existingUsersByPhone.set(user.phoneNumber, {
          exists: true,
          userId: user._id,
          email: user.email,
          phoneNumber: user.phoneNumber,
          name: user.name,
          userRole: user.userRole,
          planId: user.planId,
        });
      }
    });

    // Step 4: Process each user
    for (const userData of users) {
      try {
        const {
          email,
          phoneNumber,
          password,
          confirmPassword,
          userRole = "traveller",
          registrationMethod,
          isInvited = true,
        } = userData;

        // Validate that at least one contact method is provided
        if (!email && !phoneNumber) {
          errors.push({
            contact: "undefined",
            error: "Either email or phoneNumber is required",
          });
          continue;
        }

        // Validate phone number format if provided
        if (phoneNumber) {
          // Validate full phone number format (must include country code)
          const fullPhoneRegex = /^\+[1-9]\d{7,14}$/;
          if (!fullPhoneRegex.test(phoneNumber)) {
            errors.push({
              contact: phoneNumber,
              error:
                "Invalid phone number format. Must be like +1234567890 with country code",
            });
            continue;
          }
        }

        // Determine registration method based on provided contact info
        const actualRegistrationMethod =
          registrationMethod || (email ? "email" : "phone");

        let userId;
        let isNewUser = false;
        let existingUser = null;

        // Check if user already exists by email or phone
        if (email && existingUsersByEmail.has(email)) {
          existingUser = existingUsersByEmail.get(email);
        } else if (phoneNumber && existingUsersByPhone.has(phoneNumber)) {
          existingUser = existingUsersByPhone.get(phoneNumber);
        }

        if (existingUser) {
          // Store original planId for comparison
          const originalPlanId = existingUser.planId;

          // Update existing user's plan if owner has a plan and user doesn't
          if (currentUserPlanId && !existingUser.planId) {
            try {
              await User.findByIdAndUpdate(existingUser.userId, {
                planId: currentUserPlanId,
              });
              existingUser.planId = currentUserPlanId;
            } catch (error) {
              console.error(
                `Error updating plan for existing user ${existingUser.userId}:`,
                error
              );
            }
          }

          // Add original planId to track changes
          existingUser.originalPlanId = originalPlanId;

          existingUsers.push(existingUser);
          userId = existingUser.userId;
          results.push({
            contact: userData.email || userData.phoneNumber,
            contactType: userData.email ? "email" : "phone",
            success: true,
            exists: true,
            userId: existingUser.userId,
            message: "User already exists",
            ...(currentUserPlanId &&
              !existingUser.planId && { planUpdated: true }),
          });
        } else {
          // Validate password if provided
          if (password || confirmPassword) {
            if (!password || !confirmPassword) {
              errors.push({
                contact: email || phoneNumber,
                error:
                  "Both password and confirmPassword are required if password is provided",
              });
              continue;
            }

            if (password !== confirmPassword) {
              errors.push({
                contact: email || phoneNumber,
                error: "Password and confirm password do not match",
              });
              continue;
            }

            if (password.length < 6) {
              errors.push({
                contact: email || phoneNumber,
                error: "Password must be at least 6 characters long",
              });
              continue;
            }
          }

          // Create new user
          const newUserData: any = {
            userRole,
            isPhoneVerified: false,
            isEmailVerified: false,
            // Inherit plan from owner if available
            ...(currentUserPlanId && { planId: currentUserPlanId }),
          };

          if (email) {
            newUserData.email = email;
          }
          if (phoneNumber) {
            newUserData.phoneNumber = phoneNumber;
          }
          if (password) {
            newUserData.password = password;
          }

          const newUser = new User(newUserData);
          const savedUser = await newUser.save();

          // Send welcome notification if this is an invited registration
          if (isInvited) {
            try {
              const userName = savedUser.name || savedUser.firstName || "there";

              if (savedUser.email) {
                await sendWelcomeEmail(savedUser.email, userName);
                console.log(
                  `Welcome email sent to ${savedUser.email} for invited user`
                );
              }

              // Note: SMS welcome message would need to be implemented
              // if (savedUser.phoneNumber) {
              //   await sendWelcomeSMS(savedUser.phoneNumber, userName);
              //   console.log(`Welcome SMS sent to ${savedUser.phoneNumber} for invited user`);
              // }
            } catch (error) {
              console.error("Error sending welcome notification:", error);
              // Don't fail the registration if welcome notification fails
            }
          }

          newUsers.push({
            exists: false,
            userId: savedUser._id,
            email: savedUser.email,
            phoneNumber: savedUser.phoneNumber,
            name: savedUser.name,
            userRole: savedUser.userRole,
            planId: savedUser.planId,
          });

          userId = savedUser._id;
          isNewUser = true;

          results.push({
            contact: userData.email || userData.phoneNumber,
            contactType: userData.email ? "email" : "phone",
            success: true,
            exists: false,
            userId: savedUser._id,
            message: "User registered successfully",
            ...(currentUserPlanId && {
              planInherited: true,
              planId: currentUserPlanId,
            }),
          });
        }

        // Step 5: Add user to trip
        const userRef = `/users/${userId}`;

        // Check if user is already in the trip
        if (trip.users.includes(userRef)) {
          errors.push({
            contact: userData.email || userData.phoneNumber,
            contactType: userData.email ? "email" : "phone",
            error: "User is already part of this trip",
          });
          continue;
        } else {
          // Add user to trip
          trip.users.push(userRef);

          // If userRole is "host", also add to hosts array
          if (userRole === "host" && !trip.hosts.includes(userRef)) {
            trip.hosts.push(userRef);

            // Update user's global role to host if they're being invited as host
            if (existingUser && existingUser.userRole !== UserRole.HOST) {
              existingUser.userRole = UserRole.HOST;
              await existingUser.save();
              console.log(`Updated user ${userId} global role to host`);
            } else if (isNewUser) {
              // For new users, we need to fetch the user again since savedUser is out of scope
              const newUser = await User.findById(userId);
              if (newUser && newUser.userRole !== UserRole.HOST) {
                newUser.userRole = UserRole.HOST;
                await newUser.save();
                console.log(`Updated new user ${userId} global role to host`);
              }
            }
          }

          addedToTripCount++;

          // Create invite record
          try {
            const inviteData = {
              tripId: trip._id,
              invitedBy: currentUser.userId,
              inviteType: userData.email ? InviteType.EMAIL : InviteType.PHONE,
              contactInfo: userData.email || userData.phoneNumber,
              status: "accepted" as const,
              userId: userId,
            };

            const newInvite = new Invite(inviteData);
            await newInvite.save();
          } catch (inviteError) {
            console.error("Error creating invite record:", inviteError);
            // Don't fail the main operation if invite record creation fails
          }
        }
      } catch (error) {
        console.error(
          `Error processing user ${userData.email || userData.phoneNumber}:`,
          error
        );
        errors.push({
          contact: userData.email || userData.phoneNumber,
          contactType: userData.email ? "email" : "phone",
          error: (error as Error).message || "Processing failed",
        });
      }
    }

    // Step 6: Update trip invite count and save
    trip.invite_count = (trip.invite_count || 0) + addedToTripCount;
    await trip.save();

    const successCount = results.filter((r) => r.success).length;
    const errorCount = errors.length;

    // Check if any users are already in the trip
    const alreadyInTripErrors = errors.filter(
      (error) => error.error === "User is already part of this trip"
    );

    // If all users are already in the trip, return conflict status
    if (alreadyInTripErrors.length === users.length) {
      sendErrorResponse(
        res,
        STATUS_CODES.CONFLICT,
        "All users are already part of this trip"
      );
      return;
    }

    // If some users are already in the trip, return partial success with warning
    if (alreadyInTripErrors.length > 0) {
      sendSuccessResponse(
        res,
        STATUS_CODES.OK,
        "Bulk invite completed with some conflicts",
        {
          tripId,
          results,
          errors,
          summary: {
            total: users.length,
            successful: successCount,
            failed: errorCount,
            existing: existingUsers.length,
            new: newUsers.length,
            addedToTrip: addedToTripCount,
            planInheritance: {
              ownerHasPlan: !!currentUserPlanId,
              planInherited: newUsers.filter((u) => u.planId).length,
              plansUpdated: existingUsers.filter(
                (u) => u.planId && !u.originalPlanId
              ).length,
            },
          },
        }
      );
      return;
    }

    // All users were successfully added
    sendSuccessResponse(res, STATUS_CODES.OK, "Bulk invite completed", {
      tripId,
      results,
      errors,
      summary: {
        total: users.length,
        successful: successCount,
        failed: errorCount,
        existing: existingUsers.length,
        new: newUsers.length,
        addedToTrip: addedToTripCount,
        planInheritance: {
          ownerHasPlan: !!currentUserPlanId,
          planInherited: newUsers.filter((u) => u.planId).length,
          plansUpdated: existingUsers.filter(
            (u) => u.planId && !u.originalPlanId
          ).length,
        },
      },
    });
  } catch (error) {
    console.error("Bulk invite error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Create password for verified email user
export const createPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Email, password, and confirm password are required"
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

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.USER_NOT_FOUND);
      return;
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "Email must be verified before creating a password"
      );
      return;
    }

    // Check if user already has a password
    if (user.password) {
      sendErrorResponse(
        res,
        STATUS_CODES.CONFLICT,
        "Password already exists for this user"
      );
      return;
    }

    // Update user with password
    user.password = password;
    await user.save();

    // Generate JWT token
    const tokenPayload: any = {
      userId: (user._id as any).toString(),
      userRole: user.userRole,
    };
    if (user.email) {
      tokenPayload.email = user.email;
    }
    const token = generateAccessToken(tokenPayload);

    sendSuccessResponse(res, STATUS_CODES.OK, "Password created successfully", {
      id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      isPhoneVerified: user.isPhoneVerified,
      isEmailVerified: user.isEmailVerified,
      isProfileSetup: user.isProfileSetup,
      userRole: user.userRole,
      token,
    });
  } catch (error) {
    console.error("Create password error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Get users who have the same plan as the owner but are NOT currently in owner's trips
 * This endpoint helps find potential collaborators who share the same plan but aren't participating yet
 *
 * LOGIC: Shows users with same plan BUT NOT in trips
 * - Users with identical planId are included
 * - Users currently in owner's trips are EXCLUDED
 * - Perfect for finding new users to invite to trips
 *
 * INVITE TRACKING: Automatically detects invite type (email/phone) even for users invited before tracking system
 * - Users with actual invite records: Shows real invite data
 * - Users without invite records: Infers invite type from their contact method (email = email invite, phone = phone invite)
 *
 * @param req - Express request object with ownerId in params
 * @param res - Express response object
 * @returns Promise<void>
 *
 * @example
 * GET /api/users/same-plan/64f1a2b3c4d5e6f7g8h9i0j1
 *
 * Use cases:
 * - Finding new users to invite to trips (same plan, not in trips)
 * - Discovering potential collaborators who share the same plan
 * - Identifying users who could join trips but haven't been invited yet
 * - Admin analytics for plan distribution
 * - Marketing targeting specific plan users
 */
export const getUsersWithSamePlan = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Extract owner ID from request parameters
    const { ownerId } = req.params;
    // Get current authenticated user from JWT token
    const currentUser = (req as any).user;

    if (!currentUser) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User authentication required"
      );
      return;
    }

    if (!ownerId) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Owner ID is required");
      return;
    }

    // Validate ownerId format
    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid owner ID format"
      );
      return;
    }

    // Get the owner's plan
    const owner = await User.findById(ownerId);
    if (!owner) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Owner not found");
      return;
    }

    if (!owner.planId) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Owner does not have a plan"
      );
      return;
    }

    // Get all trips owned by the current owner
    const ownerTrips = await Trip.find({ owner_id: ownerId });

    // Extract user IDs from all owner's trips (only active members)
    const usersInOwnerTrips = new Set();
    ownerTrips.forEach((trip) => {
      trip.users.forEach((userRef) => {
        // Extract user ID from reference format "/users/{userId}"
        const userId = userRef.split("/").pop();
        if (userId && userId !== ownerId) {
          usersInOwnerTrips.add(userId);
        }
      });
    });

    // Find users with same plan but NOT currently in owner's trips
    const usersWithSamePlan = await User.find({
      planId: owner.planId, // Users with identical planId
      _id: {
        $ne: ownerId, // Exclude the owner from results
        $nin: Array.from(usersInOwnerTrips), // Exclude users currently in trips
      },
    }).select("_id name email phoneNumber userRole planId createdAt"); // Include planId for debugging

    // Get invite information for these users to show invite type
    const userIds = usersWithSamePlan.map((user) => user._id);

    const invites = await Invite.find({
      userId: { $in: userIds },
    }).select("userId tripId inviteType contactInfo status");

    // Create a map of userId to invite info
    const userInviteMap = new Map();
    invites.forEach((invite: any) => {
      if (invite.userId && !userInviteMap.has(invite.userId.toString())) {
        userInviteMap.set(invite.userId.toString(), []);
      }
      if (invite.userId) {
        userInviteMap.get(invite.userId.toString()).push({
          tripId: invite.tripId,
          inviteType: invite.inviteType,
          contactInfo: invite.contactInfo,
          status: invite.status,
        });
      }
    });

    // Remove duplicates (users might appear in both categories)
    const uniqueUsers = usersWithSamePlan.filter(
      (user: any, index, self) =>
        index ===
        self.findIndex((u: any) => u._id.toString() === user._id.toString())
    );

    // Separate users by category for better understanding
    const usersByCategory = {
      samePlan: uniqueUsers.filter(
        (user: any) =>
          user.planId &&
          owner.planId &&
          user.planId.toString() === owner.planId.toString()
      ),
      inTrips: uniqueUsers.filter((user: any) =>
        usersInOwnerTrips.has(user._id.toString())
      ),
      both: uniqueUsers.filter(
        (user: any) =>
          user.planId &&
          owner.planId &&
          user.planId.toString() === owner.planId.toString() &&
          usersInOwnerTrips.has(user._id.toString())
      ),
    };

    // Add invite information to each user
    const availableUsers = uniqueUsers.map((user: any) => {
      const userInvites = userInviteMap.get(user._id.toString()) || [];

      // If no invite records exist, create default invite info based on user's contact method
      let inviteInfo = null;

      if (userInvites.length > 0) {
        // Use actual invite records if they exist
        const inviteType = userInvites[0]?.inviteType || "unknown";
        inviteInfo = {
          inviteType: inviteType,
        };
      } else {
        // Create default invite info for users without invite records
        // This handles users invited before the tracking system was implemented
        // Try to infer invite type based on which contact method was likely used for invitation
        // If user has both email and phone, we can't determine the original invitation method
        // In such cases, we'll default to email for backward compatibility
        const defaultInviteType = user.email
          ? InviteType.EMAIL
          : InviteType.PHONE;

        inviteInfo = {
          inviteType: defaultInviteType,
          isHistorical: true, // Flag to indicate this is inferred data
        };
      }

      return {
        ...(user.toObject ? user.toObject() : user),
        inviteType: inviteInfo.inviteType,
        ...(inviteInfo.isHistorical && { isHistorical: true }),
      };
    });

    // Get plan details
    const plan = await Plan.findById(owner.planId);
    const planDetails = plan
      ? {
          planId: plan._id,
          planName: plan.planName,
          planVariant: plan.planVariant,
          price: plan.price,
          currency: plan.currency,
          features: plan.features,
        }
      : null;

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Users with same plan retrieved successfully",
      {
        owner: {
          id: owner._id,
          name: owner.name,
          email: owner.email,
          phoneNumber: owner.phoneNumber,
          userRole: owner.userRole,
        },
        plan: planDetails,
        users: availableUsers,
      }
    );
  } catch (error) {
    console.error("Error getting users with same plan:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Get invites by type (email or phone) for a specific trip
export const getInvitesByType = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { tripId, inviteType } = req.params;
    const currentUser = (req as any).user;

    if (!currentUser) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User authentication required"
      );
      return;
    }

    if (!tripId || !inviteType) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Trip ID and invite type are required"
      );
      return;
    }

    // Validate inviteType
    if (!Object.values(InviteType).includes(inviteType as InviteType)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid invite type. Must be 'email' or 'phone'"
      );
      return;
    }

    // Validate tripId format
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid trip ID format"
      );
      return;
    }

    // Check if trip exists and user has access
    const trip = await Trip.findById(tripId);
    if (!trip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND);
      return;
    }

    // Check if current user is trip owner, host, or member
    const currentUserRef = `/users/${currentUser.userId}`;
    const isOwner = trip.owner_id === currentUser.userId;
    const isHost = trip.hosts.includes(currentUserRef);
    const isMember = trip.users.includes(currentUserRef);

    if (!isOwner && !isHost && !isMember) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "You don't have access to this trip"
      );
      return;
    }

    // Get invites by type for this trip
    const invites = await Invite.find({
      tripId,
      inviteType: inviteType as InviteType,
    })
      .populate("invitedBy", "name email phoneNumber")
      .populate("userId", "name email phoneNumber userRole")
      .sort({ createdAt: -1 });

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      `${inviteType} invites retrieved successfully`,
      {
        tripId,
        inviteType,
        invites,
        summary: {
          total: invites.length,
          pending: invites.filter((invite: any) => invite.status === "pending")
            .length,
          accepted: invites.filter(
            (invite: any) => invite.status === "accepted"
          ).length,
          declined: invites.filter(
            (invite: any) => invite.status === "declined"
          ).length,
          expired: invites.filter((invite: any) => invite.status === "expired")
            .length,
        },
      }
    );
  } catch (error) {
    console.error("Error getting invites by type:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Get all invites for a specific trip
export const getTripInvites = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { tripId } = req.params;
    const currentUser = (req as any).user;

    if (!currentUser) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User authentication required"
      );
      return;
    }

    if (!tripId) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Trip ID is required");
      return;
    }

    // Validate tripId format
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid trip ID format"
      );
      return;
    }

    // Check if trip exists and user has access
    const trip = await Trip.findById(tripId);
    if (!trip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND);
      return;
    }

    // Check if current user is trip owner, host, or member
    const currentUserRef = `/users/${currentUser.userId}`;
    const isOwner = trip.owner_id === currentUser.userId;
    const isHost = trip.hosts.includes(currentUserRef);
    const isMember = trip.users.includes(currentUserRef);

    if (!isOwner && !isHost && !isMember) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "You don't have access to this trip"
      );
      return;
    }

    // Get all invites for this trip
    const invites = await Invite.find({ tripId })
      .populate("invitedBy", "name email phoneNumber")
      .populate("userId", "name email phoneNumber userRole")
      .sort({ createdAt: -1 });

    // Group invites by type
    const emailInvites = invites.filter(
      (invite: any) => invite.inviteType === InviteType.EMAIL
    );
    const phoneInvites = invites.filter(
      (invite: any) => invite.inviteType === InviteType.PHONE
    );

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Trip invites retrieved successfully",
      {
        tripId,
        invites: {
          email: emailInvites,
          phone: phoneInvites,
        },
        summary: {
          total: invites.length,
          email: {
            total: emailInvites.length,
            pending: emailInvites.filter(
              (invite: any) => invite.status === "pending"
            ).length,
            accepted: emailInvites.filter(
              (invite: any) => invite.status === "accepted"
            ).length,
            declined: emailInvites.filter(
              (invite: any) => invite.status === "declined"
            ).length,
            expired: emailInvites.filter(
              (invite: any) => invite.status === "expired"
            ).length,
          },
          phone: {
            total: phoneInvites.length,
            pending: phoneInvites.filter(
              (invite: any) => invite.status === "pending"
            ).length,
            accepted: phoneInvites.filter(
              (invite: any) => invite.status === "accepted"
            ).length,
            declined: phoneInvites.filter(
              (invite: any) => invite.status === "declined"
            ).length,
            expired: phoneInvites.filter(
              (invite: any) => invite.status === "expired"
            ).length,
          },
        },
      }
    );
  } catch (error) {
    console.error("Error getting trip invites:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};
