import { Request, Response } from "express";
import User from "../models/User";
import {
  sendErrorResponse,
  sendSuccessResponse,
  STATUS_CODES,
  MESSAGES,
} from "../utils/apiResponse";

// Change password controller
export const changePassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Check if user is authenticated
    if (!req.user) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "Authentication required"
      );
      return;
    }

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Current password, new password, and confirm password are required"
      );
      return;
    }

    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.PASSWORDS_DONT_MATCH
      );
      return;
    }

    // Validate new password length
    if (newPassword.length < 6) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.PASSWORD_TOO_SHORT
      );
      return;
    }

    // Find user
    const user = await User.findById(req.user.userId);
    if (!user) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.USER_NOT_FOUND);
      return;
    }

    // Check if user has a password (handle phone-only registered users)
    if (!user.password) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "This account was registered with phone number and has no password to change"
      );
      return;
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "Current password is incorrect"
      );
      return;
    }

    // Update password (will be hashed automatically by pre-save middleware)
    user.password = newPassword;
    await user.save();

    sendSuccessResponse(res, STATUS_CODES.OK, "Password changed successfully");
  } catch (error) {
    console.error("Change password error:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};
