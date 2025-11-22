import { Request, Response } from "express";
import mongoose from "mongoose";
import { Meal, IMeal, Trip, User, IUser } from "../models";
import {
  sendSuccessResponse,
  sendErrorResponse,
  STATUS_CODES,
  MESSAGES,
} from "../utils/apiResponse";
import { MealType, IFoodOrder } from "../models/Meal";

// Create a new meal
export const createMeal = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      meal_date,
      order_deadline_date_time,
      meal_type,
      restaurants,
      trip_id,
      reminders = [],
      createdBy
    } = req.body;

    // Validate required fields
    if (!meal_date) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Meal date is required"
      );
      return;
    }

    if (!order_deadline_date_time) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Order deadline date time is required"
      );
      return;
    }

    if (!meal_type) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Meal type is required"
      );
      return;
    }

    if (!restaurants || !Array.isArray(restaurants) || restaurants.length < 1) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "At least one restaurant is required"
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

    // Validate meal_type enum
    const validMealTypes = Object.values(MealType);
    if (!validMealTypes.includes(meal_type as MealType)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        `Meal type must be one of: ${validMealTypes.join(", ")}`
      );
      return;
    }

    // Validate restaurants structure
    for (const restaurant of restaurants) {
      if (!restaurant.name || !restaurant.link) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Each restaurant must have both 'name' and 'link' fields"
        );
        return;
      }
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

    // Validate date formats
    const mealDate = new Date(meal_date);
    if (Number.isNaN(mealDate.getTime())) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid meal date format"
      );
      return;
    }

    // Validate order_deadline_date_time if provided
    if (order_deadline_date_time) {
      const deadlineDate = new Date(order_deadline_date_time);
      const currentDate = new Date();
      
      // Check if the date is valid
      if (Number.isNaN(deadlineDate.getTime())) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Invalid order deadline date time format"
        );
        return;
      }
       // Check if order_deadline_date_time exceeds meal_date
       if (deadlineDate > mealDate) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Order deadline date time cannot be after meal date"
        );
        return;
      }
      // Check if the date is in the past or current time
      if (deadlineDate < currentDate) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Order deadline date time must be in the today or in the future"
        );
        return;
      }
      // Check if the date is in the past or current time
      else if (deadlineDate >= currentDate) {
        // Check if there's at least 5 minutes difference
        const timeDifference = deadlineDate.getTime() - currentDate.getTime();
        const timeDifferenceMinutes = Math.floor(timeDifference / (1000 * 60));
        
        if (timeDifferenceMinutes < 5) {
          sendErrorResponse(
            res,
            STATUS_CODES.BAD_REQUEST,
            "Order deadline date time must be at least 5 minutes in the future"
          );
          return;
        }
      }

      // Check if there's sufficient time for reminders
      if (reminders && Array.isArray(reminders) && reminders.length > 0) {
        const timeUntilDeadline = deadlineDate.getTime() - currentDate.getTime();
        const timeUntilDeadlineMinutes = Math.floor(timeUntilDeadline / (1000 * 60));
        
        // Find the maximum reminder time (in minutes)
        const maxReminderTime = Math.max(...reminders);
        
        // Check if there's enough time for the longest reminder
        if (timeUntilDeadlineMinutes < maxReminderTime) {
          sendErrorResponse(
            res,
            STATUS_CODES.BAD_REQUEST,
            `Order deadline date time must be at least ${maxReminderTime} minutes in the future to accommodate the selected reminder time(s)`
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
    const currentUserRef = `/users/${user.userId}`;
    const isOwner = trip.owner_id === user.userId;
    const isHost = trip.hosts.includes(currentUserRef);

    if (!isOwner && !isHost) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Only trip Owner or Host can create meals"
      );
      return;
    }

    // Create meal data
    const mealData: Partial<IMeal> = {
      meal_date,
      order_deadline_date_time,
      meal_type: meal_type as string,
      restaurants,
      trip_id,
      reminders: reminders as number[],
      owner_id: user.userId,
      createdBy
    };

    // Create the meal
    const newMeal = new Meal(mealData);
    await newMeal.save();

    // Convert to object to include virtual fields
    const mealResponse = newMeal.toObject() as any;

    sendSuccessResponse(
      res,
      STATUS_CODES.CREATED,
      "Meal created successfully",
      mealResponse
    );
  } catch (error) {
    console.error("Error creating meal:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Update meal
export const updateMeal = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      meal_date,
      order_deadline_date_time,
      meal_type,
      restaurants,
      reminders,
      food_order,
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
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Meal ID is required");
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid meal ID format"
      );
      return;
    }

    // Find meal by MongoDB _id
    const meal = await Meal.findById(id);
    if (!meal) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Meal not found");
      return;
    }

    // Check if current user is meal owner
    if (meal.owner_id !== currentUser.userId) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Only meal owner can update the meal"
      );
      return;
    }

    // Build update data object
    const updateData: any = {};

    // Validate and add fields if they exist in the request
    if (meal_date !== undefined) {
      const mealDate = new Date(meal_date);
      if (Number.isNaN(mealDate.getTime())) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Invalid meal date format"
        );
        return;
      }
      updateData.meal_date = meal_date;
    }

    if (order_deadline_date_time !== undefined) {
      const deadlineDate = new Date(order_deadline_date_time);
      const currentDate = new Date();
      const mealDate = updateData.meal_date
        ? new Date(updateData.meal_date)
        : new Date(meal.meal_date);

      // Check if the date is valid
      if (Number.isNaN(deadlineDate.getTime())) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Invalid order deadline date time format"
        );
        return;
      }

      // Check if order_deadline_date_time exceeds meal_date
      if (deadlineDate > mealDate) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Order deadline date time cannot be after meal date"
        );
        return;
      }
      // Check if the date is in the past or current time
      if (deadlineDate < currentDate) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Order deadline date time must be in the today or in the future"
        );
        return;
      }
      // Check if the date is in the past or current time
      else if (deadlineDate >= currentDate) {
        // Check if there's at least 5 minutes difference
        const timeDifference = deadlineDate.getTime() - currentDate.getTime();
        const timeDifferenceMinutes = Math.floor(timeDifference / (1000 * 60));

        if (timeDifferenceMinutes < 5) {
          sendErrorResponse(
            res,
            STATUS_CODES.BAD_REQUEST,
            "Order deadline date time must be at least 5 minutes in the future"
          );
          return;
        }
      }

      // Check if there's sufficient time for reminders
      const remindersToCheck = reminders !== undefined ? reminders : meal.reminders;
      if (
        remindersToCheck &&
        Array.isArray(remindersToCheck) &&
        remindersToCheck.length > 0
      ) {
        const timeUntilDeadline = deadlineDate.getTime() - currentDate.getTime();
        const timeUntilDeadlineMinutes = Math.floor(
          timeUntilDeadline / (1000 * 60)
        );

        // Find the maximum reminder time (in minutes)
        const maxReminderTime = Math.max(...remindersToCheck);

        // Check if there's enough time for the longest reminder
        if (timeUntilDeadlineMinutes < maxReminderTime) {
          sendErrorResponse(
            res,
            STATUS_CODES.BAD_REQUEST,
            `Order deadline date time must be at least ${maxReminderTime} minutes in the future to accommodate the selected reminder time(s)`
          );
          return;
        }
      }

      updateData.order_deadline_date_time = order_deadline_date_time;
    }

    if (meal_type !== undefined) {
      // Validate meal_type enum
      const validMealTypes = Object.values(MealType);
      if (!validMealTypes.includes(meal_type as MealType)) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          `Meal type must be one of: ${validMealTypes.join(", ")}`
        );
        return;
      }
      updateData.meal_type = meal_type;
    }

    if (restaurants !== undefined) {
      if (!Array.isArray(restaurants) || restaurants.length < 1) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "At least one restaurant is required"
        );
        return;
      }

      // Validate restaurants structure
      for (const restaurant of restaurants) {
        if (!restaurant.name || !restaurant.link) {
          sendErrorResponse(
            res,
            STATUS_CODES.BAD_REQUEST,
            "Each restaurant must have both 'name' and 'link' fields"
          );
          return;
        }
      }
      updateData.restaurants = restaurants;
    }

    if (reminders !== undefined) {
      updateData.reminders = reminders;
    }

    if (food_order !== undefined) {
      // Validate food_order structure if provided
      if (food_order && Array.isArray(food_order)) {
        for (const order of food_order) {
          if (!order.meal || !order.name || !order.userId) {
            sendErrorResponse(
              res,
              STATUS_CODES.BAD_REQUEST,
              "Each food order must have 'meal', 'name', and 'userId' fields"
            );
            return;
          }

          // Validate userId format
          if (!mongoose.Types.ObjectId.isValid(order.userId)) {
            sendErrorResponse(
              res,
              STATUS_CODES.BAD_REQUEST,
              `Invalid userId format in food order: ${order.userId}`
            );
            return;
          }
        }
        updateData.food_order = food_order;
      } else if (!Array.isArray(food_order)) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "food_order must be an array"
        );
        return;
      } else {
        // Empty array is allowed
        updateData.food_order = food_order;
      }
    }

    // Update meal
    const updatedMeal = await Meal.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedMeal) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Meal not found");
      return;
    }

    // Convert to object to include virtual fields
    const mealResponse = updatedMeal.toObject();

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Meal updated successfully",
      mealResponse
    );
  } catch (error) {
    console.error("Error updating meal:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Delete meal
export const deleteMeal = async (
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
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Meal ID is required");
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid meal ID format"
      );
      return;
    }

    // Find meal by MongoDB _id
    const meal = await Meal.findById(id);
    if (!meal) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Meal not found");
      return;
    }

    // Check if current user is meal owner
    if (meal.owner_id !== currentUser.userId) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Only meal owner can delete the meal"
      );
      return;
    }

    // Delete meal
    await Meal.findByIdAndDelete(id);

    sendSuccessResponse(res, STATUS_CODES.OK, "Meal deleted successfully");
  } catch (error) {
    console.error("Error deleting meal:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Get all meals for a trip
export const getMealsByTrip = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { tripId } = req.params;
    const { page = 1, limit = 10, meal_type } = req.query;
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
        "You don't have access to this trip's meals"
      );
      return;
    }

    const query: any = { trip_id: tripId };

    // Add filters
    if (meal_type) {
      // Validate meal_type if provided
      const validMealTypes = Object.values(MealType);
      if (!validMealTypes.includes(meal_type as MealType)) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          `Invalid meal type. Must be one of: ${validMealTypes.join(", ")}`
        );
        return;
      }
      query.meal_type = meal_type;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const meals = await Meal.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Meal.countDocuments(query);

    // Transform meals to include user information with profile photos
    const mealsResponse = await Promise.all(
      meals.map(async (meal) => {
        const mealObj = meal.toObject() as any;

        // Get user information for the meal owner
        const owner = await User.findById(meal.owner_id).select(
          "_id email preferredName profilePhoto"
        );

        if (owner) {
          mealObj.createdBy = {
            _id: owner._id,
            email: owner.email,
            preferredName: owner.preferredName,
            profilePhotoURL: owner.profilePhoto?.url || null,
          };
        } else {
          mealObj.createdBy = {
            _id: meal.owner_id,
            email: null,
            preferredName: null,
            profilePhotoURL: null,
          };
        }
        const foodOrderResponse = [];
        if (mealObj.food_order && Array.isArray(mealObj.food_order)) {
          for (const order of mealObj.food_order) {
            const user = await User.findById(order.userId).select('_id email preferredName profilePhoto');
            if (user) {
              order.user={
                _id: user._id,
                email: user.email,
                preferredName: user.preferredName,
                profilePhotoURL: user.profilePhoto?.url || null,
              };
              delete order.userId;
              foodOrderResponse.push(order);
            }
          }
          mealObj.food_order = foodOrderResponse;
        }
        return mealObj;
      })
    );

    sendSuccessResponse(res, STATUS_CODES.OK, "Meals retrieved successfully", {
      meals: mealsResponse,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting meals:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Get meal by ID
export const getMealById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = (req as Request & { user: IUser }).user;

    if (!currentUser) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User authentication required"
      );
      return;
    }

    if (!id) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Meal ID is required");
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid meal ID format"
      );
      return;
    }

    // Find meal by MongoDB _id
    const meal = await Meal.findById(id);
    if (!meal) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Meal not found");
      return;
    }

    // Check if trip exists
    const trip = await Trip.findById(meal.trip_id);
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
        "You don't have access to this meal"
      );
      return;
    }

    // Get user information for the meal owner
    const owner = await User.findById(meal.owner_id).select(
      "_id email preferredName profilePhoto"
    );

    // Convert to object to include virtual fields
    const mealResponse = meal.toObject() as any;

    // Add createdBy information
    if (owner) {
      mealResponse.createdBy = {
        _id: owner._id,
        email: owner.email,
        preferredName: owner.preferredName,
        profilePhotoURL: owner.profilePhoto?.url || null,
      };
    } else {
      mealResponse.createdBy = {
        _id: meal.owner_id,
        email: null,
        preferredName: null,
        profilePhotoURL: null,
      };
    }
    const foodOrderResponse = [];
    if (mealResponse.food_order && Array.isArray(mealResponse.food_order)) {
      for (const order of mealResponse.food_order) {
        const user = await User.findById(order.userId).select('_id email preferredName profilePhoto');
        if (user) {
          order.user={
            _id: user._id,
            email: user.email,
            preferredName: user.preferredName,
            profilePhotoURL: user.profilePhoto?.url || null,
          };
          delete order.userId;
          foodOrderResponse.push(order);
        }
      }
      mealResponse.food_order = foodOrderResponse;
    }
    
    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Meal retrieved successfully",
      mealResponse
    );
  } catch (error) {
    console.error("Error getting meal:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Submit meal order
export const submitMealOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { mealId } = req.params;
    const { name, meal, userId } = req.body;
    const currentUser = (req as any).user;

    if (!currentUser) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User authentication required"
      );
      return;
    }

    if (!mealId) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Meal ID is required");
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(mealId)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid meal ID format"
      );
      return;
    }

    // Validate required fields
    if (!name) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Restaurant name is required"
      );
      return;
    }

    if (!meal || typeof meal !== "string" || !meal.trim()) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Food order is required and must be a non-empty string"
      );
      return;
    }

    if (!userId) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "User ID is required"
      );
      return;
    }

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid user ID format"
      );
      return;
    }

    // Find meal by MongoDB _id
    const mealOrder = await Meal.findById(mealId);
    if (!mealOrder) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Meal not found");
      return;
    }

    // Check if trip exists
    const trip = await Trip.findById(mealOrder.trip_id);
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
        "You don't have access to this meal"
      );
      return;
    }

    // Check if user is ordering for themselves or is authorized
    if (userId !== currentUser.userId) {
      // Only trip owner or hosts can create orders for other users
      if (!isOwner && !isHost) {
        sendErrorResponse(
          res,
          STATUS_CODES.FORBIDDEN,
          "You can only create orders for yourself unless you are a trip owner or host"
        );
        return;
      }
    }

    // Check if user already has an order for this meal
    const existingOrderIndex = mealOrder.food_order?.findIndex(
      (order) => order.userId === userId
    );

    if (existingOrderIndex !== undefined && existingOrderIndex !== -1) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "User already has an order for this meal. Use update endpoint to modify it."
      );
      return;
    }

    // Create new food order
    const newFoodOrder: IFoodOrder = {
      name: name.trim(),
      userId: userId,
      meal: meal.trim(),
    };

    // Initialize food_order array if it doesn't exist
    mealOrder.food_order ??= [];

    // Add the food order text to the order
    const foodOrderWithText: IFoodOrder = {
      ...newFoodOrder,
      meal: meal.trim(),
    };

    // Add the new order to the array
    mealOrder.food_order.push(foodOrderWithText);
    await mealOrder.save();

    // Convert to object to include virtual fields
    const mealResponse = mealOrder.toObject() as any;

    sendSuccessResponse(
      res,
      STATUS_CODES.CREATED,
      "Meal order submitted successfully",
      mealResponse
    );
  } catch (error) {
    console.error("Error submitting meal order:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

// Update meal order
export const updateMealOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { mealId, orderId } = req.params;
    const { name, meal } = req.body;
    const currentUser = (req as any).user;

    if (!currentUser) {
      sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User authentication required"
      );
      return;
    }

    if (!mealId) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Meal ID is required");
      return;
    }

    if (!orderId) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Order ID is required");
      return;
    }

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(mealId)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid meal ID format"
      );
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid order ID format"
      );
      return;
    }

    // Validate foodOrder
    if (!meal || typeof meal !== "string" || !meal.trim()) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Food order is required and must be a non-empty string"
      );
      return;
    }

    // Find meal by MongoDB _id
    const mealOrder = await Meal.findById(mealId);
    if (!mealOrder) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Meal not found");
      return;
    }

    // Check if trip exists
    const trip = await Trip.findById(mealOrder.trip_id);
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
        "You don't have access to this meal"
      );
      return;
    }

    // Find the order in the food_order array
    if (!mealOrder.food_order || mealOrder.food_order.length === 0) {
      sendErrorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        "No orders found for this meal"
      );
      return;
    }

    // Find order by _id (MongoDB automatically adds _id to subdocuments)
    const orderIndex = mealOrder.food_order.findIndex(
      (order: any) => order._id?.toString() === orderId
    );

    if (orderIndex === -1) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Order not found");
      return;
    }

    const order = mealOrder.food_order[orderIndex] as any;

    // Check if user is authorized to update this order
    // User can update their own order, or trip owner/host can update any order
    if (order.userId !== currentUser.userId && !isOwner && !isHost) {
      sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "You can only update your own order unless you are a trip owner or host"
      );
      return;
    }

    // Update the food order text
    if (name !== undefined) {
      order.name = name.trim();
    }
    if (meal !== undefined) {
      order.meal = meal.trim();
    }
    mealOrder.markModified("food_order");
    await mealOrder.save();

    // Convert to object to include virtual fields
    const mealResponse = mealOrder.toObject() as any;

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Meal order updated successfully",
      mealResponse
    );
  } catch (error) {
    console.error("Error updating meal order:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

