import { Request, Response } from "express";
import stripe from "../config/stripe";
import Payment from "../models/Payment";
import Plan from "../models/Plan";
import User, { UserRole } from "../models/User";
import { sendSuccessResponse, sendErrorResponse } from "../utils/apiResponse";

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const { planId } = req.body;

    const userId = (req as any).user?.userId; // From auth middleware (JWT payload has 'userId', not 'id')

    // Validate userId
    if (!userId) {
      return sendErrorResponse(
        res,
        401,
        "Authentication required: User ID not found."
      );
    }

    // Validate plan exists
    const plan = await Plan.findById(planId);
    if (!plan) {
      return sendErrorResponse(res, 404, "Plan not found");
    }

    // Check if user already has an active payment for this plan
    const existingPayment = await Payment.findOne({
      userId,
      planId,
      status: { $in: ["pending", "succeeded"] },
    });

    if (existingPayment) {
      return sendErrorResponse(
        res,
        400,
        "Payment already exists for this plan"
      );
    }

    // Create checkout session with Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: plan.currency,
            product_data: {
              name: plan.planName,
              description: plan.features.join(", "),
            },
            unit_amount: Math.round(plan.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${
        process.env.BASE_URL || "http://localhost:3000"
      }/api/payments/success/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${
        process.env.BASE_URL || "http://localhost:3000"
      }/api/payments/cancel`,
      metadata: {
        userId: userId.toString(),
        planId: planId.toString(),
        planName: plan.planName,
      },
      customer_email: (req as any).user?.email,
    });

    // Create payment record in database
    const payment = new Payment({
      userId,
      planId,
      stripeSessionId: session.id, // Use session ID for checkout sessions
      amount: plan.price,
      currency: plan.currency,
      status: "pending",
      // Note: stripePaymentIntentId will be set when webhook is received
    });

    await payment.save();

    return sendSuccessResponse(
      res,
      200,
      "Checkout session created successfully",
      {
        checkoutUrl: session.url,
        sessionId: session.id,
        amount: plan.price,
        currency: plan.currency,
        planName: plan.planName,
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return sendErrorResponse(res, 500, "Failed to create checkout session");
  }
};

export const confirmPayment = async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = (req as any).user?.userId;

    // Validate userId
    if (!userId) {
      return sendErrorResponse(
        res,
        401,
        "Authentication required: User ID not found."
      );
    }

    // Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return sendErrorResponse(res, 404, "Payment intent not found");
    }

    // Check if payment belongs to the authenticated user
    if (paymentIntent.metadata.userId !== userId.toString()) {
      return sendErrorResponse(res, 403, "Unauthorized access to payment");
    }

    // Update payment status in database
    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntentId,
    });
    if (!payment) {
      return sendErrorResponse(res, 404, "Payment record not found");
    }

    if (paymentIntent.status === "succeeded") {
      payment.status = "succeeded";
      await payment.save();

      // Update user role from traveller to owner
      const user = await User.findById(userId);
      if (user && user.userRole === UserRole.TRAVELLER) {
        user.userRole = UserRole.OWNER;
        await user.save();
      }

      // Get plan details for success URL
      const plan = await Plan.findById(
        payment.planId?.toString() || payment.planId
      );

      return sendSuccessResponse(
        res,
        200,
        "Payment confirmed and user role updated successfully",
        {
          paymentId: payment._id,
          status: "succeeded",
          userRole: UserRole.OWNER,
          successUrl: plan?.successUrl || null,
          planName: plan?.planName || null,
        }
      );
    } else if (paymentIntent.status === "canceled") {
      payment.status = "canceled";
      await payment.save();

      return sendErrorResponse(res, 400, "Payment was canceled");
    } else {
      // Payment is still processing or requires action
      return sendErrorResponse(res, 400, "Payment is still processing");
    }
  } catch (error) {
    console.error("Error confirming payment:", error);
    return sendErrorResponse(res, 500, "Failed to confirm payment");
  }
};

export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    // Validate userId
    if (!userId) {
      return sendErrorResponse(
        res,
        401,
        "Authentication required: User ID not found."
      );
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const payments = await Payment.find({ userId })
      .populate(
        "planId",
        "planName price currency features allowedHost trialDays"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Payment.countDocuments({ userId });

    return sendSuccessResponse(
      res,
      200,
      "Payment history retrieved successfully",
      {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      }
    );
  } catch (error) {
    console.error("Error getting payment history:", error);
    return sendErrorResponse(res, 500, "Failed to get payment history");
  }
};

export const getPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.params;
    const userId = (req as any).user?.userId;

    // Validate userId
    if (!userId) {
      return sendErrorResponse(
        res,
        401,
        "Authentication required: User ID not found."
      );
    }

    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntentId,
      userId,
    }).populate(
      "planId",
      "planName price currency features allowedHost trialDays"
    );

    if (!payment) {
      return sendErrorResponse(res, 404, "Payment not found");
    }

    return sendSuccessResponse(
      res,
      200,
      "Payment status retrieved successfully",
      payment
    );
  } catch (error) {
    console.error("Error getting payment status:", error);
    return sendErrorResponse(res, 500, "Failed to get payment status");
  }
};

export const cancelPayment = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Find payment by session ID
    const payment = await Payment.findOne({
      $or: [
        { stripePaymentIntentId: sessionId },
        { stripeSessionId: sessionId },
      ],
    });

    if (payment) {
      payment.status = "canceled";
      await payment.save();
    }

    return sendSuccessResponse(res, 200, "Payment cancelled successfully", {
      message: "Payment was cancelled",
      redirectUrl: `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/plans`,
    });
  } catch (error) {
    console.error("Error cancelling payment:", error);
    return sendErrorResponse(res, 500, "Failed to cancel payment");
  }
};

export const checkStripePaymentStatus = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    console.log("Checking Stripe payment status for session:", sessionId);

    // Get the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(
      sessionId as string
    );

    console.log("Stripe session status:", {
      id: session.id,
      paymentStatus: session.payment_status,
      status: session.status,
      amountTotal: session.amount_total,
      currency: session.currency,
    });

    // Find payment in database
    const payment = await Payment.findOne({
      $or: [
        { stripePaymentIntentId: sessionId },
        { stripeSessionId: sessionId },
      ],
    });

    if (!payment) {
      return sendErrorResponse(res, 404, "Payment not found in database");
    }

    return sendSuccessResponse(res, 200, "Payment status checked", {
      stripeSession: {
        id: session.id,
        paymentStatus: session.payment_status,
        status: session.status,
        amountTotal: session.amount_total,
        currency: session.currency,
      },
      databasePayment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
      },
    });
  } catch (error) {
    console.error("Error checking Stripe payment status:", error);
    return sendErrorResponse(res, 500, "Failed to check payment status");
  }
};

export const manuallyUpdatePaymentStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;

    // Find payment in database
    const payment = await Payment.findOne({
      $or: [
        { stripePaymentIntentId: sessionId },
        { stripeSessionId: sessionId },
      ],
    });

    if (!payment) {
      return sendErrorResponse(res, 404, "Payment not found");
    }

    // Update payment status
    payment.status = status;
    await payment.save();

    // If status is succeeded, update user role
    if (status === "succeeded") {
      const user = await User.findById(payment.userId);
      if (user && user.userRole === UserRole.TRAVELLER) {
        user.userRole = UserRole.OWNER;
        await user.save();
      }
    }

    return sendSuccessResponse(res, 200, "Payment status updated manually", {
      paymentId: payment._id,
      newStatus: payment.status,
      userId: payment.userId,
    });
  } catch (error) {
    console.error("Error manually updating payment status:", error);
    return sendErrorResponse(res, 500, "Failed to update payment status");
  }
};

export const pollPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Find payment in database
    const payment = await Payment.findOne({
      $or: [
        { stripePaymentIntentId: sessionId },
        { stripeSessionId: sessionId },
      ],
    });

    if (!payment) {
      return sendErrorResponse(res, 404, "Payment not found");
    }

    // If we have a payment intent ID, check with Stripe
    if (payment.stripePaymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          payment.stripePaymentIntentId
        );

        if (
          paymentIntent.status === "succeeded" &&
          payment.status !== "succeeded"
        ) {
          // Update payment status
          payment.status = "succeeded";
          await payment.save();

          // Update user role
          const user = await User.findById(payment.userId);
          if (user && user.userRole === UserRole.TRAVELLER) {
            user.userRole = UserRole.OWNER;
            await user.save();
          }

          return sendSuccessResponse(
            res,
            200,
            "Payment status updated to succeeded",
            {
              paymentId: payment._id,
              newStatus: "succeeded",
              stripeStatus: paymentIntent.status,
              userRoleUpdated: true,
            }
          );
        }

        return sendSuccessResponse(res, 200, "Payment status checked", {
          paymentId: payment._id,
          databaseStatus: payment.status,
          stripeStatus: paymentIntent.status,
          isSucceeded: paymentIntent.status === "succeeded",
        });
      } catch (stripeError) {
        console.error(
          "Error retrieving payment intent from Stripe:",
          stripeError
        );
        return sendErrorResponse(
          res,
          500,
          "Failed to check Stripe payment status"
        );
      }
    }

    // If we only have session ID, retrieve the session from Stripe
    if (payment.stripeSessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(
          payment.stripeSessionId
        );

        if (
          session.payment_status === "paid" &&
          payment.status !== "succeeded"
        ) {
          // Verify payment intent if available
          if (session.payment_intent) {
            const paymentIntent = await stripe.paymentIntents.retrieve(
              session.payment_intent as string
            );

            if (paymentIntent.status === "succeeded") {
              // Update payment status
              payment.status = "succeeded";
              payment.stripePaymentIntentId = session.payment_intent as string;
              await payment.save();

              // Update user role
              const user = await User.findById(payment.userId);
              if (user && user.userRole === UserRole.TRAVELLER) {
                user.userRole = UserRole.OWNER;
                await user.save();
              }

              return sendSuccessResponse(
                res,
                200,
                "Payment status updated to succeeded",
                {
                  paymentId: payment._id,
                  newStatus: "succeeded",
                  stripeStatus: paymentIntent.status,
                  userRoleUpdated: true,
                }
              );
            }
          }
        }

        return sendSuccessResponse(res, 200, "Payment status checked", {
          paymentId: payment._id,
          databaseStatus: payment.status,
          stripeSessionStatus: session.payment_status,
          isPaid: session.payment_status === "paid",
        });
      } catch (stripeError) {
        console.error("Error retrieving session from Stripe:", stripeError);
        return sendErrorResponse(
          res,
          500,
          "Failed to check Stripe session status"
        );
      }
    }

    return sendSuccessResponse(res, 200, "Payment status checked", {
      paymentId: payment._id,
      databaseStatus: payment.status,
      noStripeIds: true,
    });
  } catch (error) {
    console.error("Error polling payment status:", error);
    return sendErrorResponse(res, 500, "Failed to poll payment status");
  }
};
