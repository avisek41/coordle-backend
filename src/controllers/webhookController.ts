import { Request, Response } from "express";
import stripe from "../config/stripe";
import Payment from "../models/Payment";
import User, { UserRole } from "../models/User";

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret =
    process.env.STRIPE_WEBHOOK_SECRET ||
    "whsec_e79f2866385b879f14ea63e9cd832879f32a1d1afd3b189938544f4bb7e90663";

  if (!endpointSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      endpointSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return res.status(400).json({ error: "Invalid signature" });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case "payment_intent.succeeded":
        await handlePaymentSuccess(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailure(event.data.object);
        break;

      case "payment_intent.canceled":
        await handlePaymentCancel(event.data.object);
        break;

      default:
      // Unhandled event type
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
};

const handleCheckoutSessionCompleted = async (session: any) => {
  const payment = await Payment.findOne({ stripeSessionId: session.id });
  if (!payment) {
    return;
  }

  // Always save PaymentIntent ID
  if (session.payment_intent) {
    payment.stripePaymentIntentId = session.payment_intent;
    await payment.save();
  }

  // Check PaymentIntent status from Stripe
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      session.payment_intent as string
    );
    if (paymentIntent.status === "succeeded") {
      payment.status = "succeeded";
      await payment.save();

      // Upgrade role and set planId
      const user = await User.findById(payment.userId);
      if (user?.userRole === UserRole.TRAVELLER) {
        user.userRole = UserRole.OWNER;
        user.planId = payment.planId;
        await user.save();
      }
    }
  } catch (err) {
    console.error("Error retrieving payment intent:", err);
  }
};

const handlePaymentSuccess = async (paymentIntent: any) => {
  try {
    const { userId, planId } = paymentIntent.metadata;

    // Update payment status in database
    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntent.id,
    });

    if (payment) {
      payment.status = "succeeded";
      await payment.save();

      // Update user role from traveller to owner and set planId
      const user = await User.findById(userId);
      if (user && user.userRole === UserRole.TRAVELLER) {
        user.userRole = UserRole.OWNER;
        // Get planId from payment record
        if (payment.planId) {
          user.planId = payment.planId;
        }
        await user.save();
      }
    }
  } catch (error) {
    console.error("Error handling payment success:", error);
  }
};

const handlePaymentFailure = async (paymentIntent: any) => {
  try {
    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntent.id,
    });

    if (payment) {
      payment.status = "failed";
      await payment.save();
    }
  } catch (error) {
    console.error("Error handling payment failure:", error);
  }
};

const handlePaymentCancel = async (paymentIntent: any) => {
  try {
    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntent.id,
    });

    if (payment) {
      payment.status = "canceled";
      await payment.save();
    }
  } catch (error) {
    console.error("Error handling payment cancel:", error);
  }
};
