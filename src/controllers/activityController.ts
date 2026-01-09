import { Request, Response } from "express";
import mongoose from "mongoose";
import { Activity, Trip, User, type IActivity } from "../models";
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

const ensureActivityOwner = (
  activity: IActivity,
  userId: string,
  res: Response,
  message = "Only the activity owner can modify this record"
): boolean => {
  if (activity.owner_id !== userId) {
    sendErrorResponse(res, STATUS_CODES.FORBIDDEN, message);
    return false;
  }
  return true;
};

// Create activity entry
export const createActivity = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      activity_name,
      reservation_date,
      startTime,
      endTime,
      phone = "",
      website = "",
      reservation_code = "",
      tickets = "",
      address = "",
      notes = "",
      activity_type,
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

    if (
      !activity_name ||
      !reservation_date ||
      !startTime ||
      !activity_type ||
      !trip_id
    ) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Activity name, reservation date, start time, activity type, and trip ID are required"
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

    const validActivityTypes = [
      "restaurant",
      "tour",
      "museum",
      "bar_party",
      "event",
      "training",
      "relax",
      "fitness",
      "shopping",
      "concert",
      "kids",
      "theater",
      "meeting",
      "misc",
      "other",
    ];

    if (!validActivityTypes.includes(activity_type)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        `Invalid activity type. Must be one of: ${validActivityTypes.join(", ")}`
      );
      return;
    }

    const reservationDate = new Date(reservation_date);
    const startTimeDate = new Date(startTime);
    const endTimeDate = endTime ? new Date(endTime) : null;

    if (Number.isNaN(reservationDate.getTime())) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid reservation date format"
      );
      return;
    }

    if (Number.isNaN(startTimeDate.getTime())) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid start time format"
      );
      return;
    }

    if (endTimeDate && Number.isNaN(endTimeDate.getTime())) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid end time format"
      );
      return;
    }

    if (endTimeDate && endTimeDate < startTimeDate) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "End time cannot be before start time"
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

    const activityData: Partial<IActivity> = {
      activity_name,
      reservation_date: reservationDate,
      startTime: startTimeDate,
      ...(endTimeDate && { endTime: endTimeDate }),
      ...(phone && { phone: phone }),
      ...(website && { website: website }),
      ...(reservation_code && { reservation_code: reservation_code }),
      ...(tickets && { tickets: tickets }),
      ...(address && { address: address }),
      ...(notes && { notes: notes }),
      activity_type,
      trip_id,
      owner_id: currentUser.userId,
      createdBy: currentUser.userId,
    };

    const activity = new Activity(activityData);
    console.log("activityData", activityData);
    console.log("activity", activity);
    await activity.save();

    // Update trip's activity_count after creating activity
    try {
      trip.activity_count = (trip.activity_count || 0) + 1;
      await trip.save();
    } catch (error) {
      console.error("Error updating trip activity_count:", error);
      // Continue even if trip update fails - activity was already created
    }

    sendSuccessResponse(
      res,
      STATUS_CODES.CREATED,
      "Activity created successfully",
      activity.toObject()
    );
  } catch (error) {
    console.error("Error creating activity:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Get all activities for a trip
export const getActivitiesByTrip = async (
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

    const activities = await Activity.find({ trip_id: tripId }).sort({
      reservation_date: 1,
      startTime: 1,
    });

    // Transform activities to include creator information
    const activitiesResponse = await Promise.all(
      activities.map(async (activity) => {
        const activityObj = activity.toObject() as any;

        // Get user information for the activity creator
        const creator = await User.findById(
          activity.createdBy || activity.owner_id
        ).select("_id email preferredName profilePhoto");

        if (creator) {
          activityObj.createdBy = {
            _id: creator._id,
            email: creator.email,
            preferredName: creator.preferredName,
            profilePhotoURL: creator.profilePhoto?.url || null,
          };
        } else {
          activityObj.createdBy = {
            _id: activity.createdBy || activity.owner_id,
            email: null,
            preferredName: null,
            profilePhotoURL: null,
          };
        }

        return activityObj;
      })
    );

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Activities retrieved successfully",
      activitiesResponse
    );
  } catch (error) {
    console.error("Error fetching activities:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Get a single activity by id
export const getActivityById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Activity ID is required");
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid activity ID format"
      );
      return;
    }

    const activity = await Activity.findById(id);
    if (!activity) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Activity not found");
      return;
    }

    // Convert to object to include virtual fields
    const activityResponse = activity.toObject() as any;

    // Get user information for the activity creator
    const creator = await User.findById(
      activity.createdBy || activity.owner_id
    ).select("_id email preferredName profilePhoto");

    // Add createdBy information
    if (creator) {
      activityResponse.createdBy = {
        _id: creator._id,
        email: creator.email,
        preferredName: creator.preferredName,
        profilePhotoURL: creator.profilePhoto?.url || null,
      };
    } else {
      activityResponse.createdBy = {
        _id: activity.createdBy || activity.owner_id,
        email: null,
        preferredName: null,
        profilePhotoURL: null,
      };
    }

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Activity retrieved successfully",
      activityResponse
    );
  } catch (error) {
    console.error("Error fetching activity:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Update activity entry (owner only)
export const updateActivity = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      activity_name,
      reservation_date,
      startTime,
      endTime,
      phone,
      website,
      reservation_code,
      tickets,
      address,
      notes,
      activity_type,
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

    if (!validateObjectIdOrRespond(id, "activity ID", res)) return;

    const activity = await Activity.findById(id);
    if (!activity) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Activity not found");
      return;
    }

    if (
      !ensureActivityOwner(
        activity,
        currentUser.userId,
        res,
        "Only the activity owner can update this record"
      )
    )
      return;

    const updates: Partial<IActivity> = {
      ...(activity_name !== undefined && { activity_name }),
      ...(phone !== undefined && { phone }),
      ...(website !== undefined && { website }),
      ...(reservation_code !== undefined && { reservation_code }),
      ...(tickets !== undefined && { tickets }),
      ...(address !== undefined && { address }),
      ...(notes !== undefined && { notes }),
      ...(activity_type !== undefined && { activity_type }),
    };

    const parsedReservationDate = parseOptionalDateOrRespond(
      reservation_date,
      "reservation",
      res
    );
    const parsedStartTime = parseOptionalDateOrRespond(startTime, "start", res);
    const parsedEndTime = parseOptionalDateOrRespond(endTime, "end", res);

    if (
      parsedReservationDate === null ||
      parsedStartTime === null ||
      parsedEndTime === null
    )
      return;

    if (parsedReservationDate) updates.reservation_date = parsedReservationDate;
    if (parsedStartTime) updates.startTime = parsedStartTime;
    if (parsedEndTime) updates.endTime = parsedEndTime;

    const nextStartTime = updates.startTime ?? activity.startTime;
    const nextEndTime = updates.endTime ?? activity.endTime;
    if (nextEndTime && nextEndTime < nextStartTime) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "End time cannot be before start time"
      );
      return;
    }

    Object.assign(activity, updates);
    await activity.save();

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Activity updated successfully",
      activity.toObject()
    );
  } catch (error) {
    console.error("Error updating activity:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Delete activity entry (owner only)
export const deleteActivity = async (
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
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Activity ID is required");
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid activity ID format"
      );
      return;
    }

    const activity = await Activity.findById(id);
    if (!activity) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Activity not found");
      return;
    }

    if (activity.owner_id !== currentUser.userId) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Only the activity owner can delete this record"
      );
      return;
    }

    // Get trip before deleting activity to update count
    const trip = await Trip.findById(activity.trip_id);

    await activity.deleteOne();

    // Update trip's activity_count after deleting activity
    if (trip) {
      try {
        trip.activity_count = Math.max(0, (trip.activity_count || 0) - 1);
        await trip.save();
      } catch (error) {
        console.error("Error updating trip activity_count:", error);
        // Continue even if trip update fails - activity was already deleted
      }
    }

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Activity deleted successfully"
    );
  } catch (error) {
    console.error("Error deleting activity:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

