import mongoose, { Document, Schema } from "mongoose";

// Define the EmailVerificationLink interface
export interface IEmailVerificationLink extends Document {
  email: string;
  token: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

// Create the EmailVerificationLink schema
const emailVerificationLinkSchema = new Schema<IEmailVerificationLink>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    token: {
      type: String,
      required: [true, "Verification token is required"],
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration date is required"],
      default: function () {
        // Token expires in 24 hours
        return new Date(Date.now() + 24 * 60 * 60 * 1000);
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
emailVerificationLinkSchema.index({ email: 1 });
emailVerificationLinkSchema.index({ token: 1 });
emailVerificationLinkSchema.index({ expiresAt: 1 });
emailVerificationLinkSchema.index({ isUsed: 1 });

// TTL index to automatically delete expired verification links
emailVerificationLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Create and export the EmailVerificationLink model
const EmailVerificationLink = mongoose.model<IEmailVerificationLink>(
  "EmailVerificationLink",
  emailVerificationLinkSchema
);

export default EmailVerificationLink;
