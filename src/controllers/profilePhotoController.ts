import { Request, Response } from "express";
import User from "../models/User";
import {
  uploadProfilePhoto,
  deleteProfilePhoto,
  extractPublicIdFromUrl,
} from "../utils/cloudinaryUtils";
import { sendSuccessResponse, sendErrorResponse } from "../utils/apiResponse";
import { JWTPayload } from "../config/jwt";

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * Upload or update user profile photo
 */
export const uploadUserProfilePhoto = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      sendErrorResponse(res, 401, "Authentication required");
      return;
    }

    // Check if file was uploaded
    if (!req.file) {
      sendErrorResponse(res, 400, "No profile photo file provided");
      return;
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      sendErrorResponse(res, 404, "User not found");
      return;
    }

    // Delete existing profile photo if it exists
    if (user.profilePhoto?.publicId) {
      try {
        await deleteProfilePhoto(user.profilePhoto.publicId);
      } catch (error) {
        console.error("Error deleting existing profile photo:", error);
        // Continue with upload even if delete fails
      }
    }

    // Upload new profile photo
    const uploadResult = await uploadProfilePhoto(req.file.buffer, userId);

    // Update user document with new profile photo data
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        profilePhoto: {
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          thumbnailUrl: uploadResult.thumbnailUrl,
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
          bytes: uploadResult.bytes,
          uploadedAt: new Date(),
        },
      },
      { new: true, select: "-password" }
    );

    sendSuccessResponse(res, 200, "Profile photo uploaded successfully", {
      profilePhoto: updatedUser?.profilePhoto,
    });
  } catch (error) {
    console.error("Error uploading profile photo:", error);
    sendErrorResponse(res, 500, "Failed to upload profile photo");
  }
};

/**
 * Get user profile photo
 */
export const getUserProfilePhoto = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      sendErrorResponse(res, 401, "Authentication required");
      return;
    }

    // Find the user and select only profile photo
    const user = await User.findById(userId).select("profilePhoto");

    if (!user) {
      sendErrorResponse(res, 404, "User not found");
      return;
    }

    if (!user.profilePhoto?.url) {
      sendErrorResponse(res, 404, "No profile photo found");
      return;
    }

    sendSuccessResponse(res, 200, "Profile photo retrieved successfully", {
      profilePhoto: user.profilePhoto,
    });
  } catch (error) {
    console.error("Error retrieving profile photo:", error);
    sendErrorResponse(res, 500, "Failed to retrieve profile photo");
  }
};

/**
 * Delete user profile photo
 */
export const deleteUserProfilePhoto = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      sendErrorResponse(res, 401, "Authentication required");
      return;
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      sendErrorResponse(res, 404, "User not found");
      return;
    }

    if (!user.profilePhoto?.publicId) {
      sendErrorResponse(res, 404, "No profile photo found to delete");
      return;
    }

    // Delete from Cloudinary
    await deleteProfilePhoto(user.profilePhoto.publicId);

    // Remove profile photo data from user document
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $unset: { profilePhoto: 1 },
      },
      { new: true, select: "-password" }
    );

    sendSuccessResponse(res, 200, "Profile photo deleted successfully", {
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error deleting profile photo:", error);
    sendErrorResponse(res, 500, "Failed to delete profile photo");
  }
};

/**
 * Get profile photo of any user by user ID (public endpoint)
 */
export const getPublicProfilePhoto = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      sendErrorResponse(res, 400, "User ID is required");
      return;
    }

    // Find the user and select only profile photo
    const user = await User.findById(userId).select(
      "profilePhoto firstName lastName preferredName"
    );

    if (!user) {
      sendErrorResponse(res, 404, "User not found");
      return;
    }

    if (!user.profilePhoto?.url) {
      sendErrorResponse(res, 404, "No profile photo found");
      return;
    }

    sendSuccessResponse(res, 200, "Profile photo retrieved successfully", {
      profilePhoto: {
        url: user.profilePhoto.url,
        thumbnailUrl: user.profilePhoto.thumbnailUrl,
        width: user.profilePhoto.width,
        height: user.profilePhoto.height,
        format: user.profilePhoto.format,
      },
      userName: user.preferredName || user.firstName || "User",
    });
  } catch (error) {
    console.error("Error retrieving public profile photo:", error);
    sendErrorResponse(res, 500, "Failed to retrieve profile photo");
  }
};
