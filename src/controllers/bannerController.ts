import { Request, Response } from "express";
import { Banner, IBanner } from "../models";
import { uploadBannerImage, deleteBannerImage } from "../utils/cloudinaryUtils";
import {
  sendSuccessResponse,
  sendErrorResponse,
  STATUS_CODES,
  MESSAGES,
} from "../utils/apiResponse";

// Create a new banner
export const createBanner = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { title, redirectLink, isActive = true, order = 0 } = req.body;

    // Validate required fields
    if (!title || !redirectLink) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Title and redirect link are required"
      );
      return;
    }

    // Check if image file exists
    if (!req.file) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Banner image is required"
      );
      return;
    }

    // Upload image to Cloudinary
    const imageData = await uploadBannerImage(req.file.buffer, title);

    // Create banner
    const banner = new Banner({
      title,
      imageUrl: imageData.url,
      redirectLink,
      isActive,
      order,
    });

    const savedBanner = await banner.save();

    sendSuccessResponse(
      res,
      STATUS_CODES.CREATED,
      "Banner created successfully",
      savedBanner
    );
  } catch (error) {
    console.error("Error creating banner:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to create banner"
    );
  }
};

// Get all banners
export const getAllBanners = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { isActive, sortBy = "order", sortOrder = "asc" } = req.query;

    let query: any = {};

    // Filter by active status if provided
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "desc" ? -1 : 1;

    const banners = await Banner.find(query).sort(sort);

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Banners retrieved successfully",
      banners
    );
  } catch (error) {
    console.error("Error retrieving banners:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to retrieve banners"
    );
  }
};

// Get banner by ID
export const getBannerById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id);

    if (!banner) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Banner not found");
      return;
    }

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Banner retrieved successfully",
      banner
    );
  } catch (error) {
    console.error("Error retrieving banner:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to retrieve banner"
    );
  }
};

// Update banner
export const updateBanner = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, redirectLink, isActive, order } = req.body;

    const banner = await Banner.findById(id);

    if (!banner) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Banner not found");
      return;
    }

    // If new image is uploaded, delete old image and upload new one
    if (req.file) {
      // Delete old image from Cloudinary
      if (banner.imageUrl) {
        const publicId = extractPublicIdFromUrl(banner.imageUrl);
        if (publicId) {
          await deleteBannerImage(publicId);
        }
      }

      // Upload new image
      const imageData = await uploadBannerImage(
        req.file.buffer,
        title || banner.title
      );
      banner.imageUrl = imageData.url;
    }

    // Update other fields
    if (title !== undefined) banner.title = title;
    if (redirectLink !== undefined) banner.redirectLink = redirectLink;
    if (isActive !== undefined) banner.isActive = isActive;
    if (order !== undefined) banner.order = order;

    const updatedBanner = await banner.save();

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Banner updated successfully",
      updatedBanner
    );
  } catch (error) {
    console.error("Error updating banner:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to update banner"
    );
  }
};

// Delete banner
export const deleteBanner = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id);

    if (!banner) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Banner not found");
      return;
    }

    // Delete image from Cloudinary
    if (banner.imageUrl) {
      const publicId = extractPublicIdFromUrl(banner.imageUrl);
      if (publicId) {
        await deleteBannerImage(publicId);
      }
    }

    await Banner.findByIdAndDelete(id);

    sendSuccessResponse(res, STATUS_CODES.OK, "Banner deleted successfully");
  } catch (error) {
    console.error("Error deleting banner:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to delete banner"
    );
  }
};

// Get active banners only
export const getActiveBanners = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ order: 1 });

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Active banners retrieved successfully",
      banners
    );
  } catch (error) {
    console.error("Error retrieving active banners:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to retrieve active banners"
    );
  }
};

// Helper function to extract public ID from Cloudinary URL
const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    const matches = url.match(/\/v\d+\/(.+)\.[a-z]+$/);
    return matches ? matches[1] || null : null;
  } catch (error) {
    return null;
  }
};
