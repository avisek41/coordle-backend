import mongoose, { Document, Schema } from "mongoose";

// Define the PhoneVerification interface
export interface IPhoneVerification extends Document {
  phoneNumber: string;
  code: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

// Create the PhoneVerification schema
const phoneVerificationSchema = new Schema<IPhoneVerification>(
  {
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
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
phoneVerificationSchema.index({ phoneNumber: 1 });
phoneVerificationSchema.index({ expiresAt: 1 });
phoneVerificationSchema.index({ code: 1 });

// TTL index to automatically delete expired verifications
phoneVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Create and export the PhoneVerification model
const PhoneVerification = mongoose.model<IPhoneVerification>(
  "PhoneVerification",
  phoneVerificationSchema
);

export default PhoneVerification;
