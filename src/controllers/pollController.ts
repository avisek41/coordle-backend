import { Request, Response } from "express";
import mongoose from "mongoose";
import { Poll, IPoll, Trip, User, IUser } from "../models";
import {
  sendSuccessResponse,
  sendErrorResponse,
  STATUS_CODES,
  MESSAGES,
} from "../utils/apiResponse";



// Create a new poll
export const createPoll = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      question,
      options,
      allow_multi_answers = false,
      published = false,
      trip_id,
      createdBy,
      status = "Active",
      close_poll_date_time,
      display_close_poll_date,
      display_close_poll_time,
      reminders = [],
    } = req.body;

    // Validate required fields
    if (!question) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Poll question is required"
      );
      return;
    }

    // if (!options || !Array.isArray(options) || options.length < 2) {
    //   sendErrorResponse(
    //     res,
    //     STATUS_CODES.BAD_REQUEST,
    //     "Poll must have at least 2 options"
    //   );
    //   return;
    // }

    if (!trip_id) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Trip ID is required"
      );
      return;
    }

    if (!createdBy) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "CreatedBy is required"
      );
      return;
    }


    // Get user info from request
    const user = (req as any).user;
    if (!user) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User authentication required"
      );
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(trip_id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid trip ID format"
      );
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(createdBy)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid createdBy ID format"
      );
      return;
    }


    // Check if trip exists
    const trip = await Trip.findById(trip_id);
    if (!trip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Trip not found");
      return;
    }

    // Check if user is part of the trip
    const currentUserRef = `/users/${createdBy}`;
    const isOwner = trip.owner_id === createdBy;
    const isHost = trip.hosts.includes(currentUserRef);
    const isTraveler = trip.users.includes(currentUserRef);

    if (!isOwner && !isHost && !isTraveler) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Only trip participants can create polls"
      );
      return;
    }


    let closePollDateTime = "";
    let displayClosePollDate = "";
    let displayClosePollTime = "";

    if (close_poll_date_time) {
      closePollDateTime = close_poll_date_time;
    }

    if (display_close_poll_date) {
      displayClosePollDate = display_close_poll_date;
    }

    if (display_close_poll_time) {
      displayClosePollTime = display_close_poll_time;
    }

    // Create poll data
    const pollData: Partial<IPoll> = {
      question,
      options: options || [],
      allow_multi_answers,
      published,
      owner_id: user.userId,
      createdBy,
      trip_id,
      status: status as "Active" | "Closed",
      close_poll_date_time: closePollDateTime,
      display_close_poll_date: displayClosePollDate,
      display_close_poll_time: displayClosePollTime,
      reminders: reminders as number[],
    };

    // Create the poll
    const newPoll = new Poll(pollData);
    await newPoll.save();

    // Convert to object to include virtual fields
    const pollResponse = newPoll.toObject() as any;
    
    // Transform response to include createdBy instead of owner_id
    pollResponse.createdBy = createdBy;
    delete pollResponse.owner_id;

    sendSuccessResponse(
      res,
      STATUS_CODES.CREATED,
      "Poll created successfully",
      pollResponse
    );
  } catch (error) {
    console.error("Error creating poll:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Get all polls for a trip
export const getPollsByTrip = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { tripId } = req.params;
    const { page = 1, limit = 10, status, published } = req.query;
    const currentUser = (req as Request & { user: IUser }).user;

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
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Trip not found");
      return;
    }

    // Check if user is part of the trip
    const currentUserRef = `/users/${currentUser.userId}`;
    const isOwner = trip.owner_id === currentUser.userId;
    const isHost = trip.hosts.includes(currentUserRef);
    const isTraveler = trip.users.includes(currentUserRef);

    if (!isOwner && !isHost && !isTraveler) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "You don't have access to this trip's polls"
      );
      return;
    }

    const query: any = { trip_id: tripId };

    // Add filters
    if (status) {
      query.status = status;
    }

    if (published !== undefined) {
      query.published = published === "true";
    }

    const skip = (Number(page) - 1) * Number(limit);

    const polls = await Poll.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Poll.countDocuments(query);

    // Transform polls to include user information with profile photos
    const pollsResponse = await Promise.all(
      polls.map(async (poll) => {
        const pollObj = poll.toObject() as any;
        
        // Get user information for the poll owner
        const owner = await User.findById(poll.owner_id).select('_id email preferredName profilePhoto');
        
        if (owner) {
          pollObj.createdBy = {
            _id: owner._id,
            email: owner.email,
            preferredName: owner.preferredName,
            profilePhotoURL: owner.profilePhoto?.url || null
          };
        } else {
          pollObj.createdBy = {
            _id: poll.owner_id,
            email: null,
            preferredName: null,
            profilePhotoURL: null
          };
        }
        
        return pollObj;
      })
    );

    sendSuccessResponse(res, STATUS_CODES.OK, "Polls retrieved successfully", {
      polls: pollsResponse,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting polls:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Get poll by ID
export const getPollById = async (
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
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Poll ID is required");
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid poll ID format"
      );
      return;
    }

    // Find poll by MongoDB _id
    const poll = await Poll.findById(id);

    if (!poll) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Poll not found");
      return;
    }

    // Check if user is part of the trip
    const trip = await Trip.findById(poll.trip_id);
    if (!trip) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Trip not found");
      return;
    }

    const currentUserRef = `/users/${currentUser.userId}`;
    const isOwner = trip.owner_id === currentUser.userId;
    const isHost = trip.hosts.includes(currentUserRef);
    const isTraveler = trip.users.includes(currentUserRef);

    if (!isOwner && !isHost && !isTraveler) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "You don't have access to this poll"
      );
      return;
    }

    // Convert to object to include virtual fields
    const pollObj = poll.toObject() as any;
    
    // Get user information for the poll owner
    const owner = await User.findById(poll.owner_id).select('_id email preferredName profilePhoto');
    
    if (owner) {
      pollObj.createdBy = {
        _id: owner._id,
        email: owner.email,
        preferredName: owner.preferredName,
        profilePhotoURL: owner.profilePhoto?.url || null
      };
    } else {
      pollObj.createdBy = {
        _id: poll.owner_id,
        email: null,
        preferredName: null,
        profilePhotoURL: null
      };
    }

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Poll retrieved successfully",
      pollObj
    );
  } catch (error) {
    console.error("Error getting poll:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Update poll
export const updatePoll = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      question,
      options,
      allow_multi_answers,
      published,
      status,
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

    if (!id) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Poll ID is required");
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid poll ID format"
      );
      return;
    }

    // Find poll by MongoDB _id
    const poll = await Poll.findById(id);
    if (!poll) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Poll not found");
      return;
    }

    // Check if current user is poll owner
    if (poll.owner_id !== currentUser.userId) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Only poll owner can update the poll"
      );
      return;
    }

    // Build update data object
    const updateData: any = {};

    // Add fields if they exist in the request
    if (question !== undefined) updateData.question = question;
    if (options !== undefined) updateData.options = options;
    if (allow_multi_answers !== undefined) updateData.allow_multi_answers = allow_multi_answers;
    if (published !== undefined) updateData.published = published;
    if (status !== undefined) updateData.status = status;


    // Update poll
    const updatedPoll = await Poll.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedPoll) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Poll not found");
      return;
    }

    // Convert to object to include virtual fields
    const pollResponse = updatedPoll.toObject();

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Poll updated successfully",
      pollResponse
    );
  } catch (error) {
    console.error("Error updating poll:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Delete poll
export const deletePoll = async (
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
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Poll ID is required");
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid poll ID format"
      );
      return;
    }

    // Find poll by MongoDB _id
    const poll = await Poll.findById(id);
    if (!poll) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Poll not found");
      return;
    }

    // Check if current user is poll owner
    if (poll.owner_id !== currentUser.userId) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Only poll owner can delete the poll"
      );
      return;
    }

    // Delete poll
    await Poll.findByIdAndDelete(id);

    sendSuccessResponse(res, STATUS_CODES.OK, "Poll deleted successfully");
  } catch (error) {
    console.error("Error deleting poll:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Publish poll
export const publishPoll = async (
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
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Poll ID is required");
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid poll ID format"
      );
      return;
    }

    // Find poll by MongoDB _id
    const poll = await Poll.findById(id);
    if (!poll) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Poll not found");
      return;
    }

    // Check if current user is poll owner
    if (poll.owner_id !== currentUser.userId) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Only poll owner can publish the poll"
      );
      return;
    }

    // Update poll to published
    const updatedPoll = await Poll.findByIdAndUpdate(
      id,
      { 
        $set: { 
          published: true, 
          status: "Active" 
        } 
      },
      { new: true }
    );

    if (!updatedPoll) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Poll not found");
      return;
    }

    // Convert to object to include virtual fields
    const pollResponse = updatedPoll.toObject();

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Poll published successfully",
      pollResponse
    );
  } catch (error) {
    console.error("Error publishing poll:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Close poll
export const closePoll = async (
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
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Poll ID is required");
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid poll ID format"
      );
      return;
    }

    // Find poll by MongoDB _id
    const poll = await Poll.findById(id);
    if (!poll) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Poll not found");
      return;
    }

    // Check if current user is poll owner
    if (poll.owner_id !== currentUser.userId) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Only poll owner can close the poll"
      );
      return;
    }

    // Update poll to closed
    const updatedPoll = await Poll.findByIdAndUpdate(
      id,
      { 
        $set: { 
          status: "Closed" 
        } 
      },
      { new: true }
    );

    if (!updatedPoll) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Poll not found");
      return;
    }

    // Convert to object to include virtual fields
    const pollResponse = updatedPoll.toObject();

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Poll closed successfully",
      pollResponse
    );
  } catch (error) {
    console.error("Error closing poll:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Get all polls (admin or for trip participants)
export const getAllPolls = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10, status, published, trip_id } = req.query;
    const currentUser = (req as any).user;

    if (!currentUser) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User authentication required"
      );
      return;
    }

    const query: any = {};

    // Add filters
    if (status) {
      query.status = status;
    }

    if (published !== undefined) {
      query.published = published === "true";
    }

    if (trip_id) {
      query.trip_id = trip_id;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const polls = await Poll.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Poll.countDocuments(query);

    // Transform polls to include user information with profile photos
    const pollsResponse = await Promise.all(
      polls.map(async (poll) => {
        const pollObj = poll.toObject() as any;
        
        // Get user information for the poll owner
        const owner = await User.findById(poll.owner_id).select('_id email preferredName profilePhoto');
        
        if (owner) {
          pollObj.createdBy = {
            _id: owner._id,
            email: owner.email,
            preferredName: owner.preferredName,
            profilePhotoURL: owner.profilePhoto?.url || null
          };
        } else {
          pollObj.createdBy = {
            _id: poll.owner_id,
            email: null,
            preferredName: null,
            profilePhotoURL: null
          };
        }
        
        return pollObj;
      })
    );

    sendSuccessResponse(res, STATUS_CODES.OK, "Polls retrieved successfully", {
      polls: pollsResponse,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting polls:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};
