import { Request, Response } from "express";
import mongoose from "mongoose";
import { Poll, IPoll, Trip, User, IUser, IVote } from "../models";
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

    if (!options || !Array.isArray(options) || options.length < 2) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Poll must have at least 2 options"
      );
      return;
    }

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

    // Validate close_poll_date_time if provided
    if (close_poll_date_time) {
      const closeDate = new Date(close_poll_date_time);
      const currentDate = new Date();
      
      // Check if the date is valid
      if (isNaN(closeDate.getTime())) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Invalid close poll date time format"
        );
        return;
      }
      
      // Check if the date is in the past or current time
      if (closeDate <= currentDate) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Close poll date time must be in the future"
        );
        return;
      }

      // Check if there's at least 5 minutes difference
      const timeDifference = closeDate.getTime() - currentDate.getTime();
      const timeDifferenceMinutes = Math.floor(timeDifference / (1000 * 60));
      
      if (timeDifferenceMinutes < 5) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Close poll date time must be at least 5 minutes in the future"
        );
        return;
      }

      // Check if there's sufficient time for reminders
      if (reminders && Array.isArray(reminders) && reminders.length > 0) {
        const timeUntilClose = closeDate.getTime() - currentDate.getTime();
        const timeUntilCloseMinutes = Math.floor(timeUntilClose / (1000 * 60));
        
        // Find the maximum reminder time (in minutes)
        const maxReminderTime = Math.max(...reminders);
        
        // Check if there's enough time for the longest reminder
        if (timeUntilCloseMinutes < maxReminderTime) {
          sendErrorResponse(
            res,
            STATUS_CODES.BAD_REQUEST,
            `close poll date time must be at least ${maxReminderTime} minutes in the future to accommodate the selected reminder time(s)`
          );
          return;
        }
      }
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

    // Get poll with vote information
    const pollWithVotes = await Poll.findById(id)
      .populate('createdBy', 'preferredName profilePhoto')
      .populate('votes.userId', 'preferredName profilePhoto');

    if (!pollWithVotes) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Poll not found");
      return;
    }

    // Convert to object to include virtual fields
    const pollObj = pollWithVotes.toObject() as any;
    
    // Format options with vote counts and user selection status
    pollObj.options = pollWithVotes.options?.map((option: string) => {
      const optionVotes = pollWithVotes.votes?.filter(
        (vote: any) => vote.selectedOptionText.includes(option)
      ) || [];
      
      const isSelectedByUser = optionVotes.some(
        (vote: any) => vote.userId._id.toString() === currentUser.userId
      );

      return {
        text: option,
        vote_count: optionVotes.length,
        is_selected_by_user: isSelectedByUser,
        voters: optionVotes.map((vote: any) => ({
          _id: vote.userId._id,
          preferredName: vote.userId.preferredName,
          profilePhotoURL: vote.userId.profilePhoto?.url || null,
        })).slice(0, 3), // Limit to 3 voters for display
      };
    }) || [];

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
    const { page = 1, limit = 10, status, published, trip_id, id } = req.query;
    const currentUser = (req as any).user;

    if (!currentUser) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User authentication required"
      );
      return;
    }

    // If id is provided as query parameter, return single poll
    if (id) {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(id as string)) {
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

// Vote on a poll
export const voteOnPoll = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { selectedOptionTexts } = req.body; // Array of selected option texts
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

    // Validate selectedOptionTexts
    if (!Array.isArray(selectedOptionTexts) || selectedOptionTexts.length === 0) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "At least one option must be selected"
      );
      return;
    }

    // Find poll by MongoDB _id
    const poll = await Poll.findById(id);
    if (!poll) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Poll not found");
      return;
    }

    // Check if poll is published and active
    if (!poll.published || poll.status === "Closed") {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Cannot vote on a closed or unpublished poll"
      );
      return;
    }

    // Check if poll close time has passed
    if (poll.close_poll_date_time && new Date(poll.close_poll_date_time) <= new Date()) {
      // Update poll status to closed
      await Poll.findByIdAndUpdate(id, { status: "Closed" });
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Cannot vote on a poll that has already closed"
      );
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

    // Validate option texts
    const validOptionTexts = selectedOptionTexts.filter(
      (optionText: string) => 
        typeof optionText === 'string' && 
        optionText.trim().length > 0 &&
        poll.options?.includes(optionText.trim())
    );

    if (validOptionTexts.length !== selectedOptionTexts.length) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid option texts provided. Please select from available options."
      );
      return;
    }

    // Enforce single select if applicable
    if (!poll.allow_multi_answers && validOptionTexts.length > 1) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "This is a single-select poll. Please choose only one option."
      );
      return;
    }

    // Remove existing votes from this user
    poll.votes = poll.votes?.filter(
      (vote: IVote) => vote.userId.toString() !== currentUser.userId
    ) || [];

    // Add new vote with all selected options
    const newVote: IVote = {
      userId: new mongoose.Types.ObjectId(currentUser.userId),
      selectedOptionText: validOptionTexts.map((optionText: string) => optionText.trim()),
      votedAt: new Date(),
    };

    poll.votes = [...(poll.votes || []), newVote];
    await poll.save();

    // Get updated poll with vote counts
    const updatedPoll = await Poll.findById(id)
      .populate('createdBy', 'preferredName profilePhoto')
      .populate('votes.userId', 'preferredName profilePhoto');

    if (!updatedPoll) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Poll not found");
      return;
    }

    // Format response with vote counts and user selection status
    const formattedPoll = {
      ...updatedPoll.toObject(),
      options: updatedPoll.options?.map((option: string) => {
        const optionVotes = updatedPoll.votes?.filter(
          (vote: any) => vote.selectedOptionText.includes(option)
        ) || [];
        
        const isSelectedByUser = optionVotes.some(
          (vote: any) => vote.userId._id.toString() === currentUser.userId
        );

        return {
          text: option,
          vote_count: optionVotes.length,
          is_selected_by_user: isSelectedByUser,
          voters: optionVotes.map((vote: any) => ({
            _id: vote.userId._id,
            preferredName: vote.userId.preferredName,
            profilePhotoURL: vote.userId.profilePhoto?.url || null,
          })).slice(0, 3), // Limit to 3 voters for display
        };
      }) || [],
      votes: updatedPoll.votes?.map((vote: any) => ({
        user: {
          _id: vote.userId._id,
          preferredName: vote.userId.preferredName,
          profilePhotoURL: vote.userId.profilePhoto?.url || null
        },
        selectedOptionText: vote.selectedOptionText,
        votedAt: vote.votedAt,
        _id: vote._id
      })) || []
    };

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Vote cast successfully",
      formattedPoll
    );
  } catch (error) {
    console.error("Error voting on poll:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Get detailed vote breakdown for a poll
export const getPollVotes = async (
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
    const poll = await Poll.findById(id)
      .populate('createdBy', 'preferredName profilePhoto')
      .populate('votes.userId', 'preferredName profilePhoto');

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

    // Get all unique voters
    const uniqueVoters = new Set();
    poll.votes?.forEach((vote: any) => {
      uniqueVoters.add(vote.userId._id.toString());
    });

    // Format response with detailed vote breakdown
    const formattedPoll = {
      ...poll.toObject(),
      total_voters: uniqueVoters.size,
      trip_members_count: trip.users.length + (trip.hosts?.length || 0) + 1, // +1 for owner
      options: poll.options?.map((option: string) => {
        const optionVotes = poll.votes?.filter(
          (vote: any) => vote.selectedOptionText.includes(option)
        ) || [];
        
        return {
          text: option,
          vote_count: optionVotes.length,
          voters: optionVotes.map((vote: any) => ({
            _id: vote.userId._id,
            preferredName: vote.userId.preferredName,
            profilePhotoURL: vote.userId.profilePhoto?.url || null,
            votedAt: vote.votedAt,
          })),
        };
      }) || [],
      // Transform votes array to rename userId to user and convert profilePhoto to profilePhotoURL
      votes: poll.votes?.map((vote: any) => ({
        _id: vote._id,
        user: {
          _id: vote.userId._id,
          preferredName: vote.userId.preferredName,
          profilePhotoURL: vote.userId.profilePhoto?.url || null, // Convert profilePhoto object to URL string
        },
        selectedOptionText: vote.selectedOptionText,
        votedAt: vote.votedAt,
      })) || [],
    };

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Poll votes retrieved successfully",
      formattedPoll
    );
  } catch (error) {
    console.error("Error getting poll votes:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};