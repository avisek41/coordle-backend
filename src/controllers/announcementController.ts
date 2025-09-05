import { Request, Response } from "express";
import mongoose from "mongoose";
import { Announcement, Trip, User } from "../models";
import {
  sendSuccessResponse,
  sendErrorResponse,
  STATUS_CODES,
  MESSAGES,
} from "../utils/apiResponse";

// Helper function to check if user is trip owner or host
const isTripOwnerOrHost = async (
  tripId: string,
  userId: string
): Promise<boolean> => {
  try {
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return false;
    }

    // Check if user is the trip owner
    if (trip.owner_id === userId) {
      return true;
    }

    // Check if user is a host
    const userRef = `/users/${userId}`;
    return trip.hosts.includes(userRef);
  } catch (error) {
    return false;
  }
};

// Helper function to check if user is trip participant (owner, host, or user)
const isTripParticipant = async (
  tripId: string,
  userId: string
): Promise<boolean> => {
  try {
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return false;
    }

    // Check if user is the trip owner
    if (trip.owner_id === userId) {
      return true;
    }

    // Check if user is a host
    const userRef = `/users/${userId}`;
    if (trip.hosts.includes(userRef)) {
      return true;
    }

    // Check if user is a participant
    return trip.users.includes(userRef);
  } catch (error) {
    return false;
  }
};

// Create a new announcement
export const createAnnouncement = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { tripId } = req.params;
    const { message } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      sendErrorResponse(res, STATUS_CODES.UNAUTHORIZED, "User ID not found");
      return;
    }

    if (!message || message.trim().length === 0) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Message is required");
      return;
    }

    // Validate tripId
    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Invalid trip ID");
      return;
    }

    // Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Trip not found");
      return;
    }

    // Check if user is trip owner or host
    const hasPermission = await isTripOwnerOrHost(tripId, userId);
    if (!hasPermission) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Only trip owners or hosts can create announcements"
      );
      return;
    }

    // Create the announcement
    const announcement = new Announcement({
      tripId,
      createdBy: userId,
      message: message.trim(),
    });

    await announcement.save();

    // Populate the createdBy field for response
    await announcement.populate({
      path: "createdBy",
      select: "name email preferredName",
    });

    sendSuccessResponse(
      res,
      STATUS_CODES.CREATED,
      "Announcement created successfully",
      announcement
    );
  } catch (error) {
    console.error("Error creating announcement:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Get all announcements for a trip with pagination
export const getAnnouncements = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { tripId } = req.params;
    const userId = req.user?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    if (!userId) {
      sendErrorResponse(res, STATUS_CODES.UNAUTHORIZED, "User ID not found");
      return;
    }

    // Validate tripId
    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Invalid trip ID");
      return;
    }

    // Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Trip not found");
      return;
    }

    // Check if user is trip participant
    const isParticipant = await isTripParticipant(tripId, userId);
    if (!isParticipant) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Only trip participants can view announcements"
      );
      return;
    }

    // Get announcements with pagination
    const announcements = await Announcement.find({ tripId })
      .populate({
        path: "createdBy",
        select: "name email preferredName",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalCount = await Announcement.countDocuments({ tripId });

    const response = {
      announcements,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1,
      },
    };

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Announcements retrieved successfully",
      response
    );
  } catch (error) {
    console.error("Error getting announcements:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Update an announcement
export const updateAnnouncement = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      sendErrorResponse(res, STATUS_CODES.UNAUTHORIZED, "User ID not found");
      return;
    }

    if (!message || message.trim().length === 0) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Message is required");
      return;
    }

    // Validate announcement ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid announcement ID"
      );
      return;
    }

    // Find the announcement
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Announcement not found");
      return;
    }

    // Check if user is trip owner or host
    const hasPermission = await isTripOwnerOrHost(
      announcement.tripId.toString(),
      userId
    );
    if (!hasPermission) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Only trip owners or hosts can update announcements"
      );
      return;
    }

    // Update the announcement
    announcement.message = message.trim();
    await announcement.save();

    // Populate the createdBy field for response
    await announcement.populate({
      path: "createdBy",
      select: "name email preferredName",
    });

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Announcement updated successfully",
      announcement
    );
  } catch (error) {
    console.error("Error updating announcement:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Delete an announcement
export const deleteAnnouncement = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendErrorResponse(res, STATUS_CODES.UNAUTHORIZED, "User ID not found");
      return;
    }

    // Validate announcement ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid announcement ID"
      );
      return;
    }

    // Find the announcement
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Announcement not found");
      return;
    }

    // Check if user is trip owner or host
    const hasPermission = await isTripOwnerOrHost(
      announcement.tripId.toString(),
      userId
    );
    if (!hasPermission) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Only trip owners or hosts can delete announcements"
      );
      return;
    }

    // Delete the announcement
    await Announcement.findByIdAndDelete(id);

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Announcement deleted successfully",
      null
    );
  } catch (error) {
    console.error("Error deleting announcement:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};
