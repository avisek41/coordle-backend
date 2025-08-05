import mongoose, { Document, Schema } from "mongoose";

// Define the PasswordReset interface
export interface IPasswordReset extends Document {
  email: string;
  token: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

// Create the PasswordReset schema
const passwordResetSchema = new Schema<IPasswordReset>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    token: {
      type: String,
      required: [true, "Reset token is required"],
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration date is required"],
      default: function() {
        // Token expires in 1 hour
        return new Date(Date.now() + 60 * 60 * 1000);
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
passwordResetSchema.index({ email: 1 });
passwordResetSchema.index({ token: 1 });
passwordResetSchema.index({ expiresAt: 1 });
passwordResetSchema.index({ isUsed: 1 });

// Create and export the PasswordReset model
const PasswordReset = mongoose.model<IPasswordReset>("PasswordReset", passwordResetSchema);

export default PasswordReset; 