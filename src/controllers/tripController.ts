import { Request, Response } from "express";
import mongoose from "mongoose";
import { Trip, TripDocument, ITrip, User } from "../models";
import {
  sendSuccessResponse,
  sendErrorResponse,
  STATUS_CODES,
  MESSAGES,
} from "../utils/apiResponse";
import {
  uploadTripCoverImage,
  deleteTripImage,
  deleteTripFolder,
  deleteDocument,
} from "../utils/cloudinaryUtils";
// Function to generate chat ID in the format: 20 character alphanumeric string
const generateChatId = (): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Create a new trip with cover image
export const createTrip = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      to_address,
      to_location_latitude,
      to_location_longitude,
      from_address = "",
      from_location_latitude = "",
      from_location_longitude = "",
      display_start,
      display_end,
      start_date,
      end_date,
    } = req.body;

    // Validate required fields
    if (!name) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.TRIP_NAME_REQUIRED
      );
      return;
    }

    if (!to_address) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.TRIP_ADDRESS_REQUIRED
      );
      return;
    }

    if (!display_start || !display_end || !start_date || !end_date) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.TRIP_DATES_REQUIRED
      );
      return;
    }

    // Get user info from request (assuming auth middleware sets this)
    const user = (req as any).user;
    if (!user) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User authentication required"
      );
      return;
    }

    // Debug: Log user object to see its structure

    // Generate chat ID
    const chatId = generateChatId();

    // Build location objects from separate fields
    const parsedToLocation = {
      latitude: parseFloat(to_location_latitude),
      longitude: parseFloat(to_location_longitude),
    };

    let parsedFromLocation = null;
    if (from_location_latitude && from_location_longitude) {
      parsedFromLocation = {
        latitude: parseFloat(from_location_latitude),
        longitude: parseFloat(from_location_longitude),
      };
    }

    // Validate location coordinates
    if (
      !parsedToLocation ||
      isNaN(parsedToLocation.latitude) ||
      isNaN(parsedToLocation.longitude)
    ) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Destination location coordinates are required"
      );
      return;
    }

    // Create trip data
    const userId = user.userId;
    if (!userId) {
      sendErrorResponse(res, STATUS_CODES.UNAUTHORIZED, "Invalid user ID");
      return;
    }

    const tripData: Partial<ITrip> = {
      name,
      author: user.email || user.phoneNumber || "Unknown",
      owner: {
        ref: `/users/${userId}`,
      },
      owner_id: userId,
      photo_url: "",
      display_start,
      display_end,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      to_address,
      to_location: parsedToLocation,
      from_address,
      from_location: parsedFromLocation,
      chatId,
      hosts: [`/users/${userId}`],
      users: [`/users/${userId}`],
    };

    // Create the trip
    const newTrip = new Trip(tripData);
    await newTrip.save();

    // Upload cover image if provided
    if (req.file) {
      try {
        const uploadResult = await uploadTripCoverImage(
          req.file.buffer,
          (newTrip._id as any).toString()
        );

        // Update trip with cover image
        newTrip.cover_image = {
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          uploadedAt: new Date(),
        };

        await newTrip.save();
      } catch (error) {
        console.error("Error uploading cover image:", error);
        // Continue without cover image if upload fails
      }
    }

    // Convert to object to include virtual fields
    const tripResponse = newTrip.toObject();

    sendSuccessResponse(
      res,
      STATUS_CODES.CREATED,
      MESSAGES.TRIP_CREATED,
      tripResponse
    );
  } catch (error) {
    console.error("Error creating trip:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Upload trip cover image
export const uploadTripCoverImageController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.TRIP_ID_REQUIRED
      );
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid trip ID format"
      );
      return;
    }

    // Check if trip exists
    const trip = await Trip.findById(id);
    if (!trip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND);
      return;
    }

    // Check if file is uploaded
    if (!req.file) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.TRIP_COVER_IMAGE_REQUIRED
      );
      return;
    }

    // Delete old cover image from Cloudinary if exists
    if (trip.cover_image && trip.cover_image.publicId) {
      try {
        await deleteTripImage(trip.cover_image.publicId);
      } catch (error) {
        console.error("Error deleting old cover image from Cloudinary:", error);
        // Continue with upload even if deletion fails
      }
    }

    // Upload image to Cloudinary
    const uploadResult = await uploadTripCoverImage(req.file.buffer, id);

    // Update trip with new cover image
    trip.cover_image = {
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      uploadedAt: new Date(),
    };

    await trip.save();

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Trip cover image uploaded successfully",
      {
        cover_image: trip.cover_image,
      }
    );
  } catch (error) {
    console.error("Error uploading trip cover image:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.TRIP_COVER_IMAGE_UPLOAD_FAILED
    );
  }
};

// Get all trips
export const getAllTrips = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10, owner_id, status } = req.query;

    const query: any = {};

    // Add filters
    if (owner_id) {
      query.owner_id = owner_id;
    }

    // Add status filter (upcoming, past)
    if (status) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today

      if (status === "upcoming") {
        query.end_date = { $gte: today }; // Include today and future trips
      } else if (status === "past") {
        query.end_date = { $lt: today }; // Trips that ended before today
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const trips = await Trip.find(query)
      .sort({ start_date: 1 }) // Sort by start date
      .skip(skip)
      .limit(Number(limit));

    const total = await Trip.countDocuments(query);

    // Convert trips to objects to include virtual fields
    const tripsResponse = trips.map((trip) => trip.toObject());

    sendSuccessResponse(res, STATUS_CODES.OK, MESSAGES.TRIPS_RETRIEVED, {
      trips: tripsResponse,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting trips:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Get trip by ID
export const getTripById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.TRIP_ID_REQUIRED
      );
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid trip ID format"
      );
      return;
    }

    const trip = await Trip.findById(id);

    if (!trip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND);
      return;
    }

    // Convert to object to include virtual fields
    const tripResponse = trip.toObject();

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      MESSAGES.TRIP_RETRIEVED,
      tripResponse
    );
  } catch (error) {
    console.error("Error getting trip:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Update trip
export const updateTrip = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      to_address,
      to_location_latitude,
      to_location_longitude,
      from_address,
      from_location_latitude,
      from_location_longitude,
      display_start,
      display_end,
      start_date,
      end_date,
    } = req.body;

    if (!id) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.TRIP_ID_REQUIRED
      );
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid trip ID format"
      );
      return;
    }

    // Check if trip exists
    const trip = await Trip.findById(id);
    if (!trip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND);
      return;
    }

    // Build update data object
    const updateData: any = {};

    // Add fields if they exist in the request
    if (name !== undefined) updateData.name = name;
    if (to_address !== undefined) updateData.to_address = to_address;
    if (from_address !== undefined) updateData.from_address = from_address;
    if (display_start !== undefined) updateData.display_start = display_start;
    if (display_end !== undefined) updateData.display_end = display_end;
    if (start_date !== undefined) updateData.start_date = new Date(start_date);
    if (end_date !== undefined) updateData.end_date = new Date(end_date);

    // Handle location updates
    if (to_location_latitude && to_location_longitude) {
      updateData.to_location = {
        latitude: parseFloat(to_location_latitude),
        longitude: parseFloat(to_location_longitude),
      };
    }

    if (from_location_latitude && from_location_longitude) {
      updateData.from_location = {
        latitude: parseFloat(from_location_latitude),
        longitude: parseFloat(from_location_longitude),
      };
    }

    // Update trip
    const updatedTrip = await Trip.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedTrip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND);
      return;
    }

    // Upload cover image if provided
    if (req.file) {
      try {
        // Delete old cover image from Cloudinary if exists
        if (updatedTrip.cover_image && updatedTrip.cover_image.publicId) {
          try {
            await deleteTripImage(updatedTrip.cover_image.publicId);
          } catch (error) {
            console.error(
              "Error deleting old cover image from Cloudinary:",
              error
            );
            // Continue with upload even if deletion fails
          }
        }

        const uploadResult = await uploadTripCoverImage(req.file.buffer, id);

        // Update trip with cover image
        updatedTrip.cover_image = {
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          uploadedAt: new Date(),
        };

        await updatedTrip.save();
      } catch (error) {
        console.error("Error uploading cover image:", error);
        // Continue without cover image if upload fails
      }
    }

    // Convert to object to include virtual fields
    const tripResponse = updatedTrip.toObject();

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      MESSAGES.TRIP_UPDATED,
      tripResponse
    );
  } catch (error) {
    console.error("Error updating trip:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Delete trip
export const deleteTrip = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.TRIP_ID_REQUIRED
      );
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid trip ID format"
      );
      return;
    }

    // Check if trip exists
    const trip = await Trip.findById(id);
    if (!trip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND);
      return;
    }

    // Step 1: Delete all trip documents from Cloudinary and database
    try {
      const tripDocuments = await TripDocument.find({ tripId: id });

      // Delete each document from Cloudinary
      for (const doc of tripDocuments) {
        try {
          const isImage = doc.mimeType.startsWith("image/");
          const isPdf = doc.mimeType === "application/pdf";
          const resourceType = isImage || isPdf ? "image" : "raw";
          await deleteDocument(doc.publicId, resourceType);
        } catch (docError) {
          console.error(
            `Error deleting document ${doc._id} from Cloudinary:`,
            docError
          );
          // Continue with other documents even if one fails
        }
      }

      // Delete all trip documents from database
      await TripDocument.deleteMany({ tripId: id });
      console.log(
        `Successfully deleted ${tripDocuments.length} trip documents from database`
      );
    } catch (error) {
      console.error("Error deleting trip documents:", error);
      // Continue with trip deletion even if document cleanup fails
    }

    // Step 2: Delete entire trip folder structure from Cloudinary
    // This will remove any remaining files and the folder structure itself
    try {
      await deleteTripFolder(id);
      console.log(
        `Successfully deleted entire trip folder structure from Cloudinary: ${id}`
      );
    } catch (error) {
      console.error("Error deleting trip folder from Cloudinary:", error);
      // Continue with trip deletion even if Cloudinary cleanup fails
    }

    // Delete trip from database
    await Trip.findByIdAndDelete(id);

    sendSuccessResponse(res, STATUS_CODES.OK, MESSAGES.TRIP_DELETED);
  } catch (error) {
    console.error("Error deleting trip:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Get trips by user
export const getTripsByUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!userId) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "User ID is required");
      return;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const trips = await Trip.find({
      $or: [
        { owner_id: userId },
        { users: `/users/${userId}` },
        { hosts: `/users/${userId}` },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Trip.countDocuments({
      $or: [
        { owner_id: userId },
        { users: `/users/${userId}` },
        { hosts: `/users/${userId}` },
      ],
    });

    // Convert trips to objects to include virtual fields
    const tripsResponse = trips.map((trip) => trip.toObject());

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "User trips retrieved successfully",
      {
        trips: tripsResponse,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      }
    );
  } catch (error) {
    console.error("Error getting user trips:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Get upcoming trips
export const getUpcomingTrips = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10, owner_id } = req.query;
    const now = new Date();

    const query: any = {
      start_date: { $gt: now }, // Trips that start in the future
    };

    if (owner_id) {
      query.owner_id = owner_id;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const trips = await Trip.find(query)
      .sort({ start_date: 1 }) // Sort by start date (earliest first)
      .skip(skip)
      .limit(Number(limit));

    const total = await Trip.countDocuments(query);

    // Convert trips to objects to include virtual fields
    const tripsResponse = trips.map((trip) => trip.toObject());

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Upcoming trips retrieved successfully",
      {
        trips: tripsResponse,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      }
    );
  } catch (error) {
    console.error("Error getting upcoming trips:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Get past trips
export const getPastTrips = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10, owner_id } = req.query;
    const now = new Date();

    const query: any = {
      end_date: { $lt: now }, // Trips that have ended
    };

    if (owner_id) {
      query.owner_id = owner_id;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const trips = await Trip.find(query)
      .sort({ end_date: -1 }) // Sort by end date (most recent first)
      .skip(skip)
      .limit(Number(limit));

    const total = await Trip.countDocuments(query);

    // Convert trips to objects to include virtual fields
    const tripsResponse = trips.map((trip) => trip.toObject());

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Past trips retrieved successfully",
      {
        trips: tripsResponse,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      }
    );
  } catch (error) {
    console.error("Error getting past trips:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Add user to trip (for trip owners/hosts)
export const addUserToTrip = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { tripId } = req.params;
    const { userId, userRole = "traveller" } = req.body;
    const currentUser = (req as any).user;

    if (!currentUser) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User authentication required"
      );
      return;
    }

    if (!tripId || !userId) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Trip ID and User ID are required"
      );
      return;
    }

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid trip ID format"
      );
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid user ID format"
      );
      return;
    }

    // Check if trip exists
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
        "Only trip owners and hosts can add users to trips"
      );
      return;
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "User not found");
      return;
    }

    const userRef = `/users/${userId}`;

    // Check if user is already in the trip
    if (trip.users.includes(userRef)) {
      sendErrorResponse(
        res,
        STATUS_CODES.CONFLICT,
        "User is already part of this trip"
      );
      return;
    }

    // Add user to trip (users array contains all participants)
    if (!trip.users.includes(userRef)) {
      trip.users.push(userRef);
    }

    // If userRole is "host", also add to hosts array
    if (userRole === "host" && !trip.hosts.includes(userRef)) {
      trip.hosts.push(userRef);
    }

    // Update invite count
    trip.invite_count = (trip.invite_count || 0) + 1;

    await trip.save();

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "User added to trip successfully",
      {
        tripId,
        userId,
        userRole,
        userRef,
      }
    );
  } catch (error) {
    console.error("Error adding user to trip:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Add multiple users to trip (for bulk invites)
export const addMultipleUsersToTrip = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { tripId } = req.params;
    const { users } = req.body;
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

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid trip ID format"
      );
      return;
    }

    // Check if trip exists
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
        "Only trip owners and hosts can add users to trips"
      );
      return;
    }

    const results = [];
    const errors = [];
    let addedCount = 0;

    // Process each user
    for (const userData of users) {
      try {
        const { userId, userRole = "traveller" } = userData;

        if (!userId) {
          errors.push({
            userId: "undefined",
            error: "User ID is required",
          });
          continue;
        }

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
          errors.push({
            userId,
            error: "User not found",
          });
          continue;
        }

        const userRef = `/users/${userId}`;

        // Check if user is already in the trip
        if (trip.users.includes(userRef)) {
          results.push({
            userId,
            email: user.email,
            success: true,
            alreadyInTrip: true,
            message: "User is already part of this trip",
          });
          continue;
        }

        // Add user to trip (users array contains all participants)
        trip.users.push(userRef);

        // If userRole is "host", also add to hosts array
        if (userRole === "host" && !trip.hosts.includes(userRef)) {
          trip.hosts.push(userRef);
        }

        results.push({
          userId,
          email: user.email,
          success: true,
          alreadyInTrip: false,
          userRole,
          message: "User added to trip successfully",
        });

        addedCount++;
      } catch (error) {
        console.error(`Error adding user ${userData.userId} to trip:`, error);
        errors.push({
          userId: userData.userId,
          error: (error as Error).message || "Failed to add user to trip",
        });
      }
    }

    // Update invite count
    trip.invite_count = (trip.invite_count || 0) + addedCount;

    // Save trip changes
    await trip.save();

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Bulk add users to trip completed",
      {
        tripId,
        results,
        errors,
        summary: {
          total: users.length,
          added: addedCount,
          alreadyInTrip: results.filter((r) => r.alreadyInTrip).length,
          failed: errors.length,
        },
      }
    );
  } catch (error) {
    console.error("Error adding multiple users to trip:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Remove user from trip (for trip owners/hosts)
export const removeUserFromTrip = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { tripId } = req.params;
    const { userId } = req.body;
    const currentUser = (req as any).user;

    if (!currentUser) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User authentication required"
      );
      return;
    }

    if (!tripId || !userId) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Trip ID and User ID are required"
      );
      return;
    }

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid trip ID format"
      );
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid user ID format"
      );
      return;
    }

    // Check if trip exists
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
        "Only trip owners and hosts can remove users from trips"
      );
      return;
    }

    // Prevent removing the trip owner
    if (trip.owner_id === userId) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Cannot remove trip owner from the trip"
      );
      return;
    }

    const userRef = `/users/${userId}`;

    // Check if user is in the trip
    if (!trip.users.includes(userRef)) {
      sendErrorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        "User is not part of this trip"
      );
      return;
    }

    // Remove user from trip (remove from both users and hosts arrays)
    trip.users = trip.users.filter((user) => user !== userRef);
    trip.hosts = trip.hosts.filter((host) => host !== userRef);

    // Update invite count (decrease if user was added via invite)
    if (trip.invite_count > 0) {
      trip.invite_count = Math.max(0, trip.invite_count - 1);
    }

    await trip.save();

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "User removed from trip successfully",
      {
        tripId,
        userId,
        userRef,
      }
    );
  } catch (error) {
    console.error("Error removing user from trip:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Check if user is in trip
export const checkUserInTrip = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { tripId } = req.params;
    const { userId } = req.query;
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

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid trip ID format"
      );
      return;
    }

    // Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND);
      return;
    }

    const userRef = `/users/${userId || currentUser.userId}`;
    const isInTrip = trip.users.includes(userRef);
    const isHost = trip.hosts.includes(userRef);
    const isOwner = trip.owner_id === (userId || currentUser.userId);

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "User trip status checked successfully",
      {
        isInTrip,
        isHost,
        isOwner,
        userRef,
        tripId,
      }
    );
  } catch (error) {
    console.error("Error checking user in trip:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Get trip participants
export const getTripParticipants = async (
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

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid trip ID format"
      );
      return;
    }

    // Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND);
      return;
    }

    // Check if current user is part of the trip
    const currentUserRef = `/users/${currentUser.userId}`;
    const isOwner = trip.owner_id === currentUser.userId;
    const isHost = trip.hosts.includes(currentUserRef);
    const isTraveler = trip.users.includes(currentUserRef);

    if (!isOwner && !isHost && !isTraveler) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "You don't have access to this trip"
      );
      return;
    }

    // Get all user IDs from the trip
    const userIds = [
      trip.owner_id,
      ...trip.hosts.map((host) => host.replace("/users/", "")),
      ...trip.users.map((user) => user.replace("/users/", "")),
    ];

    // Remove duplicates
    const uniqueUserIds = [...new Set(userIds)];

    // Get user details
    const users = await User.find({ _id: { $in: uniqueUserIds } }).select(
      "name firstName lastName email phoneNumber userRole profilePhoto"
    );

    // Organize users by role
    const participants = {
      owner: users.find((user: any) => user._id.toString() === trip.owner_id),
      hosts: users.filter(
        (user: any) =>
          trip.hosts.includes(`/users/${user._id}`) &&
          user._id.toString() !== trip.owner_id
      ),
      travelers: users.filter(
        (user: any) =>
          trip.users.includes(`/users/${user._id}`) &&
          !trip.hosts.includes(`/users/${user._id}`) &&
          user._id.toString() !== trip.owner_id
      ),
    };

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Trip participants retrieved successfully",
      participants
    );
  } catch (error) {
    console.error("Error getting trip participants:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Get trip members for members page (email/phone and userId)
export const getTripMembers = async (
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

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid trip ID format"
      );
      return;
    }

    // Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND);
      return;
    }

    // Check if current user is part of the trip
    const currentUserRef = `/users/${currentUser.userId}`;
    const isOwner = trip.owner_id === currentUser.userId;
    const isHost = trip.hosts.includes(currentUserRef);
    const isTraveler = trip.users.includes(currentUserRef);

    if (!isOwner && !isHost && !isTraveler) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "You don't have access to this trip"
      );
      return;
    }

    // Get all user IDs from the trip
    const userIds = [
      trip.owner_id,
      ...trip.hosts.map((host) => host.replace("/users/", "")),
      ...trip.users.map((user) => user.replace("/users/", "")),
    ];

    // Remove duplicates
    const uniqueUserIds = [...new Set(userIds)];

    // Get user details with only required fields for members page
    const users = await User.find({ _id: { $in: uniqueUserIds } }).select(
      "_id email phoneNumber userRole"
    );

    // Format response for members page
    const members = users.map((user: any) => ({
      userId: user._id.toString(),
      email: user.email || null,
      phoneNumber: user.phoneNumber || null,
      userRole: user.userRole,
    }));

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Trip members retrieved successfully",
      {
        tripId: trip._id,
        tripName: trip.name,
        members,
        totalMembers: members.length,
      }
    );
  } catch (error) {
    console.error("Error getting trip members:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};
