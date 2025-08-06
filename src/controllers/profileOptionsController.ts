import { Request, Response } from "express";
import { ProfileOptions } from "../models";
import { sendSuccessResponse, sendErrorResponse } from "../utils/apiResponse";

export const getProfileOptions = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    let query: any = { isActive: true };

    // If category is specified, filter by it
    if (category && typeof category === "string") {
      query.category = category;
    }

    const options = await ProfileOptions.find(query)
      .sort({ displayOrder: 1, category: 1 })
      .select("category options displayOrder");

    // Group by category for better frontend consumption
    const groupedOptions = options.reduce((acc, option) => {
      if (!acc[option.category]) {
        acc[option.category] = [];
      }
      acc[option.category] = option.options;
      return acc;
    }, {} as Record<string, string[]>);

    return sendSuccessResponse(
      res,
      200,
      "Profile options retrieved successfully",
      groupedOptions
    );
  } catch (error) {
    console.error("Error fetching profile options:", error);
    return sendErrorResponse(res, 500, "Failed to fetch profile options");
  }
};

export const createProfileOptions = async (req: Request, res: Response) => {
  try {
    const { category, options, displayOrder = 0 } = req.body;

    // Validate required fields
    if (
      !category ||
      !options ||
      !Array.isArray(options) ||
      options.length === 0
    ) {
      return sendErrorResponse(
        res,
        400,
        "Category and options array are required"
      );
    }

    // Check if category already exists
    const existingCategory = await ProfileOptions.findOne({ category });
    if (existingCategory) {
      return sendErrorResponse(res, 409, "Category already exists");
    }

    const profileOptions = new ProfileOptions({
      category,
      options,
      displayOrder,
    });

    await profileOptions.save();

    return sendSuccessResponse(
      res,
      201,
      "Profile options created successfully",
      profileOptions
    );
  } catch (error) {
    console.error("Error creating profile options:", error);
    return sendErrorResponse(res, 500, "Failed to create profile options");
  }
};

export const updateProfileOptions = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const { options, displayOrder, isActive } = req.body;

    const profileOptions = await ProfileOptions.findOne({ category });
    if (!profileOptions) {
      return sendErrorResponse(res, 404, "Profile options not found");
    }

    // Update fields if provided
    if (options && Array.isArray(options)) {
      profileOptions.options = options;
    }
    if (displayOrder !== undefined) {
      profileOptions.displayOrder = displayOrder;
    }
    if (isActive !== undefined) {
      profileOptions.isActive = isActive;
    }

    await profileOptions.save();

    return sendSuccessResponse(
      res,
      200,
      "Profile options updated successfully",
      profileOptions
    );
  } catch (error) {
    console.error("Error updating profile options:", error);
    return sendErrorResponse(res, 500, "Failed to update profile options");
  }
};

export const deleteProfileOptions = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;

    const profileOptions = await ProfileOptions.findOne({ category });
    if (!profileOptions) {
      return sendErrorResponse(res, 404, "Profile options not found");
    }

    await ProfileOptions.deleteOne({ category });

    return sendSuccessResponse(
      res,
      200,
      "Profile options deleted successfully"
    );
  } catch (error) {
    console.error("Error deleting profile options:", error);
    return sendErrorResponse(res, 500, "Failed to delete profile options");
  }
};
