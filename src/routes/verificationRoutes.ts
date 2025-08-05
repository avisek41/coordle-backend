import { Router } from "express";
import {
  sendVerificationCode,
  verifyPhoneNumber,
  resendVerificationCode,
  registerUserAfterVerification,
} from "../controllers/verificationController";

const router = Router();

// Phone verification routes
router.post("/send-code", sendVerificationCode);
router.post("/verify", verifyPhoneNumber);
router.post("/resend-code", resendVerificationCode);
router.post("/register", registerUserAfterVerification);

export default router;
