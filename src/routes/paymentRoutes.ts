import express from "express";
import {
  createCheckoutSession,
  confirmPayment,
  getPaymentHistory,
  getPaymentStatus,
  cancelPayment,
  checkStripePaymentStatus,
  manuallyUpdatePaymentStatus,
  pollPaymentStatus,
} from "../controllers/paymentController";
import {
  getPaymentSuccess,
  redirectToSuccessUrl,
} from "../controllers/successController";
import { handleStripeWebhook } from "../controllers/webhookController";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

// Webhook route (no authentication required)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

// Success page routes (no authentication required - called by Stripe)
router.get("/success/:sessionId", getPaymentSuccess);
router.get("/redirect/:sessionId", redirectToSuccessUrl);
router.get("/cancel/:sessionId", cancelPayment);

// All other payment routes require authentication
router.use(authenticateToken);

// Create checkout session
router.post("/create-checkout-session", createCheckoutSession);

// Confirm payment and update user role
router.post("/confirm-payment", confirmPayment);

// Get payment history for user
router.get("/history", getPaymentHistory);

// Get specific payment status
router.get("/status/:paymentIntentId", getPaymentStatus);

// Check Stripe payment status (no auth required)
router.get("/check-stripe-status/:sessionId", checkStripePaymentStatus);

// Manually update payment status (for testing)
router.patch("/update-status/:sessionId", manuallyUpdatePaymentStatus);

// Poll payment status from Stripe (fallback when webhooks fail)
router.get("/poll-status/:sessionId", pollPaymentStatus);

export default router;
