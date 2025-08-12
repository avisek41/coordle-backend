import { Request, Response } from "express";
import { Trip, ITrip } from "../models";
import {
  sendSuccessResponse,
  sendErrorResponse,
  STATUS_CODES,
  MESSAGES,
} from "../utils/apiResponse";
import {
  uploadTripCoverImage,
  deleteTripImage,
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
      to_location,
      from_address = "",
      from_location = null,
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

    // Generate chat ID
    const chatId = generateChatId();

    // Parse location data if they are strings
    let parsedToLocation = to_location;
    let parsedFromLocation = from_location;

    if (typeof to_location === "string") {
      try {
        parsedToLocation = JSON.parse(to_location);
      } catch (error) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Invalid to_location format"
        );
        return;
      }
    }

    if (from_location && typeof from_location === "string") {
      try {
        parsedFromLocation = JSON.parse(from_location);
      } catch (error) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Invalid from_location format"
        );
        return;
      }
    }

    // Validate location coordinates AFTER parsing
    if (
      !parsedToLocation ||
      !parsedToLocation.latitude ||
      !parsedToLocation.longitude
    ) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Destination location coordinates are required"
      );
      return;
    }

    // Create trip data
    const tripData: Partial<ITrip> = {
      name,
      author: user.email || user.phoneNumber || "Unknown",
      owner: {
        ref: `/users/${user._id}`,
      },
      owner_id: user._id.toString(),
      photo_url: "",
      cover_image: {
        url: "",
        uploadedAt: new Date(),
      },
      display_start,
      display_end,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      to_address,
      to_location: parsedToLocation,
      from_address,
      from_location: parsedFromLocation,
      chatId,
      hosts: [`/users/${user._id}`],
      users: [`/users/${user._id}`],
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

    // Upload image to Cloudinary
    const uploadResult = await uploadTripCoverImage(req.file.buffer, id);

    // Update trip with new cover image
    trip.cover_image = {
      url: uploadResult.url,
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
    const { page = 1, limit = 10, owner_id } = req.query;

    const query: any = {};

    // Add filters
    if (owner_id) {
      query.owner_id = owner_id;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const trips = await Trip.find(query)
      .sort({ createdAt: -1 })
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
    const updateData = req.body;

    if (!id) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.TRIP_ID_REQUIRED
      );
      return;
    }

    // Check if trip exists
    const trip = await Trip.findById(id);
    if (!trip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND);
      return;
    }

    // Update trip
    const updatedTrip = await Trip.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedTrip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND);
      return;
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

    // Check if trip exists
    const trip = await Trip.findById(id);
    if (!trip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND);
      return;
    }

    // Delete cover image from Cloudinary if exists
    if (trip.cover_image && trip.cover_image.url) {
      try {
        const publicId = trip.cover_image.url.split("/").pop()?.split(".")[0];
        if (publicId) {
          await deleteTripImage(publicId);
        }
      } catch (error) {
        console.error("Error deleting cover image from Cloudinary:", error);
      }
    }

    // Delete trip
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
