import { Request, Response } from "express";
import Payment from "../models/Payment";
import Plan from "../models/Plan";
import User, { UserRole } from "../models/User";
import { sendSuccessResponse, sendErrorResponse } from "../utils/apiResponse";

export const getPaymentSuccess = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Find payment by Stripe session ID
    const payment = await Payment.findOne({
      $or: [
        { stripePaymentIntentId: sessionId },
        { stripeSessionId: sessionId },
      ],
    }).populate("planId", "planName successUrl features");

    if (!payment) {
      return sendErrorResponse(res, 404, "Payment not found");
    }

    if (payment.status !== "succeeded") {
      return sendErrorResponse(res, 400, "Payment not successful");
    }

    // Get user details
    const user = await User.findById(payment.userId);

    return sendSuccessResponse(res, 200, "Payment success details retrieved", {
      payment: {
        id: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt,
      },
      plan: {
        name: (payment.planId as any).planName,
        features: (payment.planId as any).features,
        successUrl: (payment.planId as any).successUrl,
      },
      user: {
        id: user?._id,
        name: user?.name,
        email: user?.email,
        userRole: user?.userRole,
      },
      nextSteps: [
        "Your account has been upgraded to Owner role",
        "You can now access premium features",
        "Welcome to the Coordle community!",
      ],
    });
  } catch (error) {
    console.error("Error getting payment success:", error);
    return sendErrorResponse(res, 500, "Failed to get payment success details");
  }
};

export const redirectToSuccessUrl = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Find payment and plan
    const payment = await Payment.findOne({
      $or: [
        { stripePaymentIntentId: sessionId },
        { stripeSessionId: sessionId },
      ],
    }).populate("planId", "successUrl");

    if (!payment) {
      return sendErrorResponse(res, 404, "Payment not found");
    }

    if (payment.status !== "succeeded") {
      return sendErrorResponse(res, 400, "Payment not successful");
    }

    const successUrl = (payment.planId as any).successUrl;

    if (!successUrl) {
      // If no external success URL, return success data
      return sendSuccessResponse(
        res,
        200,
        "Payment successful - redirect to your app",
        {
          message: "Payment completed successfully",
          redirectToApp: true,
          sessionId: sessionId,
        }
      );
    }

    // Redirect to the success URL
    res.redirect(successUrl);
  } catch (error) {
    console.error("Error redirecting to success URL:", error);
    return sendErrorResponse(res, 500, "Failed to redirect to success URL");
  }
};
