import { Request, Response } from "express";
import { User, UserRole, IUser, PhoneVerification } from "../models";
import { sendVerificationCode as sendTwilioSMS } from "../config/twilio";
import {
  sendSuccessResponse,
  sendErrorResponse,
  STATUS_CODES,
  MESSAGES,
} from "../utils/apiResponse";

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

      // Check password (in a real app, you'd compare hashed passwords)
      if (user.password !== password) {
        sendErrorResponse(
          res,
          STATUS_CODES.UNAUTHORIZED,
          MESSAGES.INVALID_PASSWORD
        );
        return;
      }

      // Return user data (in a real app, you'd add JWT token here)
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

        // Return user data
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
