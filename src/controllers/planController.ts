import { Request, Response } from "express";
import { Plan, IPlan } from "../models";
import {
  sendSuccessResponse,
  sendErrorResponse,
  STATUS_CODES,
} from "../utils/apiResponse";

// Create a new plan
export const createPlan = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      planName,
      planVariant,
      price,
      currency = "usd",
      planId,
      features,
      allowedHost,
      allocation,
      participants,
      maxParticipants,
      freeTrial,
      months,
      trialDays = 0,
    } = req.body;

    // Validate required fields
    if (!planName || !price || !planId || !features || !allowedHost) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Plan name, price, plan ID, features, and allowed hosts are required"
      );
      return;
    }

    // Check if plan ID already exists
    const existingPlan = await Plan.findOne({ planId });
    if (existingPlan) {
      sendErrorResponse(
        res,
        STATUS_CODES.CONFLICT,
        "Plan with this plan ID already exists"
      );
      return;
    }

    // Create plan
    const plan = new Plan({
      planName,
      planVariant,
      price,
      currency,
      planId,
      features,
      allowedHost,
      allocation,
      participants,
      maxParticipants,
      freeTrial,
      months,
      trialDays,
    });

    const savedPlan = await plan.save();

    sendSuccessResponse(
      res,
      STATUS_CODES.CREATED,
      "Plan created successfully",
      savedPlan
    );
  } catch (error) {
    console.error("Error creating plan:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to create plan"
    );
  }
};

// Get all plans
export const getAllPlans = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 });

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Plans retrieved successfully",
      plans
    );
  } catch (error) {
    console.error("Error retrieving plans:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to retrieve plans"
    );
  }
};

// Get plan by ID
export const getPlanById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const plan = await Plan.findById(id);

    if (!plan) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Plan not found");
      return;
    }

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Plan retrieved successfully",
      plan
    );
  } catch (error) {
    console.error("Error retrieving plan:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to retrieve plan"
    );
  }
};

// Get all plan prices
export const getAllPlanPrices = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const plans = await Plan.find().select('planName planVariant price currency planId features allowedHost allocation participants maxParticipants freeTrial months trialDays').sort({ price: 1 });

    // Format the response to show prices clearly
    const formattedPlans = plans.map(plan => ({
      id: plan._id,
      planName: plan.planName,
      planVariant: plan.planVariant || null,
      price: plan.price,
      priceFormatted: `$${(plan.price / 100).toFixed(2)}`,
      currency: plan.currency,
      planId: plan.planId,
      features: plan.features,
      allowedHost: plan.allowedHost,
      allocation: plan.allocation || null,
      participants: plan.participants || null,
      maxParticipants: plan.maxParticipants || null,
      freeTrial: plan.freeTrial || null,
      months: plan.months || null,
      trialDays: plan.trialDays,
      summary: `${plan.planName}${plan.planVariant ? ` ${plan.planVariant}` : ''} - $${(plan.price / 100).toFixed(2)}`
    }));

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Plan prices retrieved successfully",
      {
        totalPlans: formattedPlans.length,
        plans: formattedPlans,
        priceRange: {
          min: Math.min(...plans.map(p => p.price)),
          max: Math.max(...plans.map(p => p.price)),
          currency: "usd"
        }
      }
    );
  } catch (error) {
    console.error("Error retrieving plan prices:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to retrieve plan prices"
    );
  }
};
