import mongoose, { Document, Schema } from "mongoose";

// Define the EmailVerification interface
export interface IEmailVerification extends Document {
  email: string;
  code: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

// Create the EmailVerification schema
const emailVerificationSchema = new Schema<IEmailVerification>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    code: {
      type: String,
      required: [true, "Verification code is required"],
      length: [6, "Verification code must be 6 digits"],
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration time is required"],
      default: function () {
        return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      },
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
emailVerificationSchema.index({ email: 1 });
emailVerificationSchema.index({ expiresAt: 1 });
emailVerificationSchema.index({ code: 1 });

// TTL index to automatically delete expired verifications
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Create and export the EmailVerification model
const EmailVerification = mongoose.model<IEmailVerification>(
  "EmailVerification",
  emailVerificationSchema
);

export default EmailVerification;
