import { Request, Response } from "express";
import mongoose from "mongoose";
import { Lodging, Trip, User, type ILodging } from "../models";
import {
  sendSuccessResponse,
  sendErrorResponse,
  STATUS_CODES,
  MESSAGES,
} from "../utils/apiResponse";

const parseDateValue = (value: unknown): Date | null => {
  const parsed = new Date(value as any);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const validateObjectIdOrRespond = (
  value: string | undefined,
  label: string,
  res: Response
): value is string => {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    sendErrorResponse(
      res,
      STATUS_CODES.BAD_REQUEST,
      `Valid ${label} is required`
    );
    return false;
  }
  return true;
};

const parseOptionalDateOrRespond = (
  value: unknown,
  label: string,
  res: Response
): Date | undefined | null => {
  if (value === undefined) return undefined;
  const parsed = parseDateValue(value);
  if (!parsed) {
    sendErrorResponse(
      res,
      STATUS_CODES.BAD_REQUEST,
      `Invalid ${label} date format`
    );
    return null;
  }
  return parsed;
};

const ensureLodgingOwner = (
  lodging: ILodging,
  userId: string,
  res: Response,
  message = "Only the lodging owner can modify this record"
): boolean => {
  if (lodging.owner_id !== userId) {
    sendErrorResponse(res, STATUS_CODES.FORBIDDEN, message);
    return false;
  }
  return true;
};

// Create lodging entry
export const createLodging = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      lodging_name,
      check_in,
      check_out,
      phone = "",
      website = "",
      reservation_code = "",
      address = "",
      notes = "",
      trip_id,
    } = req.body;

    const currentUser = (req as any).user;

    if (!currentUser) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User authentication required"
      );
      return;
    }

    if (!lodging_name || !check_in || !check_out || !trip_id) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Lodging name, check-in date, check-out date, and trip ID are required"
      );
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(trip_id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid trip ID format"
      );
      return;
    }

    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);

    if (Number.isNaN(checkInDate.getTime())) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid check-in date format"
      );
      return;
    }

    if (Number.isNaN(checkOutDate.getTime())) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid check-out date format"
      );
      return;
    }

    if (checkOutDate < checkInDate) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Check-out date cannot be before check-in date"
      );
      return;
    }

    // Ensure trip exists and user belongs to it
    const trip = await Trip.findById(trip_id);
    if (!trip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Trip not found");
      return;
    }

    const currentUserRef = `/users/${currentUser.userId}`;
    const isOwner = trip.owner_id === currentUser.userId;
    const isHost = trip.hosts.includes(currentUserRef);
    const isMember = trip.users.includes(currentUserRef);

    if (!isOwner && !isHost && !isMember) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "User is not part of this trip"
      );
      return;
    }

    const lodgingData: Partial<ILodging> = {
      lodging_name,
      check_in: checkInDate,
      check_out: checkOutDate,
      phone,
      website,
      reservation_code,
      address,
      notes,
      trip_id,
      owner_id: currentUser.userId,
    };

    const lodging = new Lodging(lodgingData);
    await lodging.save();

    // Update trip's lodging_count after creating lodging
    try {
      trip.lodging_count = (trip.lodging_count || 0) + 1;
      await trip.save();
    } catch (error) {
      console.error("Error updating trip lodging_count:", error);
      // Continue even if trip update fails - lodging was already created
    }

    sendSuccessResponse(
      res,
      STATUS_CODES.CREATED,
      "Lodging created successfully",
      lodging.toObject()
    );
  } catch (error) {
    console.error("Error creating lodging:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Get all lodgings for a trip
export const getLodgingsByTrip = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { tripId } = req.params;
    const currentUser = (req as any).user;

    if (!tripId) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Trip ID parameter is required"
      );
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid trip ID format"
      );
      return;
    }

    const trip = await Trip.findById(tripId);
    if (!trip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Trip not found");
      return;
    }

    if (currentUser) {
      const currentUserRef = `/users/${currentUser.userId}`;
      const isOwner = trip.owner_id === currentUser.userId;
      const isHost = trip.hosts.includes(currentUserRef);
      const isMember = trip.users.includes(currentUserRef);

      if (!isOwner && !isHost && !isMember) {
        sendErrorResponse(
          res,
          STATUS_CODES.FORBIDDEN,
          "User is not part of this trip"
        );
        return;
      }
    }

    const lodgings = await Lodging.find({ trip_id: tripId }).sort({
      check_in: 1,
    });

    // Transform lodgings to include creator information
    const lodgingsResponse = await Promise.all(
      lodgings.map(async (lodging) => {
        const lodgingObj = lodging.toObject() as any;

        // Get user information for the lodging creator
        const creator = await User.findById(lodging.createdBy || lodging.owner_id).select(
          "_id email preferredName profilePhoto"
        );

        if (creator) {
          lodgingObj.createdBy = {
            _id: creator._id,
            email: creator.email,
            preferredName: creator.preferredName,
            profilePhotoURL: creator.profilePhoto?.url || null,
          };
        } else {
          lodgingObj.createdBy = {
            _id: lodging.createdBy || lodging.owner_id,
            email: null,
            preferredName: null,
            profilePhotoURL: null,
          };
        }

        return lodgingObj;
      })
    );

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Lodgings retrieved successfully",
      lodgingsResponse
    );
  } catch (error) {
    console.error("Error fetching lodgings:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Get a single lodging by id
export const getLodgingById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Lodging ID is required");
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid lodging ID format"
      );
      return;
    }

    const lodging = await Lodging.findById(id);
    if (!lodging) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Lodging not found");
      return;
    }

    // Convert to object to include virtual fields
    const lodgingResponse = lodging.toObject() as any;

    // Get user information for the lodging creator
    const creator = await User.findById(lodging.createdBy || lodging.owner_id).select(
      "_id email preferredName profilePhoto"
    );

    // Add createdBy information
    if (creator) {
      lodgingResponse.createdBy = {
        _id: creator._id,
        email: creator.email,
        preferredName: creator.preferredName,
        profilePhotoURL: creator.profilePhoto?.url || null,
      };
    } else {
      lodgingResponse.createdBy = {
        _id: lodging.createdBy || lodging.owner_id,
        email: null,
        preferredName: null,
        profilePhotoURL: null,
      };
    }

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Lodging retrieved successfully",
      lodgingResponse
    );
  } catch (error) {
    console.error("Error fetching lodging:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Update lodging entry (owner only)
export const updateLodging = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      lodging_name,
      check_in,
      check_out,
      phone,
      website,
      reservation_code,
      address,
      notes,
    } = req.body;
    const currentUser = (req as any).user;

    if (!currentUser) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User authentication required"
      );
      return;
    }

    if (!validateObjectIdOrRespond(id, "lodging ID", res)) return;

    const lodging = await Lodging.findById(id);
    if (!lodging) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Lodging not found");
      return;
    }

    if (
      !ensureLodgingOwner(
        lodging,
        currentUser.userId,
        res,
        "Only the lodging owner can update this record"
      )
    )
      return;

    const updates: Partial<ILodging> = {
      ...(lodging_name !== undefined && { lodging_name }),
      ...(phone !== undefined && { phone }),
      ...(website !== undefined && { website }),
      ...(reservation_code !== undefined && { reservation_code }),
      ...(address !== undefined && { address }),
      ...(notes !== undefined && { notes }),
    };

    const parsedCheckIn = parseOptionalDateOrRespond(
      check_in,
      "check-in",
      res
    );
    const parsedCheckOut = parseOptionalDateOrRespond(
      check_out,
      "check-out",
      res
    );

    if (parsedCheckIn === null || parsedCheckOut === null) return;

    if (parsedCheckIn) updates.check_in = parsedCheckIn;
    if (parsedCheckOut) updates.check_out = parsedCheckOut;

    const nextCheckIn = updates.check_in ?? lodging.check_in;
    const nextCheckOut = updates.check_out ?? lodging.check_out;
    if (nextCheckOut < nextCheckIn) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Check-out date cannot be before check-in date"
      );
      return;
    }

    Object.assign(lodging, updates);
    await lodging.save();

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Lodging updated successfully",
      lodging.toObject()
    );
  } catch (error) {
    console.error("Error updating lodging:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Delete lodging entry (owner only)
export const deleteLodging = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    if (!currentUser) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User authentication required"
      );
      return;
    }

    if (!id) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Lodging ID is required");
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid lodging ID format"
      );
      return;
    }

    const lodging = await Lodging.findById(id);
    if (!lodging) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Lodging not found");
      return;
    }

    if (lodging.owner_id !== currentUser.userId) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Only the lodging owner can delete this record"
      );
      return;
    }

    // Get trip before deleting lodging to update count
    const trip = await Trip.findById(lodging.trip_id);

    await lodging.deleteOne();

    // Update trip's lodging_count after deleting lodging
    if (trip) {
      try {
        trip.lodging_count = Math.max(0, (trip.lodging_count || 0) - 1);
        await trip.save();
      } catch (error) {
        console.error("Error updating trip lodging_count:", error);
        // Continue even if trip update fails - lodging was already deleted
      }
    }

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Lodging deleted successfully"
    );
  } catch (error) {
    console.error("Error deleting lodging:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

