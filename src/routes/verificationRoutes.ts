import { Router } from "express";
import {
  sendVerificationCode,
  verifyPhoneNumber,
  resendVerificationCode,
  registerUserAfterVerification,
  sendEmailVerificationLink,
  verifyEmailAddress,
  resendEmailVerificationLink,
} from "../controllers/verificationController";

const router = Router();

// Phone verification routes
router.post("/send-code", sendVerificationCode);
router.post("/verify", verifyPhoneNumber);
router.post("/resend-code", resendVerificationCode);
router.post("/register", registerUserAfterVerification);

// Email verification routes
router.post("/send-email-link", sendEmailVerificationLink);
router.post("/verify-email", verifyEmailAddress);
router.post("/resend-email-link", resendEmailVerificationLink);

export default router;
